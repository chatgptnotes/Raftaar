/**
 * Intelligent Driver Reassignment Service
 * Combines transcript analysis, auto-reassignment, and WhatsApp notifications
 */

import { supabase } from '../lib/supabaseClient';
import { waitForCallCompletion, analyzeDriverResponse } from './bolnaTranscriptService';
import { callNextDriverInQueue, updateQueueEntry, assignDriverToBooking } from './driverAssignment';
import { sendLocationToDriver } from './doubletickService';

/**
 * Process driver call and handle response intelligently
 * @param {string} queueEntryId - Driver queue entry ID
 * @param {string} executionId - Bolna execution ID
 * @param {string} bookingId - Booking ID
 * @param {object} bookingData - Booking details
 * @returns {Promise<object>} Processing result
 */
export const processDriverCallResponse = async (queueEntryId, executionId, bookingId, bookingData) => {
  try {
    console.log('🤖 [Intelligent Reassignment] Processing driver call response...');
    console.log(`   Queue Entry: ${queueEntryId}`);
    console.log(`   Execution ID: ${executionId}`);
    console.log(`   Booking: ${bookingData.booking_id}`);

    // Wait for call to complete and get transcript (max 300 seconds, poll every 5s)
    // NOTE: Webhook should handle this instantly, but timeout is backup in case webhook fails
    console.log('⏳ [Intelligent Reassignment] Waiting for call completion...');
    console.log('🔔 [Intelligent Reassignment] Webhook should notify us instantly!');
    console.log('⏱️ [Intelligent Reassignment] 300s timeout is just a backup');
    const callResult = await waitForCallCompletion(executionId, 300, 5);

    if (!callResult.success) {
      console.error('❌ [Intelligent Reassignment] Failed to get call result');
      console.error('   Error:', callResult.error);
      console.error('   Execution ID:', callResult.executionId);

      // CRITICAL CHECK: Before marking as timeout, verify booking still needs driver
      console.log('🔍 [Intelligent Reassignment] TIMEOUT CHECK: Verifying booking still needs driver...');
      const { data: bookingCheck, error: bookingError } = await supabase
        .from('bookings')
        .select('driver_id, status')
        .eq('id', bookingId)
        .single();

      if (!bookingError && bookingCheck && bookingCheck.driver_id) {
        console.log('🛑 [Intelligent Reassignment] STOP! Driver already assigned during timeout wait');
        console.log('   This means driver accepted but transcript took longer than timeout');
        console.log('   Driver ID:', bookingCheck.driver_id);
        console.log('   Booking status:', bookingCheck.status);

        // Mark this queue entry as timed_out but don't call next driver
        await updateQueueEntry(queueEntryId, {
          status: 'cancelled',
          response: 'timeout_but_booking_assigned',
          response_analysis: JSON.stringify({
            response: 'TIMEOUT',
            confidence: 'low',
            reason: 'Timeout but booking was already assigned, likely driver accepted but transcript delayed'
          }),
          responded_at: new Date().toISOString()
        });

        return {
          success: true,
          action: 'already_assigned_during_timeout',
          message: 'Timeout occurred but driver was already assigned to booking'
        };
      }

      // Use analysis from timeout if available, otherwise default
      const analysis = callResult.analysis || {
        response: 'NO_RESPONSE',
        confidence: 'low',
        reason: 'Call timeout - driver did not answer within time limit'
      };

      // Mark as no answer (unavailable) and try next driver
      console.log('📝 [Intelligent Reassignment] Marking queue entry as no_answer...');
      const updateResult = await updateQueueEntry(queueEntryId, {
        status: 'no_answer',
        response: 'timeout',
        response_analysis: JSON.stringify(analysis),
        responded_at: new Date().toISOString()
      });

      if (!updateResult) {
        console.warn('⚠️ [Intelligent Reassignment] Failed to update queue entry, but continuing...');
      }

      console.log('🔄 [Intelligent Reassignment] Calling next driver due to timeout...');
      return await tryNextDriver(bookingId, bookingData, 'timeout');
    }

    // Analyze the transcript
    const analysis = callResult.analysis;
    console.log('📊 [Intelligent Reassignment] Call Analysis:');
    console.log(`   Response: ${analysis.response}`);
    console.log(`   Confidence: ${analysis.confidence}`);
    console.log(`   Reason: ${analysis.reason}`);

    // Get queue entry with driver details
    const { data: queueEntry, error } = await supabase
      .from('driver_assignment_queue')
      .select(`
        *,
        drivers:driver_id (
          id,
          first_name,
          last_name,
          phone,
          vehicle_model,
          vehicle_number
        )
      `)
      .eq('id', queueEntryId)
      .single();

    if (error || !queueEntry) {
      console.error('❌ [Intelligent Reassignment] Queue entry not found');
      return { success: false, error: 'Queue entry not found' };
    }

    // Handle based on analysis result
    if (analysis.response === 'ACCEPTED') {
      // Driver ACCEPTED
      console.log('✅ [Intelligent Reassignment] Driver ACCEPTED the booking!');

      return await handleDriverAcceptance(queueEntry, bookingId, bookingData);
    }
    else if (analysis.response === 'DECLINED') {
      // Driver DECLINED
      console.log('❌ [Intelligent Reassignment] Driver DECLINED the booking');

      console.log('📝 [Intelligent Reassignment] Marking queue entry as rejected...');
      const updateResult = await updateQueueEntry(queueEntryId, {
        status: 'rejected',
        response: 'declined',
        response_analysis: JSON.stringify(analysis),
        responded_at: new Date().toISOString()
      });

      if (!updateResult) {
        console.warn('⚠️ [Intelligent Reassignment] Failed to update queue entry, but continuing...');
      }

      return await tryNextDriver(bookingId, bookingData, 'declined');
    }
    else {
      // Unclear or no response
      console.log('⚠️ [Intelligent Reassignment] Unclear response from driver');

      console.log('📝 [Intelligent Reassignment] Marking queue entry as unclear...');
      const updateResult = await updateQueueEntry(queueEntryId, {
        status: 'unclear',
        response: analysis.response.toLowerCase(),
        response_analysis: JSON.stringify(analysis),
        responded_at: new Date().toISOString()
      });

      if (!updateResult) {
        console.warn('⚠️ [Intelligent Reassignment] Failed to update queue entry, but continuing...');
      }

      // For unclear responses, try next driver after short delay
      return await tryNextDriver(bookingId, bookingData, 'unclear');
    }

  } catch (error) {
    console.error('❌ [Intelligent Reassignment] Error processing call response:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Handle driver acceptance - assign booking and send WhatsApp
 * @param {object} queueEntry - Queue entry with driver details
 * @param {string} bookingId - Booking ID
 * @param {object} bookingData - Booking details
 * @returns {Promise<object>} Result
 */
const handleDriverAcceptance = async (queueEntry, bookingId, bookingData) => {
  try {
    console.log('✅ [Driver Acceptance] Processing driver acceptance...');
    console.log('🚨 [Driver Acceptance] IMMEDIATE UPDATES STARTING!');

    const driver = queueEntry.drivers;
    const distance = parseFloat(queueEntry.distance.replace(' km', ''));

    // STEP 1: IMMEDIATELY UPDATE CURRENT ENTRY AS ACCEPTED (FIRST PRIORITY)
    // This shows immediate UI feedback
    const analysis = {
      response: 'ACCEPTED',
      confidence: 'high',
      reason: 'Driver confirmed acceptance'
    };

    console.log('⚡ [Driver Acceptance] Marking current driver as ACCEPTED (immediate)...');
    const acceptUpdateResult = await updateQueueEntry(queueEntry.id, {
      status: 'accepted',
      response: 'accepted',
      response_analysis: JSON.stringify(analysis),
      responded_at: new Date().toISOString()
    });

    if (!acceptUpdateResult) {
      console.error('❌ [Driver Acceptance] Failed to update queue entry as accepted');
      console.error('   This may cause UI inconsistencies but assignment will proceed');
    } else {
      console.log('✅ [Driver Acceptance] Current queue entry marked as ACCEPTED');
    }

    // STEP 2: IMMEDIATELY ASSIGN DRIVER TO BOOKING (SECOND PRIORITY)
    console.log('⚡ [Driver Acceptance] Assigning driver to booking (immediate)...');
    await assignDriverToBooking(bookingId, queueEntry.driver_id, distance);
    console.log(`✅ [Driver Acceptance] Assigned ${driver.first_name} ${driver.last_name} to booking`);

    // STEP 3: FREEZE ALL OTHER QUEUE ENTRIES (PARALLEL OPERATION)
    console.log('🔒 [Driver Acceptance] Cancelling ALL other queue entries...');
    const { error: cancelError } = await supabase
      .from('driver_assignment_queue')
      .update({
        status: 'cancelled',
        response: 'cancelled_due_to_acceptance',
        responded_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .neq('id', queueEntry.id);  // Cancel all EXCEPT current driver

    if (cancelError) {
      console.error('❌ [Driver Acceptance] Error cancelling queue:', cancelError);
    } else {
      console.log('✅ [Driver Acceptance] All other queue entries cancelled');
    }

    // STEP 4: Log all cancelled entries for verification
    const { data: allQueueEntries } = await supabase
      .from('driver_assignment_queue')
      .select('id, position, status, drivers:driver_id(first_name, last_name)')
      .eq('booking_id', bookingId)
      .order('position');

    if (allQueueEntries && allQueueEntries.length > 0) {
      console.log('📋 [Driver Acceptance] Queue Status After Acceptance:');
      allQueueEntries.forEach(entry => {
        console.log(`   Position #${entry.position}: ${entry.drivers?.first_name || 'Unknown'} - Status: ${entry.status}`);
      });
    }

    // Send WhatsApp location to driver
    console.log('📱 [Driver Acceptance] Sending WhatsApp location to driver...');
    const whatsappResult = await sendLocationToDriver(driver.phone, bookingData);

    if (whatsappResult.success) {
      console.log('✅ [Driver Acceptance] WhatsApp location sent successfully!');

      // Update booking with WhatsApp status
      await supabase
        .from('bookings')
        .update({
          whatsapp_sent: true,
          whatsapp_sent_at: new Date().toISOString()
        })
        .eq('id', bookingId);
    } else {
      console.error('❌ [Driver Acceptance] Failed to send WhatsApp:', whatsappResult.error);
    }

    return {
      success: true,
      action: 'driver_accepted',
      driver: driver,
      whatsappSent: whatsappResult.success,
      message: `Driver ${driver.first_name} ${driver.last_name} accepted. ${whatsappResult.success ? 'WhatsApp location sent.' : 'WhatsApp failed to send.'}`
    };

  } catch (error) {
    console.error('❌ [Driver Acceptance] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Try next driver in queue
 * @param {string} bookingId - Booking ID
 * @param {object} bookingData - Booking details
 * @param {string} reason - Reason for trying next (declined/timeout/unclear)
 * @returns {Promise<object>} Result
 */
const tryNextDriver = async (bookingId, bookingData, reason) => {
  try {
    console.log(`🔄 [Try Next Driver] Reason: ${reason}`);

    // CRITICAL CHECK #1: Check if booking already has a driver assigned
    console.log('🔍 [Try Next Driver] Checking if driver already assigned...');
    const { data: currentBooking, error: bookingError } = await supabase
      .from('bookings')
      .select('driver_id, status')
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('❌ [Try Next Driver] Error fetching booking:', bookingError);
    } else if (currentBooking.driver_id) {
      console.log('🛑 [Try Next Driver] STOP! Driver already assigned to booking');
      console.log('   Driver ID:', currentBooking.driver_id);
      console.log('   Booking status:', currentBooking.status);
      return {
        success: true,
        action: 'already_assigned',
        message: 'Driver already assigned, skipping next driver call'
      };
    }

    // CRITICAL CHECK #2: Check if any driver in queue already accepted
    console.log('🔍 [Try Next Driver] Checking queue for accepted drivers...');
    const { data: acceptedDrivers, error: queueError } = await supabase
      .from('driver_assignment_queue')
      .select('id, status, driver_id')
      .eq('booking_id', bookingId)
      .eq('status', 'accepted');

    if (!queueError && acceptedDrivers && acceptedDrivers.length > 0) {
      console.log('🛑 [Try Next Driver] STOP! Driver already accepted in queue');
      console.log('   Accepted driver queue entry:', acceptedDrivers[0].id);
      console.log('   Driver ID:', acceptedDrivers[0].driver_id);
      return {
        success: true,
        action: 'already_accepted_in_queue',
        message: 'Driver already accepted in queue, skipping next driver call'
      };
    }

    // CRITICAL CHECK #3: Add small delay to allow DB propagation
    console.log('⏳ [Try Next Driver] Waiting 2s for DB propagation...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Re-check booking assignment after delay
    const { data: recheckBooking } = await supabase
      .from('bookings')
      .select('driver_id')
      .eq('id', bookingId)
      .single();

    if (recheckBooking && recheckBooking.driver_id) {
      console.log('🛑 [Try Next Driver] STOP! Driver assigned during wait period');
      return {
        success: true,
        action: 'assigned_during_wait',
        message: 'Driver assigned during wait period'
      };
    }

    console.log('✅ [Try Next Driver] All checks passed, calling next driver in queue...');

    // Call next driver
    const nextCallResult = await callNextDriverInQueue(bookingId, bookingData);

    if (nextCallResult.success) {
      console.log('✅ [Try Next Driver] Next driver called successfully');

      // Start processing this new call AFTER verification
      setTimeout(async () => {
        // FINAL CHECK: Verify booking still needs a driver before processing
        console.log('🔍 [Try Next Driver] Pre-process check: Verifying booking still needs driver...');

        const { data: finalCheck } = await supabase
          .from('bookings')
          .select('driver_id, status')
          .eq('id', bookingId)
          .single();

        if (finalCheck && finalCheck.driver_id) {
          console.log('🛑 [Try Next Driver] ABORT! Driver already assigned, skipping transcript processing');
          console.log('   Driver ID:', finalCheck.driver_id);
          console.log('   Booking status:', finalCheck.status);

          // Cancel this queue entry
          await updateQueueEntry(nextCallResult.queueEntry.id, {
            status: 'cancelled',
            response: 'cancelled_driver_already_assigned'
          });

          return;
        }

        console.log('✅ [Try Next Driver] Pre-process check passed, starting transcript processing...');
        processDriverCallResponse(
          nextCallResult.queueEntry.id,
          nextCallResult.callResult.data.execution_id,
          bookingId,
          bookingData
        );
      }, 5000); // Wait 5 seconds before starting to process

      return {
        success: true,
        action: 'called_next_driver',
        nextDriver: nextCallResult.driver,
        message: `Previous driver ${reason}. Calling next driver: ${nextCallResult.driver.first_name} ${nextCallResult.driver.last_name}`
      };
    } else {
      console.error('❌ [Try Next Driver] No more drivers available');

      // Update booking status
      await supabase
        .from('bookings')
        .update({
          status: 'no_drivers_available',
          remarks: `${bookingData.remarks || ''}\n[${new Date().toISOString()}] All drivers in queue declined or unavailable`
        })
        .eq('id', bookingId);

      return {
        success: false,
        action: 'no_more_drivers',
        message: 'All drivers in queue have been tried'
      };
    }

  } catch (error) {
    console.error('❌ [Try Next Driver] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Start intelligent processing for a booking
 * Called after first driver is called
 * @param {string} queueEntryId - Queue entry ID
 * @param {string} executionId - Bolna execution ID
 * @param {string} bookingId - Booking ID
 * @param {object} bookingData - Booking details
 */
export const startIntelligentProcessing = (queueEntryId, executionId, bookingId, bookingData) => {
  console.log('🚀 [Intelligent Processing] Starting in background...');
  console.log(`   Will wait for call to complete and analyze transcript`);

  // Run in background (non-blocking)
  processDriverCallResponse(queueEntryId, executionId, bookingId, bookingData)
    .then(result => {
      console.log('✅ [Intelligent Processing] Completed:', result);
    })
    .catch(error => {
      console.error('❌ [Intelligent Processing] Error:', error);
    });

  return {
    success: true,
    message: 'Intelligent processing started in background'
  };
};

export default {
  processDriverCallResponse,
  startIntelligentProcessing,
  handleDriverAcceptance,
  tryNextDriver
};
