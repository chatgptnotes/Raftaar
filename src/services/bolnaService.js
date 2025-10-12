/**
 * Bolna AI Voice Call Service
 * Handles automatic voice call initiation when new bookings arrive
 */

import { supabase } from '../lib/supabaseClient';

const BOLNA_BASE_URL = import.meta.env.VITE_BOLNA_BASE_URL;
const BOLNA_CALLS_PATH = import.meta.env.VITE_BOLNA_CALLS_PATH;
const BOLNA_API_URL = `${BOLNA_BASE_URL}${BOLNA_CALLS_PATH}`;
const BOLNA_API_KEY = import.meta.env.VITE_BOLNA_API_KEY;
const BOLNA_AGENT_ID = import.meta.env.VITE_BOLNA_AGENT_ID;
const BOLNA_DRIVER_AGENT_ID = import.meta.env.VITE_BOLNA_DRIVER_AGENT_ID;
const BOLNA_FROM_NUMBER = import.meta.env.VITE_BOLNA_FROM_NUMBER;

/**
 * Format phone number to E.164 format
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number with +91 prefix
 */
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;

  console.log('📱 [Bolna] Original phone number:', phoneNumber);

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  console.log('📱 [Bolna] Cleaned phone number:', cleaned);

  // If already has country code (12 digits starting with 91)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    const formatted = `+${cleaned}`;
    console.log('📱 [Bolna] Formatted (already has 91):', formatted);
    return formatted;
  }

  // If 10 digits, add India country code +91
  if (cleaned.length === 10) {
    const formatted = `+91${cleaned}`;
    console.log('📱 [Bolna] Formatted (added +91):', formatted);
    return formatted;
  }

  // If already has +, return as is
  if (phoneNumber.startsWith('+')) {
    console.log('📱 [Bolna] Already has + prefix:', phoneNumber);
    return phoneNumber;
  }

  // If 11 digits starting with 1 (some formats), extract last 10
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const formatted = `+91${cleaned.substring(1)}`;
    console.log('📱 [Bolna] Formatted (removed leading 1):', formatted);
    return formatted;
  }

  // Default: Return null for invalid format
  console.error('❌ [Bolna] Invalid phone format - length:', cleaned.length);
  return null;
};

/**
 * Make a voice call using Bolna AI API
 * @param {string} phoneNumber - Recipient's phone number
 * @param {object} bookingData - Booking data for context (optional)
 * @returns {Promise<object>} API response
 */
export const makeBolnaCall = async (phoneNumber, bookingData = {}) => {
  try {
    // Validate inputs
    if (!phoneNumber) {
      console.error('❌ [Bolna] Phone number is required');
      return { success: false, error: 'Phone number is required' };
    }

    if (!BOLNA_API_KEY || !BOLNA_AGENT_ID) {
      console.error('❌ [Bolna] API credentials missing in environment variables');
      return { success: false, error: 'Bolna API credentials not configured' };
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      console.error('❌ [Bolna] Invalid phone number format:', phoneNumber);
      return { success: false, error: 'Invalid phone number format' };
    }

    console.log('📞 [Bolna] Initiating call to:', formattedPhone);
    console.log('📞 [Bolna] From number:', BOLNA_FROM_NUMBER);
    console.log('🔗 [Bolna] API URL:', BOLNA_API_URL);
    console.log('📋 [Bolna] Booking data:', {
      booking_id: bookingData.booking_id,
      address: bookingData.address,
      city: bookingData.city
    });

    // Prepare request payload
    const payload = {
      agent_id: BOLNA_AGENT_ID,
      recipient_phone_number: formattedPhone,
      from_phone_number: BOLNA_FROM_NUMBER,
      user_data: {
        booking_id: bookingData.booking_id || 'N/A',
        address: bookingData.address || 'N/A',
        city: bookingData.city || 'N/A',
        pincode: bookingData.pincode || 'N/A',
        status: bookingData.status || 'pending',
        timestamp: new Date().toISOString()
      }
    };

    // Make API call
    const response = await fetch(BOLNA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Parse response
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Success
    console.log('✅ [Bolna] Call initiated successfully:', {
      status: data.status,
      execution_id: data.execution_id,
      phone: formattedPhone
    });

    // Update booking with call status
    if (bookingData.id) {
      try {
        await supabase
          .from('bookings')
          .update({
            victim_call_made: true,
            victim_call_time: new Date().toISOString(),
            victim_call_status: 'success'
          })
          .eq('id', bookingData.id);

        console.log('✅ [Bolna] Booking updated with call status');
      } catch (updateError) {
        console.error('❌ [Bolna] Failed to update booking:', updateError);
      }
    }

    return {
      success: true,
      data: data,
      phone: formattedPhone
    };

  } catch (error) {
    console.error('❌ [Bolna] API call failed:', error.message);
    console.error('🔍 [Bolna] Error details:', error);

    // Update booking with failed call status
    if (bookingData.id) {
      try {
        await supabase
          .from('bookings')
          .update({
            victim_call_made: true,
            victim_call_time: new Date().toISOString(),
            victim_call_status: 'failed'
          })
          .eq('id', bookingData.id);

        console.log('⚠️ [Bolna] Booking updated with failed call status');
      } catch (updateError) {
        console.error('❌ [Bolna] Failed to update booking:', updateError);
      }
    }

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Make a voice call to driver using Bolna AI API
 * Called when a driver is assigned to a booking
 * @param {string} driverPhone - Driver's phone number
 * @param {object} driverData - Driver info
 * @param {object} bookingData - Booking data with patient details
 * @returns {Promise<object>} API response
 */
export const makeDriverCall = async (driverPhone, driverData = {}, bookingData = {}) => {
  try {
    // Validate inputs
    if (!driverPhone) {
      console.error('❌ [Bolna Driver] Phone number is required');
      return { success: false, error: 'Phone number is required' };
    }

    if (!BOLNA_API_KEY || !BOLNA_DRIVER_AGENT_ID) {
      console.error('❌ [Bolna Driver] API credentials missing');
      return { success: false, error: 'Bolna Driver API credentials not configured' };
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(driverPhone);
    if (!formattedPhone) {
      console.error('❌ [Bolna Driver] Invalid phone number format:', driverPhone);
      return { success: false, error: 'Invalid phone number format' };
    }

    console.log('📞 [Bolna Driver] Initiating driver call to:', formattedPhone);
    console.log('🚗 [Bolna Driver] Driver:', `${driverData.first_name} ${driverData.last_name}`);
    console.log('📋 [Bolna Driver] Booking ID:', bookingData.booking_id);

    // Get Supabase URL for webhook
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const webhookUrl = `${SUPABASE_URL}/functions/v1/bolna-webhook`;

    console.log('🔔 [Bolna Driver] Webhook URL:', webhookUrl);

    // Prepare request payload for driver call
    // Variable names must match EXACTLY with Bolna.ai agent configuration
    // Variables: {victim_location}, {nearby_hospital}, {Phone_umber}
    const payload = {
      agent_id: BOLNA_DRIVER_AGENT_ID,
      recipient_phone_number: formattedPhone,
      from_phone_number: BOLNA_FROM_NUMBER,
      webhook_url: webhookUrl, // ← CRITICAL: Webhook for instant notifications
      user_data: {
        alert_type: 'Raftaar Ambulance Alert',
        driver_name: `${driverData.first_name} ${driverData.last_name}`,
        booking_id: bookingData.booking_id || 'N/A',
        victim_location: bookingData.address || 'N/A',
        nearby_hospital: bookingData.nearest_hospital || 'N/A',
        Phone_umber: bookingData.phone_number || 'N/A',  // Note: typo in Bolna agent config
        distance: bookingData.distance || 'N/A',
        timestamp: new Date().toISOString()
      }
    };

    console.log('📦 [Bolna Driver] Payload:', JSON.stringify(payload, null, 2));

    // Make API call
    const response = await fetch(BOLNA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Parse response
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Success
    console.log('✅ [Bolna Driver] Call initiated successfully:', {
      status: data.status,
      execution_id: data.execution_id,
      phone: formattedPhone,
      driver: `${driverData.first_name} ${driverData.last_name}`
    });

    // Update booking with driver call status
    if (bookingData.booking_id) {
      try {
        await supabase
          .from('bookings')
          .update({
            driver_call_made: true,
            driver_call_time: new Date().toISOString(),
            driver_call_status: 'success'
          })
          .eq('booking_id', bookingData.booking_id);

        console.log('✅ [Bolna Driver] Booking updated with driver call status');
      } catch (updateError) {
        console.error('❌ [Bolna Driver] Failed to update booking:', updateError);
      }
    }

    return {
      success: true,
      data: data,
      phone: formattedPhone
    };

  } catch (error) {
    console.error('❌ [Bolna Driver] API call failed:', error.message);
    console.error('🔍 [Bolna Driver] Error details:', error);

    // Update booking with failed driver call status
    if (bookingData.booking_id) {
      try {
        await supabase
          .from('bookings')
          .update({
            driver_call_made: true,
            driver_call_time: new Date().toISOString(),
            driver_call_status: 'failed'
          })
          .eq('booking_id', bookingData.booking_id);

        console.log('⚠️ [Bolna Driver] Booking updated with failed driver call status');
      } catch (updateError) {
        console.error('❌ [Bolna Driver] Failed to update booking:', updateError);
      }
    }

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Test Bolna API connection
 * @returns {Promise<boolean>} True if API is accessible
 */
export const testBolnaConnection = async () => {
  try {
    if (!BOLNA_API_KEY || !BOLNA_AGENT_ID) {
      console.warn('⚠️ [Bolna] API credentials not configured');
      return false;
    }

    console.log('🔍 [Bolna] Testing API connection...');
    console.log('🔑 [Bolna] API Key:', BOLNA_API_KEY ? 'Configured ✓' : 'Missing ✗');
    console.log('🤖 [Bolna] Agent ID:', BOLNA_AGENT_ID ? 'Configured ✓' : 'Missing ✗');
    console.log('🚗 [Bolna] Driver Agent ID:', BOLNA_DRIVER_AGENT_ID ? 'Configured ✓' : 'Missing ✗');

    return true;
  } catch (error) {
    console.error('❌ [Bolna] Connection test failed:', error);
    return false;
  }
};

export default {
  makeBolnaCall,
  makeDriverCall,
  testBolnaConnection,
  formatPhoneNumber
};
