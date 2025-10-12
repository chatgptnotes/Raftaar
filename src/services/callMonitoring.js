/**
 * Call Monitoring Service (Polling-Based)
 * Simpler alternative to webhook - polls call status and triggers fallback
 */

import { supabase } from '../lib/supabaseClient';
import { makeDriverCall } from './bolnaService';
import { updateQueueEntry, assignDriverToBooking } from './driverAssignment';

// Store active monitors
const activeMonitors = new Map();

/**
 * Poll Bolna API to check call status
 * Note: This is a fallback solution since Bolna API might not have status endpoint
 * We'll use time-based fallback instead
 */
const CALL_TIMEOUT_SECONDS = 60; // Wait 60 seconds before trying next driver

/**
 * Monitor a driver call and auto-fallback if needed
 * @param {string} queueId - Queue entry ID
 * @param {string} callId - Bolna execution_id
 * @param {string} bookingId - Booking ID
 * @param {Object} bookingData - Booking details
 * @returns {Promise<void>}
 */
export const monitorDriverCall = async (queueId, callId, bookingId, bookingData) => {
  try {
    console.log(`⏰ [Call Monitor] Started monitoring call: ${callId}`);
    console.log(`⏰ [Call Monitor] Will auto-fallback after ${CALL_TIMEOUT_SECONDS} seconds if no response`);

    // Store monitor
    const monitorKey = `${bookingId}-${queueId}`;

    // Wait for timeout period
    const timeoutPromise = new Promise((resolve) => {
      const timeoutId = setTimeout(async () => {
        console.log(`⏰ [Call Monitor] Timeout reached for call: ${callId}`);

        // Check if this call was already handled (driver accepted)
        const { data: queueEntry } = await supabase
          .from('driver_assignment_queue')
          .select('status')
          .eq('id', queueId)
          .single();

        if (queueEntry && queueEntry.status === 'accepted') {
          console.log('✅ [Call Monitor] Call already accepted, stopping monitor');
          activeMonitors.delete(monitorKey);
          resolve({ handled: true });
          return;
        }

        // If not accepted, trigger fallback
        console.log('⚠️ [Call Monitor] No response received, triggering fallback...');

        try {
          // Update current queue entry as no_answer
          await updateQueueEntry(queueId, {
            status: 'no_answer',
            response: 'timeout',
            responded_at: new Date().toISOString()
          });

          // Get next driver in queue
          const { data: nextDrivers } = await supabase
            .from('driver_assignment_queue')
            .select(`
              *,
              drivers:driver_id (
                id,
                first_name,
                last_name,
                phone
              )
            `)
            .eq('booking_id', bookingId)
            .eq('status', 'pending')
            .order('position', { ascending: true })
            .limit(1);

          if (!nextDrivers || nextDrivers.length === 0) {
            console.error('❌ [Call Monitor] No more drivers in queue');

            // Update booking as failed
            await supabase
              .from('bookings')
              .update({
                status: 'no_drivers_available',
                remarks: `${bookingData.remarks || ''}\n[Auto-assign timeout: All drivers unavailable at ${new Date().toISOString()}]`
              })
              .eq('id', bookingId);

            activeMonitors.delete(monitorKey);
            resolve({ handled: true, allFailed: true });
            return;
          }

          // Call next driver
          const nextDriver = nextDrivers[0];
          console.log(`📞 [Call Monitor] Calling next driver: ${nextDriver.drivers.first_name} ${nextDriver.drivers.last_name}`);

          // Update next driver status
          await updateQueueEntry(nextDriver.id, {
            status: 'calling',
            called_at: new Date().toISOString()
          });

          // Make call
          const callResult = await makeDriverCall(
            nextDriver.drivers.phone,
            nextDriver.drivers,
            {
              booking_id: bookingData.booking_id,
              address: bookingData.address,
              city: bookingData.city,
              nearest_hospital: bookingData.nearest_hospital,
              distance: nextDriver.distance,
              phone_number: bookingData.phone_number
            }
          );

          if (callResult.success) {
            // Store call ID
            await updateQueueEntry(nextDriver.id, {
              call_id: callResult.data.execution_id
            });

            console.log('✅ [Call Monitor] Next driver called, starting new monitor');

            // Start monitoring next driver's call
            monitorDriverCall(
              nextDriver.id,
              callResult.data.execution_id,
              bookingId,
              bookingData
            );
          } else {
            console.error('❌ [Call Monitor] Failed to call next driver');
            await updateQueueEntry(nextDriver.id, { status: 'failed' });
          }

        } catch (error) {
          console.error('❌ [Call Monitor] Error in fallback:', error);
        }

        activeMonitors.delete(monitorKey);
        resolve({ handled: true });
      }, CALL_TIMEOUT_SECONDS * 1000);

      activeMonitors.set(monitorKey, {
        timeoutId,
        queueId,
        callId,
        bookingId,
        startedAt: new Date()
      });
    });

    await timeoutPromise;

  } catch (error) {
    console.error('❌ [Call Monitor] Error:', error);
  }
};

/**
 * Manually mark driver as accepted (called from UI when driver accepts)
 * @param {string} queueId - Queue entry ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<boolean>}
 */
export const markDriverAccepted = async (queueId, bookingId) => {
  try {
    console.log(`✅ [Call Monitor] Manually marking driver as accepted`);

    // Stop monitoring
    const monitorKey = `${bookingId}-${queueId}`;
    const monitor = activeMonitors.get(monitorKey);

    if (monitor) {
      clearTimeout(monitor.timeoutId);
      activeMonitors.delete(monitorKey);
      console.log('⏰ [Call Monitor] Stopped timeout for accepted driver');
    }

    // Update queue entry
    await updateQueueEntry(queueId, {
      status: 'accepted',
      response: 'yes',
      responded_at: new Date().toISOString()
    });

    // Get driver details
    const { data: queueEntry } = await supabase
      .from('driver_assignment_queue')
      .select('driver_id, distance')
      .eq('id', queueId)
      .single();

    if (queueEntry) {
      // Assign driver to booking
      const distance = parseFloat(queueEntry.distance.replace(' km', ''));
      await assignDriverToBooking(bookingId, queueEntry.driver_id, distance);

      // Cancel other pending drivers
      await supabase
        .from('driver_assignment_queue')
        .update({ status: 'cancelled' })
        .eq('booking_id', bookingId)
        .eq('status', 'pending');

      console.log('✅ [Call Monitor] Driver accepted and booking assigned');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ [Call Monitor] Error marking accepted:', error);
    return false;
  }
};

/**
 * Manually mark driver as rejected (called from UI when driver rejects)
 * This will immediately trigger next driver call without waiting for timeout
 * @param {string} queueId - Queue entry ID
 * @param {string} bookingId - Booking ID
 * @param {Object} bookingData - Booking details
 * @returns {Promise<boolean>}
 */
export const markDriverRejected = async (queueId, bookingId, bookingData) => {
  try {
    console.log(`❌ [Call Monitor] Driver rejected, calling next driver immediately`);

    // Stop monitoring current call
    const monitorKey = `${bookingId}-${queueId}`;
    const monitor = activeMonitors.get(monitorKey);

    if (monitor) {
      clearTimeout(monitor.timeoutId);
      activeMonitors.delete(monitorKey);
    }

    // Update current queue entry
    await updateQueueEntry(queueId, {
      status: 'rejected',
      response: 'no',
      responded_at: new Date().toISOString()
    });

    // Get next driver
    const { data: nextDrivers } = await supabase
      .from('driver_assignment_queue')
      .select(`
        *,
        drivers:driver_id (
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('booking_id', bookingId)
      .eq('status', 'pending')
      .order('position', { ascending: true })
      .limit(1);

    if (!nextDrivers || nextDrivers.length === 0) {
      console.error('❌ [Call Monitor] No more drivers in queue');

      await supabase
        .from('bookings')
        .update({
          status: 'no_drivers_available',
          remarks: `${bookingData.remarks || ''}\n[All drivers rejected at ${new Date().toISOString()}]`
        })
        .eq('id', bookingId);

      return false;
    }

    // Call next driver immediately
    const nextDriver = nextDrivers[0];
    console.log(`📞 [Call Monitor] Calling next driver: ${nextDriver.drivers.first_name}`);

    await updateQueueEntry(nextDriver.id, {
      status: 'calling',
      called_at: new Date().toISOString()
    });

    const callResult = await makeDriverCall(
      nextDriver.drivers.phone,
      nextDriver.drivers,
      {
        booking_id: bookingData.booking_id,
        address: bookingData.address,
        city: bookingData.city,
        nearest_hospital: bookingData.nearest_hospital,
        distance: nextDriver.distance,
        phone_number: bookingData.phone_number
      }
    );

    if (callResult.success) {
      await updateQueueEntry(nextDriver.id, {
        call_id: callResult.data.execution_id
      });

      // Start monitoring next driver
      monitorDriverCall(nextDriver.id, callResult.data.execution_id, bookingId, bookingData);

      console.log('✅ [Call Monitor] Next driver called and monitor started');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ [Call Monitor] Error marking rejected:', error);
    return false;
  }
};

/**
 * Get active monitors count (for debugging)
 */
export const getActiveMonitorsCount = () => {
  return activeMonitors.size;
};

/**
 * Clear all monitors (for cleanup)
 */
export const clearAllMonitors = () => {
  activeMonitors.forEach((monitor) => {
    clearTimeout(monitor.timeoutId);
  });
  activeMonitors.clear();
  console.log('🧹 [Call Monitor] All monitors cleared');
};

export default {
  monitorDriverCall,
  markDriverAccepted,
  markDriverRejected,
  getActiveMonitorsCount,
  clearAllMonitors
};
