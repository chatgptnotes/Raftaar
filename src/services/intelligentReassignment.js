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

    // Wait for call to complete and get transcript (max 120 seconds)
    console.log('⏳ [Intelligent Reassignment] Waiting for call completion...');
    const callResult = await waitForCallCompletion(executionId, 120, 5);

    if (!callResult.success) {
      console.error('❌ [Intelligent Reassignment] Failed to get call result');

      // Mark as no answer and try next driver
      await updateQueueEntry(queueEntryId, {
        status: 'no_answer',
        response: 'timeout',
        responded_at: new Date().toISOString()
      });

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

      await updateQueueEntry(queueEntryId, {
        status: 'rejected',
        response: 'declined',
        response_analysis: JSON.stringify(analysis),
        responded_at: new Date().toISOString()
      });

      return await tryNextDriver(bookingId, bookingData, 'declined');
    }
    else {
      // Unclear or no response
      console.log('⚠️ [Intelligent Reassignment] Unclear response from driver');

      await updateQueueEntry(queueEntryId, {
        status: 'unclear',
        response: analysis.response.toLowerCase(),
        response_analysis: JSON.stringify(analysis),
        responded_at: new Date().toISOString()
      });

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

    const driver = queueEntry.drivers;

    // Update queue entry as accepted
    await updateQueueEntry(queueEntry.id, {
      status: 'accepted',
      response: 'accepted',
      responded_at: new Date().toISOString()
    });

    // Assign driver to booking
    const distance = parseFloat(queueEntry.distance.replace(' km', ''));
    await assignDriverToBooking(bookingId, queueEntry.driver_id, distance);

    console.log(`📝 [Driver Acceptance] Assigned ${driver.first_name} ${driver.last_name} to booking`);

    // Cancel all other pending drivers in queue
    await supabase
      .from('driver_assignment_queue')
      .update({ status: 'cancelled' })
      .eq('booking_id', bookingId)
      .eq('status', 'pending');

    console.log('🚫 [Driver Acceptance] Cancelled other pending drivers');

    // Also cancel any "calling" status drivers (in case they're already being called)
    const { data: callingDrivers } = await supabase
      .from('driver_assignment_queue')
      .select('id, position, drivers:driver_id(first_name, last_name)')
      .eq('booking_id', bookingId)
      .eq('status', 'calling');

    if (callingDrivers && callingDrivers.length > 0) {
      console.log(`🚫 [Driver Acceptance] Found ${callingDrivers.length} driver(s) currently being called, cancelling...`);
      callingDrivers.forEach(d => {
        console.log(`   Cancelling position #${d.position}: ${d.drivers?.first_name} ${d.drivers?.last_name}`);
      });

      await supabase
        .from('driver_assignment_queue')
        .update({ status: 'cancelled' })
        .eq('booking_id', bookingId)
        .eq('status', 'calling');
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

    // CRITICAL: Check if booking already has a driver assigned
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

    console.log('📞 [Try Next Driver] No driver assigned yet, calling next driver in queue...');

    // Call next driver
    const nextCallResult = await callNextDriverInQueue(bookingId, bookingData);

    if (nextCallResult.success) {
      console.log('✅ [Try Next Driver] Next driver called successfully');

      // Start processing this new call
      setTimeout(() => {
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
