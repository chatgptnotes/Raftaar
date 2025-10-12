/**
 * Driver Call Status Component
 * Shows active driver calls and allows manual marking of responses
 * Useful for testing and manual intervention
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { markDriverAccepted, markDriverRejected } from '../services/callMonitoring';

const DriverCallStatus = ({ bookingId, onStatusChange }) => {
  const [activeCall, setActiveCall] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current calling driver for this booking
  const fetchActiveCall = async () => {
    try {
      // First, try to get queue entry
      const { data: queueData, error: queueError } = await supabase
        .from('driver_assignment_queue')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('status', 'calling')
        .maybeSingle(); // Use maybeSingle instead of single to avoid PGRST116 error

      if (queueError) {
        // 406 error means table exists but RLS is blocking or table structure issue
        if (queueError.code === 'PGRST301') {
          console.warn('⚠️ [DriverCallStatus] 406 error - RLS policy issue or table not properly configured');
        } else if (queueError.code === '42P01' || queueError.message?.includes('relation') || queueError.message?.includes('does not exist')) {
          console.warn('⚠️ [DriverCallStatus] Table driver_assignment_queue does not exist. Please run SQL migration first.');
        } else {
          console.error('❌ [DriverCallStatus] Error fetching active call:', queueError);
        }
        setActiveCall(null);
        return;
      }

      // If no data, no active call
      if (!queueData) {
        setActiveCall(null);
        return;
      }

      // If queue entry found, fetch driver and booking details separately
      const [driverResult, bookingResult] = await Promise.all([
        supabase
          .from('drivers')
          .select('id, first_name, last_name, phone')
          .eq('id', queueData.driver_id)
          .maybeSingle(),
        supabase
          .from('bookings')
          .select('id, booking_id, address, city, nearest_hospital, phone_number, remarks')
          .eq('id', queueData.booking_id)
          .maybeSingle()
      ]);

      // Combine data
      const combinedData = {
        ...queueData,
        drivers: driverResult.data,
        bookings: bookingResult.data
      };

      setActiveCall(combinedData);
    } catch (error) {
      console.error('❌ [DriverCallStatus] Unexpected error:', error);
      setActiveCall(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveCall();

    // Subscribe to changes (only if table exists)
    const subscription = supabase
      .channel(`booking-${bookingId}-calls`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_assignment_queue',
          filter: `booking_id=eq.${bookingId}`
        },
        () => {
          fetchActiveCall();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('⚠️ [DriverCallStatus] Subscription error (table may not exist):', err);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [bookingId]);

  const handleAccept = async () => {
    if (!activeCall) return;

    setLoading(true);
    const success = await markDriverAccepted(activeCall.id, bookingId);

    if (success) {
      console.log('✅ Driver marked as accepted');
      if (onStatusChange) onStatusChange('accepted');
      await fetchActiveCall();
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!activeCall) return;

    setLoading(true);
    const success = await markDriverRejected(
      activeCall.id,
      bookingId,
      activeCall.bookings
    );

    if (success) {
      console.log('❌ Driver marked as rejected, calling next driver');
      if (onStatusChange) onStatusChange('rejected');
      // Wait a bit for next call to initiate
      setTimeout(() => fetchActiveCall(), 2000);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <p className="text-blue-700">Loading call status...</p>
      </div>
    );
  }

  if (!activeCall) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
        <p className="text-gray-600">No active call</p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="font-semibold text-gray-800">Active Call</span>
      </div>

      <div className="text-sm space-y-1">
        <p className="text-gray-700">
          <span className="font-medium">Driver:</span>{' '}
          {activeCall.drivers.first_name} {activeCall.drivers.last_name}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Phone:</span> {activeCall.drivers.phone}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Distance:</span> {activeCall.distance}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Position:</span> {activeCall.position} of 3
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Called at:</span>{' '}
          {new Date(activeCall.called_at).toLocaleTimeString()}
        </p>
      </div>

      <div className="pt-2 border-t border-yellow-200">
        <p className="text-xs text-gray-600 mb-2">
          Mark driver response (or wait 60s for auto-fallback):
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            ✓ Accept
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            ✗ Reject
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 italic">
        Auto-fallback in ~60 seconds if no response
      </p>
    </div>
  );
};

export default DriverCallStatus;
