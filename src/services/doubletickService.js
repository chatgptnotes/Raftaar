/**
 * DoubleTick WhatsApp Service
 * Handles WhatsApp message sending via DoubleTick API for emergency location sharing
 */

import axios from 'axios';

const DOUBLETICK_API_URL = 'https://public.doubletick.io/whatsapp/message/template';
const DOUBLETICK_API_KEY = import.meta.env.VITE_DOUBLETICK_API_KEY;
const DOUBLETICK_TEMPLATE_NAME = import.meta.env.VITE_DOUBLETICK_TEMPLATE_NAME;

/**
 * Format phone number for WhatsApp (with country code)
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
const formatWhatsAppNumber = (phoneNumber) => {
  if (!phoneNumber) return null;

  console.log('📱 [DoubleTick] Original phone number:', phoneNumber);

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  console.log('📱 [DoubleTick] Cleaned phone number:', cleaned);

  // If already has country code (12 digits starting with 91)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    console.log('📱 [DoubleTick] Already has country code:', cleaned);
    return cleaned;
  }

  // If 10 digits, add India country code 91
  if (cleaned.length === 10) {
    const formatted = `91${cleaned}`;
    console.log('📱 [DoubleTick] Formatted (added 91):', formatted);
    return formatted;
  }

  // If already has +, remove it
  if (phoneNumber.startsWith('+')) {
    const formatted = cleaned;
    console.log('📱 [DoubleTick] Removed + prefix:', formatted);
    return formatted;
  }

  // Default: Return cleaned number
  console.log('📱 [DoubleTick] Using cleaned number:', cleaned);
  return cleaned;
};

/**
 * Format victim location for WhatsApp (Variable 1)
 * @param {object} booking - Booking data containing location info
 * @returns {string} Formatted location string with Google Maps link
 */
const formatVictimLocation = (booking) => {
  const parts = [];

  // Add address
  if (booking.address) {
    parts.push(booking.address);
  }

  // Add city and pincode
  if (booking.city || booking.pincode) {
    const cityInfo = [booking.city, booking.pincode].filter(Boolean).join(' - ');
    parts.push(cityInfo);
  }

  // Extract coordinates from remarks (format: "Location: lat, lng")
  if (booking.remarks && booking.remarks.includes('Location:')) {
    const coordMatch = booking.remarks.match(/Location:\s*([-\d.]+),\s*([-\d.]+)/);
    if (coordMatch) {
      const [, lat, lng] = coordMatch;
      const googleMapsLink = `https://maps.google.com/?q=${lat},${lng}`;
      parts.push(`🗺️ ${googleMapsLink}`);
    }
  }

  return parts.join('\n') || 'Location not available';
};

/**
 * Format nearest hospital info for WhatsApp (Variable 2)
 * @param {object} booking - Booking data containing hospital info
 * @returns {string} Formatted hospital string
 */
const formatNearestHospital = (booking) => {
  const parts = [];

  if (booking.nearest_hospital) {
    parts.push(booking.nearest_hospital);
  }

  if (booking.hospital_phone) {
    parts.push(`📞 ${booking.hospital_phone}`);
  }

  return parts.join('\n') || 'Hospital info not available';
};

/**
 * Format victim contact for WhatsApp (Variable 3)
 * @param {object} booking - Booking data containing phone number
 * @returns {string} Formatted phone number
 */
const formatVictimContact = (booking) => {
  if (booking.phone_number) {
    // If phone already has +, keep it
    if (booking.phone_number.startsWith('+')) {
      return booking.phone_number;
    }
    // If it's 10 digits, add +91
    const cleaned = booking.phone_number.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91 ${cleaned}`;
    }
    return booking.phone_number;
  }
  return 'Contact not available';
};

/**
 * Send WhatsApp location message to driver
 * @param {string} driverPhone - Driver's phone number
 * @param {object} booking - Booking data containing victim location
 * @returns {Promise<object>} API response
 */
export const sendLocationToDriver = async (driverPhone, booking) => {
  try {
    // Validate inputs
    if (!driverPhone) {
      console.error('❌ [DoubleTick] Driver phone number is required');
      return { success: false, error: 'Driver phone number is required' };
    }

    if (!booking) {
      console.error('❌ [DoubleTick] Booking data is required');
      return { success: false, error: 'Booking data is required' };
    }

    if (!DOUBLETICK_API_KEY) {
      console.error('❌ [DoubleTick] API key not configured');
      return { success: false, error: 'DoubleTick API key not configured' };
    }

    // Format phone number
    const formattedPhone = formatWhatsAppNumber(driverPhone);
    if (!formattedPhone) {
      console.error('❌ [DoubleTick] Invalid phone number format:', driverPhone);
      return { success: false, error: 'Invalid phone number format' };
    }

    // Format all 3 variables
    const victimLocation = formatVictimLocation(booking);
    const nearestHospital = formatNearestHospital(booking);
    const victimContact = formatVictimContact(booking);

    console.log('📱 [DoubleTick] Sending WhatsApp message...');
    console.log('📞 [DoubleTick] To:', formattedPhone);
    console.log('📍 [DoubleTick] Variable 1 (Location):', victimLocation);
    console.log('🏥 [DoubleTick] Variable 2 (Hospital):', nearestHospital);
    console.log('📞 [DoubleTick] Variable 3 (Contact):', victimContact);
    console.log('📋 [DoubleTick] Booking ID:', booking.booking_id);

    // Prepare API payload with 3 variables
    const payload = {
      messages: [
        {
          to: formattedPhone,
          content: {
            templateName: DOUBLETICK_TEMPLATE_NAME || 'raftaar_ambulance_alert',
            language: 'en',
            templateData: {
              body: {
                placeholders: [victimLocation, nearestHospital, victimContact]
              }
            }
          }
        }
      ]
    };

    console.log('📤 [DoubleTick] Request payload:', JSON.stringify(payload, null, 2));

    // Make API call
    const response = await axios.post(DOUBLETICK_API_URL, payload, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'Authorization': DOUBLETICK_API_KEY
      }
    });

    console.log('✅ [DoubleTick] Message sent successfully:', response.data);

    return {
      success: true,
      data: response.data,
      phone: formattedPhone,
      victimLocation,
      nearestHospital,
      victimContact
    };

  } catch (error) {
    console.error('❌ [DoubleTick] Failed to send message:', error.message);
    console.error('🔍 [DoubleTick] Error details:', error.response?.data || error);

    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Test DoubleTick API connection
 * @returns {Promise<boolean>} True if API is configured
 */
export const testDoubleTick = async () => {
  try {
    if (!DOUBLETICK_API_KEY) {
      console.warn('⚠️ [DoubleTick] API key not configured');
      return false;
    }

    console.log('🔍 [DoubleTick] API configured');
    console.log('🔑 [DoubleTick] API Key:', DOUBLETICK_API_KEY ? 'Configured ✓' : 'Missing ✗');
    console.log('📝 [DoubleTick] Template:', DOUBLETICK_TEMPLATE_NAME || 'ambulance_request_recived');

    return true;
  } catch (error) {
    console.error('❌ [DoubleTick] Test failed:', error);
    return false;
  }
};

export default {
  sendLocationToDriver,
  testDoubleTick,
  formatWhatsAppNumber,
  formatVictimLocation,
  formatNearestHospital,
  formatVictimContact
};
