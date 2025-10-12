import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import { makeBolnaCall } from '../services/bolnaService';

const Bookings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBookings();

    // Subscribe to real-time changes with detailed logging
    console.log('🔌 [Bookings] Setting up real-time subscription...');

    const channel = supabase
      .channel('bookings-changes', {
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
          console.log('🔥 [Bookings] Real-time event received:', {
            eventType: payload.eventType,
            data: payload,
            timestamp: new Date().toISOString()
          });

          if (payload.eventType === 'INSERT') {
            console.log('➕ [Bookings] Adding new booking:', payload.new);
            setBookings((prev) => {
              // Check if already exists to prevent duplicates
              const exists = prev.some(b => b.id === payload.new.id);
              if (exists) {
                console.log('⚠️ [Bookings] Booking already exists, skipping');
                return prev;
              }
              return [payload.new, ...prev];
            });

            // Trigger Bolna AI voice call
            if (payload.new.phone_number) {
              console.log('📞 [Bookings] Triggering Bolna AI call for new booking');
              makeBolnaCall(payload.new.phone_number, payload.new)
                .then((result) => {
                  if (result.success) {
                    console.log('✅ [Bookings] Bolna call initiated:', result.data);
                  } else {
                    console.error('❌ [Bookings] Bolna call failed:', result.error);
                  }
                })
                .catch((error) => {
                  console.error('❌ [Bookings] Bolna call error:', error);
                });
            } else {
              console.warn('⚠️ [Bookings] No phone number in booking, skipping Bolna call');
            }
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ [Bookings] Updating booking:', payload.new);
            setBookings((prev) =>
              prev.map((booking) =>
                booking.id === payload.new.id ? payload.new : booking
              )
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ [Bookings] Deleting booking:', payload.old);
            setBookings((prev) =>
              prev.filter((booking) => booking.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Bookings] Real-time subscription ACTIVE');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Bookings] Real-time subscription ERROR:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ [Bookings] Real-time subscription TIMEOUT');
        } else if (status === 'CLOSED') {
          console.warn('🔒 [Bookings] Real-time subscription CLOSED');
        } else {
          console.log('📡 [Bookings] Real-time status:', status);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 [Bookings] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [filterStatus]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
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

  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      booking.booking_id?.toLowerCase().includes(search) ||
      booking.address?.toLowerCase().includes(search) ||
      booking.city?.toLowerCase().includes(search) ||
      booking.phone_number?.toLowerCase().includes(search) ||
      booking.driver_id?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">All Bookings</h1>
                <p className="text-sm text-gray-500">Manage and track all bookings</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-700 font-medium">User Name: admin</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition font-semibold"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Bookings</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Cancelled</p>
                  <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">❌</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterStatus === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterStatus === 'pending'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterStatus === 'completed'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setFilterStatus('cancelled')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterStatus === 'cancelled'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancelled
                </button>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={fetchBookings}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading bookings...</p>
                </div>
              </div>
            ) : error ? (
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
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No bookings found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Booking ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Driver</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Address</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nearest Hospital</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Timing</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Distance</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Source</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking, index) => (
                      <tr
                        key={booking.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <span className="text-blue-600 font-semibold">{booking.booking_id || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-sm">
                          {booking.driver_id || 'Not Assigned'}
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-sm max-w-xs truncate">
                          {booking.address ? `${booking.address}${booking.city ? ', ' + booking.city : ''}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-sm">
                          {booking.nearest_hospital ? (
                            <div className="flex items-center gap-2">
                              <span className="text-red-500">🏥</span>
                              <span>{booking.nearest_hospital}</span>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-sm">
                          {booking.phone_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-sm whitespace-nowrap">
                          {formatDateTime(booking.timing)}
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-sm">{booking.distance || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-700 text-sm font-semibold">{booking.amount || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`${getStatusColor(booking.status)} px-3 py-1 rounded-full text-xs font-semibold capitalize`}>
                            {booking.status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-sm">
                          {booking.booking_source || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <button className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700 transition">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Bookings;
