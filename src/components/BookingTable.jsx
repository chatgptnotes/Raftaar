import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { makeBolnaCall } from '../services/bolnaService';

const BookingTable = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();

    // Subscribe to real-time changes with detailed logging
    console.log('🔌 [BookingTable] Setting up real-time subscription...');

    const channel = supabase
      .channel('bookings-table-changes', {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('🔥 [BookingTable] Real-time event received:', {
            eventType: payload.eventType,
            data: payload,
            timestamp: new Date().toISOString()
          });

          if (payload.eventType === 'INSERT') {
            console.log('➕ [BookingTable] Adding new booking:', payload.new);
            setBookings((prev) => {
              // Check if already exists to prevent duplicates
              const exists = prev.some(b => b.id === payload.new.id);
              if (exists) {
                console.log('⚠️ [BookingTable] Booking already exists, skipping');
                return prev;
              }
              // Keep only latest 10 bookings
              return [payload.new, ...prev].slice(0, 10);
            });

            // Trigger Bolna AI voice call
            if (payload.new.phone_number) {
              console.log('📞 [BookingTable] Triggering Bolna AI call for new booking');
              makeBolnaCall(payload.new.phone_number, payload.new)
                .then((result) => {
                  if (result.success) {
                    console.log('✅ [BookingTable] Bolna call initiated:', result.data);
                  } else {
                    console.error('❌ [BookingTable] Bolna call failed:', result.error);
                  }
                })
                .catch((error) => {
                  console.error('❌ [BookingTable] Bolna call error:', error);
                });
            } else {
              console.warn('⚠️ [BookingTable] No phone number in booking, skipping Bolna call');
            }
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ [BookingTable] Updating booking:', payload.new);
            setBookings((prev) =>
              prev.map((booking) =>
                booking.id === payload.new.id ? payload.new : booking
              )
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ [BookingTable] Deleting booking:', payload.old);
            setBookings((prev) =>
              prev.filter((booking) => booking.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [BookingTable] Real-time subscription ACTIVE');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [BookingTable] Real-time subscription ERROR:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ [BookingTable] Real-time subscription TIMEOUT');
        } else if (status === 'CLOSED') {
          console.warn('🔒 [BookingTable] Real-time subscription CLOSED');
        } else {
          console.log('📡 [BookingTable] Real-time status:', status);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 [BookingTable] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error loading bookings: {error}</p>
            <button
              onClick={fetchBookings}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Real-Time Bookings</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchBookings}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Refresh
          </button>
          <button
            onClick={() => navigate('/dashboard/bookings')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            View All
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No bookings found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Booking ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Timing</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Distance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking, index) => (
                <tr
                  key={booking.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                    index % 2 === 0 ? 'bg-green-50' : 'bg-white'
                  }`}
                >
                  <td className="px-4 py-4">
                    <span className="text-blue-600 font-semibold">{booking.booking_id || 'N/A'}</span>
                  </td>
                  <td className="px-4 py-4 text-gray-600 text-sm">
                    {booking.driver_id || 'Not Assigned'}
                  </td>
                  <td className="px-4 py-4 text-gray-600 text-sm">
                    {booking.address ? `${booking.address}${booking.city ? ', ' + booking.city : ''}` : 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-gray-600 text-sm">{formatDateTime(booking.timing)}</td>
                  <td className="px-4 py-4 text-gray-600 text-sm">{booking.distance || 'N/A'}</td>
                  <td className="px-4 py-4 text-gray-600 text-sm font-semibold">{booking.amount || 'N/A'}</td>
                  <td className="px-4 py-4">
                    <span className={`${getStatusColor(booking.status)} px-3 py-1 rounded-full text-xs font-semibold capitalize`}>
                      {booking.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700 transition">
                      Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BookingTable;
