import { supabase } from '../lib/supabaseClient';
import { makeDriverCall } from './bolnaService';
import { startIntelligentProcessing } from './intelligentReassignment';

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // distance in km
};

/**
 * Find nearest available driver
 * @param {number} bookingLat - Booking location latitude
 * @param {number} bookingLng - Booking location longitude
 * @param {string} serviceType - Optional service type filter (e.g., 'basic', 'icu')
 * @returns {Promise<Object|null>} Nearest driver or null if none found
 */
export const findNearestDriver = async (bookingLat, bookingLng, serviceType = null) => {
  try {
    console.log('🚗 [Driver Assignment] Finding nearest driver...');
    console.log('📍 [Driver Assignment] Booking location:', bookingLat, bookingLng);
    console.log('🚑 [Driver Assignment] Service type:', serviceType || 'Any');

    // Query all available drivers
    let query = supabase
      .from('drivers')
      .select('*')
      .eq('is_available', true)
      .eq('current_status', 'online')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Filter by service type if provided
    if (serviceType) {
      query = query.eq('service_type', serviceType);
    }

    const { data: drivers, error } = await query;

    if (error) {
      console.error('❌ [Driver Assignment] Error fetching drivers:', error);
      throw error;
    }

    if (!drivers || drivers.length === 0) {
      console.warn('⚠️ [Driver Assignment] No available drivers found');
      return null;
    }

    console.log(`✅ [Driver Assignment] Found ${drivers.length} available driver(s)`);

    // Calculate distance for each driver and find the nearest
    const driversWithDistance = drivers.map(driver => ({
      ...driver,
      distance: calculateDistance(
        bookingLat,
        bookingLng,
        driver.latitude,
        driver.longitude
      )
    }));

    // Sort by distance (ascending)
    driversWithDistance.sort((a, b) => a.distance - b.distance);

    const nearestDriver = driversWithDistance[0];

    console.log('🎯 [Driver Assignment] Nearest driver found:');
    console.log(`   Name: ${nearestDriver.first_name} ${nearestDriver.last_name}`);
    console.log(`   Distance: ${nearestDriver.distance.toFixed(2)} km`);
    console.log(`   Vehicle: ${nearestDriver.vehicle_model} (${nearestDriver.vehicle_number})`);
    console.log(`   Service Type: ${nearestDriver.service_type}`);

    return nearestDriver;
  } catch (error) {
    console.error('❌ [Driver Assignment] Error:', error);
    return null;
  }
};

/**
 * Find nearest N drivers (for manual selection)
 * @param {number} bookingLat - Booking location latitude
 * @param {number} bookingLng - Booking location longitude
 * @param {number} limit - Number of drivers to return (default 3)
 * @param {string} serviceType - Optional service type filter
 * @returns {Promise<Array>} Array of nearest drivers sorted by distance
 */
export const findNearestDrivers = async (bookingLat, bookingLng, limit = 3, serviceType = null) => {
  try {
    console.log('🚗🚗🚗 [Driver Search] Finding nearest', limit, 'drivers...');
    console.log('📍 [Driver Search] Booking location:', bookingLat, bookingLng);

    // Query all available drivers
    let query = supabase
      .from('drivers')
      .select('*')
      .eq('is_available', true)
      .eq('current_status', 'online')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (serviceType) {
      query = query.eq('service_type', serviceType);
    }

    const { data: drivers, error } = await query;

    if (error) {
      console.error('❌ [Driver Search] Error fetching drivers:', error);
      throw error;
    }

    if (!drivers || drivers.length === 0) {
      console.warn('⚠️ [Driver Search] No available drivers found');
      return [];
    }

    console.log(`✅ [Driver Search] Found ${drivers.length} available driver(s)`);

    // Calculate distance for each driver
    const driversWithDistance = drivers.map(driver => ({
      ...driver,
      distance: calculateDistance(
        bookingLat,
        bookingLng,
        driver.latitude,
        driver.longitude
      )
    }));

    // Sort by distance and take top N
    driversWithDistance.sort((a, b) => a.distance - b.distance);
    const nearestDrivers = driversWithDistance.slice(0, limit);

    console.log(`🎯 [Driver Search] Returning top ${nearestDrivers.length} nearest drivers:`);
    nearestDrivers.forEach((driver, idx) => {
      console.log(`   ${idx + 1}. ${driver.first_name} ${driver.last_name} - ${driver.distance.toFixed(2)} km`);
    });

    return nearestDrivers;
  } catch (error) {
    console.error('❌ [Driver Search] Error:', error);
    return [];
  }
};

/**
 * Assign driver to a booking
 * @param {string} bookingId - Booking ID (UUID)
 * @param {string} driverId - Driver ID (UUID)
 * @param {number} distance - Distance in km
 * @returns {Promise<Object>} Updated booking data
 */
export const assignDriverToBooking = async (bookingId, driverId, distance) => {
  try {
    console.log('📝 [Driver Assignment] Assigning driver to booking...');
    console.log(`   Booking ID: ${bookingId}`);
    console.log(`   Driver ID: ${driverId}`);
    console.log(`   Distance: ${distance.toFixed(2)} km`);

    // Update booking with driver_id and distance
    const { data, error } = await supabase
      .from('bookings')
      .update({
        driver_id: driverId,
        distance: `${distance.toFixed(2)} km`,
        status: 'assigned'
      })
      .eq('id', bookingId)
      .select();

    if (error) {
      console.error('❌ [Driver Assignment] Error updating booking:', error);
      throw error;
    }

    console.log('✅ [Driver Assignment] Driver assigned successfully!');
    return data[0];
  } catch (error) {
    console.error('❌ [Driver Assignment] Error:', error);
    throw error;
  }
};

/**
 * Clear existing queue for a booking (for retry scenarios)
 * @param {string} bookingId - Booking ID
 * @returns {Promise<void>}
 */
export const clearDriverQueue = async (bookingId) => {
  try {
    console.log('🧹 [Driver Queue] Clearing existing queue for booking...');

    const { error } = await supabase
      .from('driver_assignment_queue')
      .delete()
      .eq('booking_id', bookingId);

    if (error) {
      console.error('❌ [Driver Queue] Error clearing queue:', error);
      throw error;
    }

    console.log('✅ [Driver Queue] Existing queue cleared');
  } catch (error) {
    console.error('❌ [Driver Queue] Error clearing queue:', error);
    throw error;
  }
};

/**
 * Store driver queue for a booking (3 nearest drivers)
 * @param {string} bookingId - Booking ID
 * @param {Array} drivers - Array of drivers with distance
 * @returns {Promise<Array>} Queue entries created
 */
export const storeDriverQueue = async (bookingId, drivers) => {
  try {
    console.log('📋 [Driver Queue] Storing fallback driver queue...');

    // First, check if queue already exists
    const { data: existingEntries, error: checkError } = await supabase
      .from('driver_assignment_queue')
      .select('id, status')
      .eq('booking_id', bookingId);

    if (!checkError && existingEntries && existingEntries.length > 0) {
      console.log('⚠️ [Driver Queue] Queue already exists, skipping...');
      console.log(`   Found ${existingEntries.length} existing entries`);
      // Return full data with driver info for compatibility
      const { data: fullQueue } = await supabase
        .from('driver_assignment_queue')
        .select('*')
        .eq('booking_id', bookingId)
        .order('position');
      return fullQueue || existingEntries;
    }

    // Create queue entries for top 3 drivers
    const queueEntries = drivers.slice(0, 3).map((driver, index) => ({
      booking_id: bookingId,
      driver_id: driver.id,
      position: index + 1,
      status: 'pending',
      distance: `${driver.distance.toFixed(2)} km`
    }));

    console.log('📝 [Driver Queue] Inserting queue entries...');

    const { data, error } = await supabase
      .from('driver_assignment_queue')
      .insert(queueEntries)
      .select();

    if (error) {
      // If duplicate key error, just return existing entries
      if (error.code === '23505' || error.message?.includes('unique constraint')) {
        console.log('⚠️ [Driver Queue] Duplicate entry detected, returning existing queue');
        const { data: existing } = await supabase
          .from('driver_assignment_queue')
          .select('*')
          .eq('booking_id', bookingId)
          .order('position');
        return existing || [];
      }

      console.error('❌ [Driver Queue] Error storing queue:', error);
      throw error;
    }

    console.log(`✅ [Driver Queue] Stored ${data.length} drivers in queue`);
    return data;
  } catch (error) {
    console.error('❌ [Driver Queue] Error:', error);

    // Silently handle duplicate errors
    if (error.code === '23505' || error.message?.includes('unique constraint')) {
      console.log('⚠️ [Driver Queue] Handling duplicate gracefully');
      return [];
    }

    throw error;
  }
};

/**
 * Update queue entry status and call info
 * @param {string} queueId - Queue entry ID
 * @param {Object} updates - Updates to apply
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<Object>} Updated queue entry
 */
export const updateQueueEntry = async (queueId, updates, retries = 3) => {
  let attempt = 0;

  while (attempt < retries) {
    try {
      attempt++;

      console.log(`🔄 [Driver Queue] Updating entry (attempt ${attempt}/${retries})...`);
      console.log(`   Queue ID: ${queueId}`);
      console.log(`   Updates:`, updates);

      const { data, error } = await supabase
        .from('driver_assignment_queue')
        .update(updates)
        .eq('id', queueId)
        .select()
        .single();

      if (error) {
        console.error(`❌ [Driver Queue] Update error (attempt ${attempt}):`, error);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);

        // Handle specific error cases
        if (error.code === 'PGRST116') {
          // Record not found - try to fetch it
          console.warn('⚠️ [Driver Queue] Queue entry not found or already updated:', queueId);
          const { data: existing } = await supabase
            .from('driver_assignment_queue')
            .select('*')
            .eq('id', queueId)
            .single();

          if (existing) {
            console.log('✅ [Driver Queue] Found existing entry, returning it');
            return existing;
          } else {
            console.error('❌ [Driver Queue] Entry no longer exists');
            return null;
          }
        }

        // Handle 406 Not Acceptable (RLS policy issue)
        if (error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          console.error('❌ [Driver Queue] RLS Policy Error (406)');
          console.error('   This usually means Row Level Security policies are blocking the operation');
          console.error('   Run: supabase/migrations/fix_driver_queue_complete.sql to fix');

          // On last attempt, try to fetch current state
          if (attempt === retries) {
            const { data: existing } = await supabase
              .from('driver_assignment_queue')
              .select('*')
              .eq('id', queueId)
              .maybeSingle();
            return existing || null;
          }

          // Wait before retry for RLS issues
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        // Handle constraint violations
        if (error.code === '23514' || error.message?.includes('violates check constraint')) {
          console.error('❌ [Driver Queue] CHECK Constraint Violation');
          console.error('   Attempted status:', updates.status);
          console.error('   This status is not allowed by database constraint');
          console.error('   Run: supabase/migrations/fix_driver_queue_complete.sql to fix');
          return null;
        }

        // For other errors, retry with exponential backoff
        if (attempt < retries) {
          const waitTime = 500 * attempt;
          console.log(`⏳ [Driver Queue] Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        throw error;
      }

      console.log('✅ [Driver Queue] Update successful');
      return data;

    } catch (error) {
      console.error(`❌ [Driver Queue] Unexpected error (attempt ${attempt}):`, error);

      if (attempt >= retries) {
        console.error('❌ [Driver Queue] All retry attempts exhausted');
        // Return null instead of throwing to prevent crash
        return null;
      }

      // Wait before retry
      const waitTime = 500 * attempt;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  console.error('❌ [Driver Queue] Failed to update after all retries');
  return null;
};

/**
 * Get next driver in queue for a booking
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object|null>} Next pending driver or null
 */
export const getNextDriverInQueue = async (bookingId) => {
  try {
    console.log('🔍 [Driver Queue] Finding next driver in queue...');

    const { data, error } = await supabase
      .from('driver_assignment_queue')
      .select(`
        *,
        drivers:driver_id (
          id,
          first_name,
          last_name,
          phone,
          vehicle_model,
          vehicle_number,
          latitude,
          longitude,
          is_available,
          current_status
        )
      `)
      .eq('booking_id', bookingId)
      .eq('status', 'pending')
      .order('position', { ascending: true })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn('⚠️ [Driver Queue] No more drivers in queue');
      return null;
    }

    console.log(`✅ [Driver Queue] Found driver at position ${data[0].position}`);
    return data[0];
  } catch (error) {
    console.error('❌ [Driver Queue] Error:', error);
    return null;
  }
};

/**
 * Call next driver in queue
 * @param {string} bookingId - Booking ID
 * @param {Object} bookingData - Booking details
 * @returns {Promise<Object>} Call result
 */
export const callNextDriverInQueue = async (bookingId, bookingData) => {
  try {
    console.log('📞 [Driver Queue] Calling next driver in queue...');

    // Get next pending driver
    const queueEntry = await getNextDriverInQueue(bookingId);

    if (!queueEntry) {
      console.error('❌ [Driver Queue] No more drivers available in queue');
      return {
        success: false,
        message: 'No more drivers available in queue'
      };
    }

    const driver = queueEntry.drivers;

    // Update queue status to calling
    const updateResult = await updateQueueEntry(queueEntry.id, {
      status: 'calling',
      called_at: new Date().toISOString()
    });

    if (!updateResult) {
      console.warn('⚠️ [Driver Queue] Failed to update queue entry, but continuing with call...');
    }

    // Make call to driver
    console.log(`📞 [Driver Queue] Calling driver: ${driver.first_name} ${driver.last_name}`);
    const callResult = await makeDriverCall(
      driver.phone,
      driver,
      {
        booking_id: bookingData.booking_id,
        address: bookingData.address,
        city: bookingData.city,
        nearest_hospital: bookingData.nearest_hospital,
        distance: queueEntry.distance,
        phone_number: bookingData.phone_number
      }
    );

    if (callResult.success) {
      // Update queue with call ID
      await updateQueueEntry(queueEntry.id, {
        call_id: callResult.data.execution_id
      });

      console.log('✅ [Driver Queue] Driver call initiated successfully');
      return {
        success: true,
        queueEntry: queueEntry,
        driver: driver,
        callResult: callResult
      };
    } else {
      // Mark as failed
      await updateQueueEntry(queueEntry.id, {
        status: 'failed'
      });

      console.error('❌ [Driver Queue] Call failed, trying next driver...');

      // Recursively try next driver
      return await callNextDriverInQueue(bookingId, bookingData);
    }
  } catch (error) {
    console.error('❌ [Driver Queue] Error calling next driver:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Auto-assign nearest driver to booking with fallback queue
 * NEW VERSION: Stores 3 nearest drivers and implements automatic fallback
 * @param {Object} booking - Booking object with location data
 * @returns {Promise<Object>} Result object with success status and data
 */
export const autoAssignDriver = async (booking) => {
  try {
    console.log('🚗 [Driver Assignment] Starting auto-assignment for booking:', booking.booking_id);

    // CRITICAL: Check if this booking already has a queue or is already assigned
    const { data: existingQueue, error: queueCheckError } = await supabase
      .from('driver_assignment_queue')
      .select('id, booking_id, status')
      .eq('booking_id', booking.id)
      .limit(1);

    if (!queueCheckError && existingQueue && existingQueue.length > 0) {
      console.log('⚠️ [Driver Assignment] Queue already exists for this booking');
      console.log('   Existing queue entries:', existingQueue.length);
      return {
        success: false,
        message: 'Driver assignment already in progress or completed for this booking',
        alreadyProcessing: true
      };
    }

    // Check if driver is already assigned
    if (booking.driver_id) {
      console.log('⚠️ [Driver Assignment] Driver already assigned to this booking');
      return {
        success: false,
        message: 'Driver already assigned to this booking',
        alreadyAssigned: true
      };
    }

    // Extract location from booking
    // Location is stored in remarks as "Location: lat, lng"
    let bookingLat, bookingLng;

    if (booking.remarks && booking.remarks.includes('Location:')) {
      const locationMatch = booking.remarks.match(/Location: ([-\d.]+), ([-\d.]+)/);
      if (locationMatch) {
        bookingLat = parseFloat(locationMatch[1]);
        bookingLng = parseFloat(locationMatch[2]);
      }
    }

    if (!bookingLat || !bookingLng) {
      console.warn('⚠️ [Driver Assignment] No location data in booking');
      return {
        success: false,
        message: 'No location data available'
      };
    }

    // Find 3 nearest drivers for fallback queue
    console.log('🚗 [Driver Assignment] Finding 3 nearest drivers for queue...');
    const nearestDrivers = await findNearestDrivers(bookingLat, bookingLng, 3);

    if (!nearestDrivers || nearestDrivers.length === 0) {
      console.warn('⚠️ [Driver Assignment] No available drivers found');
      return {
        success: false,
        message: 'No available drivers found'
      };
    }

    console.log(`✅ [Driver Assignment] Found ${nearestDrivers.length} driver(s)`);

    // Store all 3 drivers in queue for automatic fallback
    await storeDriverQueue(booking.id, nearestDrivers);

    // Call the first driver in queue
    console.log('📞 [Driver Assignment] Calling first driver in queue...');
    const callResult = await callNextDriverInQueue(booking.id, booking);

    if (!callResult.success) {
      return {
        success: false,
        message: 'Failed to call any driver in queue',
        error: callResult.error
      };
    }

    // Start intelligent processing - analyzes transcript and auto-reassigns if declined
    console.log('🤖 [Driver Assignment] Starting intelligent transcript analysis...');
    startIntelligentProcessing(
      callResult.queueEntry.id,
      callResult.callResult.data.execution_id,
      booking.id,
      booking
    );

    return {
      success: true,
      message: 'Driver queue created and first driver called with intelligent processing',
      queueSize: nearestDrivers.length,
      currentDriver: callResult.driver,
      callStatus: callResult.callResult,
      queueEntryId: callResult.queueEntry.id,
      note: 'Intelligent processing enabled: Will analyze transcript and auto-reassign if driver declines'
    };
  } catch (error) {
    console.error('❌ [Driver Assignment] Auto-assign error:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

/**
 * Handle driver response from Bolna webhook
 * Called by webhook when driver responds or call fails
 * @param {string} callId - Bolna execution_id
 * @param {string} response - Driver response: "yes", "no", or "no_answer"
 * @returns {Promise<Object>} Result of handling response
 */
export const handleDriverResponse = async (callId, response) => {
  try {
    console.log(`🎤 [Driver Response] Received response: ${response} for call: ${callId}`);

    // Find queue entry by call_id
    const { data: queueEntry, error: findError } = await supabase
      .from('driver_assignment_queue')
      .select(`
        *,
        bookings:booking_id (
          id,
          booking_id,
          address,
          city,
          nearest_hospital,
          phone_number
        ),
        drivers:driver_id (
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('call_id', callId)
      .eq('status', 'calling')
      .single();

    if (findError || !queueEntry) {
      console.error('❌ [Driver Response] Queue entry not found for call:', callId);
      return { success: false, message: 'Queue entry not found' };
    }

    console.log(`📋 [Driver Response] Found queue entry for booking: ${queueEntry.bookings.booking_id}`);

    if (response === 'yes') {
      // Driver accepted - assign booking to this driver
      console.log('✅ [Driver Response] Driver ACCEPTED the booking');

      // Update queue status
      await updateQueueEntry(queueEntry.id, {
        status: 'accepted',
        response: 'yes',
        responded_at: new Date().toISOString()
      });

      // Assign driver to booking
      const distance = parseFloat(queueEntry.distance.replace(' km', ''));
      await assignDriverToBooking(queueEntry.booking_id, queueEntry.driver_id, distance);

      // Mark all other pending drivers in queue as cancelled
      await supabase
        .from('driver_assignment_queue')
        .update({ status: 'cancelled' })
        .eq('booking_id', queueEntry.booking_id)
        .eq('status', 'pending');

      return {
        success: true,
        action: 'assigned',
        driver: queueEntry.drivers,
        booking: queueEntry.bookings
      };
    } else {
      // Driver rejected or no answer - try next driver
      console.log(`⚠️ [Driver Response] Driver ${response === 'no' ? 'REJECTED' : 'DID NOT ANSWER'}`);

      // Update queue status
      await updateQueueEntry(queueEntry.id, {
        status: response === 'no' ? 'rejected' : 'no_answer',
        response: response,
        responded_at: new Date().toISOString()
      });

      // Call next driver in queue
      console.log('📞 [Driver Response] Calling next driver in queue...');
      const nextCallResult = await callNextDriverInQueue(
        queueEntry.booking_id,
        queueEntry.bookings
      );

      if (nextCallResult.success) {
        return {
          success: true,
          action: 'called_next',
          nextDriver: nextCallResult.driver,
          previousDriver: queueEntry.drivers
        };
      } else {
        // No more drivers in queue
        console.error('❌ [Driver Response] No more drivers available');

        // Update booking status to indicate no drivers available
        await supabase
          .from('bookings')
          .update({
            status: 'no_drivers_available',
            remarks: `${queueEntry.bookings.remarks || ''}\n[Auto-assign failed: All drivers rejected or unavailable]`
          })
          .eq('id', queueEntry.booking_id);

        return {
          success: false,
          action: 'no_more_drivers',
          message: 'All drivers in queue rejected or unavailable'
        };
      }
    }
  } catch (error) {
    console.error('❌ [Driver Response] Error handling response:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
