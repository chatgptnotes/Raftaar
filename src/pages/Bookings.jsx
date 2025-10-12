import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabaseClient';
import { makeBolnaCall } from '../services/bolnaService';
import { autoAssignDriver, findNearestDrivers, assignDriverToBooking } from '../services/driverAssignment';
import { makeDriverCall } from '../services/bolnaService';
import DriverQueueStatus from '../components/DriverQueueStatus';

const Bookings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentResults, setAssignmentResults] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [nearestDrivers, setNearestDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [queueAcceptedDrivers, setQueueAcceptedDrivers] = useState({}); // Store accepted drivers from queue

  // Fetch accepted drivers from queue for all bookings
  const fetchQueueAcceptedDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_assignment_queue')
        .select(`
          booking_id,
          drivers:driver_id (
            id,
            first_name,
            last_name,
            vehicle_model,
            vehicle_number
          )
        `)
        .eq('status', 'accepted');

      if (error) throw error;

      // Create a map of booking_id -> driver info
      const acceptedMap = {};
      if (data && data.length > 0) {
        data.forEach(entry => {
          acceptedMap[entry.booking_id] = entry.drivers;
        });
      }
      setQueueAcceptedDrivers(acceptedMap);
    } catch (err) {
      console.error('Error fetching queue accepted drivers:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchQueueAcceptedDrivers();

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

            // Trigger Bolna AI voice call to victim
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

            // AUTOMATICALLY assign drivers after booking is created
            console.log('🚗 [Bookings] Auto-assigning drivers for new booking...');
            setTimeout(() => {
              autoAssignDriver(payload.new)
                .then((result) => {
                  if (result.success) {
                    console.log('✅ [Bookings] Auto-assignment successful:', result);
                  } else if (result.alreadyProcessing) {
                    console.log('⏭️ [Bookings] Skipping: Assignment already in progress');
                  } else if (result.alreadyAssigned) {
                    console.log('⏭️ [Bookings] Skipping: Driver already assigned');
                  } else {
                    console.error('❌ [Bookings] Auto-assignment failed:', result.message);
                  }
                })
                .catch((error) => {
                  console.error('❌ [Bookings] Auto-assignment error:', error);
                });
            }, 2000); // Wait 2 seconds after booking creation
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ [Bookings] Updating booking:', payload.new);

            // Check if driver_id or status changed - if yes, refetch to get driver join
            const oldBooking = bookings.find(b => b.id === payload.new.id);
            if (oldBooking && (oldBooking.driver_id !== payload.new.driver_id || oldBooking.status !== payload.new.status)) {
              console.log('🔄 [Bookings] Driver or status changed, refetching bookings...');
              fetchBookings();
            } else {
              // Just update the booking data without refetching
              setBookings((prev) =>
                prev.map((booking) =>
                  booking.id === payload.new.id ? { ...booking, ...payload.new } : booking
                )
              );
            }
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

    // Subscribe to driver queue changes
    const queueChannel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_assignment_queue'
        },
        (payload) => {
          console.log('🔥 [Queue] Real-time event received:', payload);
          // Refetch accepted drivers when queue changes
          fetchQueueAcceptedDrivers();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 [Bookings] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
      supabase.removeChannel(queueChannel);
    };
  }, [filterStatus]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('bookings')
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

  const handleBulkAutoAssign = async () => {
    try {
      setIsAssigning(true);
      setAssignmentResults(null);

      console.log('🚗🚗🚗 [Bulk Assignment] Starting bulk auto-assignment...');

      // Get all pending bookings without drivers
      const pendingBookings = bookings.filter(
        b => b.status === 'pending' && !b.driver_id
      );

      console.log(`📊 [Bulk Assignment] Found ${pendingBookings.length} pending bookings without drivers`);

      if (pendingBookings.length === 0) {
        console.log('ℹ️ [Bulk Assignment] Note: Bookings with drivers already assigned will be skipped');
      }

      if (pendingBookings.length === 0) {
        setAssignmentResults({
          success: true,
          message: 'No pending bookings to assign',
          assigned: 0,
          failed: 0
        });
        return;
      }

      let assigned = 0;
      let failed = 0;
      const failedBookings = [];

      // Assign drivers to each booking
      for (const booking of pendingBookings) {
        console.log(`\n🔄 [Bulk Assignment] Processing booking: ${booking.booking_id}`);

        const result = await autoAssignDriver(booking);

        if (result.success) {
          assigned++;
          console.log(`✅ [Bulk Assignment] Assigned driver to ${booking.booking_id}`);
        } else {
          failed++;
          failedBookings.push({ id: booking.booking_id, reason: result.message });
          console.log(`❌ [Bulk Assignment] Failed to assign driver to ${booking.booking_id}: ${result.message}`);
        }
      }

      // Show results
      setAssignmentResults({
        success: true,
        message: `Assigned ${assigned} drivers successfully, ${failed} failed`,
        assigned,
        failed,
        failedBookings
      });

      console.log(`\n✅ [Bulk Assignment] Complete! Assigned: ${assigned}, Failed: ${failed}`);

      // Refresh bookings to show updated data
      await fetchBookings();
    } catch (error) {
      console.error('❌ [Bulk Assignment] Error:', error);
      setAssignmentResults({
        success: false,
        message: 'Error during bulk assignment: ' + error.message
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSelectDriver = async (booking) => {
    try {
      setLoadingDrivers(true);
      setSelectedBooking(booking);
      setShowDriverModal(true);

      // Extract location from booking remarks
      let bookingLat, bookingLng;
      if (booking.remarks && booking.remarks.includes('Location:')) {
        const locationMatch = booking.remarks.match(/Location: ([-\d.]+), ([-\d.]+)/);
        if (locationMatch) {
          bookingLat = parseFloat(locationMatch[1]);
          bookingLng = parseFloat(locationMatch[2]);
        }
      }

      if (!bookingLat || !bookingLng) {
        console.warn('⚠️ No location data in booking');
        setNearestDrivers([]);
        setLoadingDrivers(false);
        return;
      }

      // Find nearest 3 drivers
      const drivers = await findNearestDrivers(bookingLat, bookingLng, 3);
      setNearestDrivers(drivers);
      setLoadingDrivers(false);
    } catch (error) {
      console.error('Error finding drivers:', error);
      setLoadingDrivers(false);
    }
  };

  const handleAssignDriver = async (driver) => {
    try {
      console.log('📝 [Manual Assignment] Assigning driver:', driver.first_name, driver.last_name);

      // Assign driver to booking
      await assignDriverToBooking(selectedBooking.id, driver.id, driver.distance);

      // Call driver
      const callResult = await makeDriverCall(
        driver.phone,
        driver,
        {
          booking_id: selectedBooking.booking_id,
          address: selectedBooking.address,
          city: selectedBooking.city,
          nearest_hospital: selectedBooking.nearest_hospital,
          distance: `${driver.distance.toFixed(2)} km`,
          phone_number: selectedBooking.phone_number
        }
      );

      if (callResult.success) {
        console.log('✅ Driver call initiated');
      }

      // Close modal and refresh
      setShowDriverModal(false);
      setSelectedBooking(null);
      setNearestDrivers([]);
      await fetchBookings();
    } catch (error) {
      console.error('Error assigning driver:', error);
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
      case 'assigned':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'in_progress':
        return 'bg-purple-100 text-purple-700';
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
                <button
                  onClick={handleBulkAutoAssign}
                  disabled={isAssigning}
                  className={`bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-2 rounded-lg transition font-semibold flex items-center gap-2 ${
                    isAssigning ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isAssigning ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <span>🚗</span>
                      Auto-Assign All
                    </>
                  )}
                </button>
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

            {/* Assignment Results Notification */}
            {assignmentResults && (
              <div className={`mt-4 p-4 rounded-lg border-l-4 ${
                assignmentResults.success && assignmentResults.assigned > 0
                  ? 'bg-green-50 border-green-500'
                  : assignmentResults.failed > 0
                  ? 'bg-yellow-50 border-yellow-500'
                  : 'bg-blue-50 border-blue-500'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {assignmentResults.success && assignmentResults.assigned > 0 ? (
                      <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <div>
                      <p className={`font-semibold ${
                        assignmentResults.success && assignmentResults.assigned > 0
                          ? 'text-green-700'
                          : assignmentResults.failed > 0
                          ? 'text-yellow-700'
                          : 'text-blue-700'
                      }`}>
                        {assignmentResults.message}
                      </p>
                      {assignmentResults.failedBookings && assignmentResults.failedBookings.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                            View failed bookings ({assignmentResults.failedBookings.length})
                          </summary>
                          <ul className="mt-2 space-y-1 text-sm text-gray-600">
                            {assignmentResults.failedBookings.map((fb, idx) => (
                              <li key={idx}>• {fb.id}: {fb.reason}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setAssignmentResults(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Call Status</th>
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
                      <React.Fragment key={booking.id}>
                        <tr
                          className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="px-6 py-4">
                            <span className="text-blue-600 font-semibold">{booking.booking_id || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-700 text-sm">
                            {booking.drivers ? (
                              <div>
                                <div className="font-semibold text-gray-800">
                                  {booking.drivers.first_name} {booking.drivers.last_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {booking.drivers.vehicle_model} ({booking.drivers.vehicle_number})
                                </div>
                              </div>
                            ) : queueAcceptedDrivers[booking.id] ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-green-600">✅</span>
                                  <span className="font-semibold text-green-800 text-xs">ACCEPTED</span>
                                </div>
                                <div className="font-semibold text-gray-800">
                                  {queueAcceptedDrivers[booking.id].first_name} {queueAcceptedDrivers[booking.id].last_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {queueAcceptedDrivers[booking.id].vehicle_model} ({queueAcceptedDrivers[booking.id].vehicle_number})
                                </div>
                                <div className="text-xs text-green-600 mt-1">
                                  Assigning...
                                </div>
                              </div>
                            ) : (
                              <span className="text-yellow-600 font-medium">Not Assigned</span>
                            )}
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
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {/* Victim Call Status */}
                            <div className="flex items-center gap-2">
                              {booking.victim_call_made ? (
                                <>
                                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                    booking.victim_call_status === 'success'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {booking.victim_call_status === 'success' ? '✓ Patient Called' : '✗ Call Failed'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                  No Call
                                </span>
                              )}
                            </div>
                            {/* Driver Call Status */}
                            {booking.driver_call_made && (
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                  booking.driver_call_status === 'success'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {booking.driver_call_status === 'success' ? '✓ Driver Called' : '✗ Driver Call Failed'}
                                </span>
                              </div>
                            )}
                          </div>
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
                          {!booking.driver_id ? (
                            <button
                              onClick={() => handleSelectDriver(booking)}
                              className="bg-green-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-green-700 transition"
                            >
                              Select Driver
                            </button>
                          ) : (
                            <button className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700 transition">
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Show driver queue status if booking is pending */}
                      {!booking.driver_id && booking.status === 'pending' && (
                        <tr className="bg-blue-50 border-b border-blue-200">
                          <td colSpan="12" className="px-6 py-3">
                            <DriverQueueStatus
                              bookingId={booking.id}
                              onStatusChange={() => fetchBookings()}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Driver Selection Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Select Driver</h3>
                  <p className="text-sm text-blue-100 mt-1">
                    Booking: {selectedBooking?.booking_id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDriverModal(false);
                    setSelectedBooking(null);
                    setNearestDrivers([]);
                  }}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Booking Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">Patient Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Address:</span>
                    <p className="font-medium">{selectedBooking?.address}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Hospital:</span>
                    <p className="font-medium">{selectedBooking?.nearest_hospital || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Driver List */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Nearest Available Drivers</h4>

                {loadingDrivers ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Finding nearest drivers...</p>
                  </div>
                ) : nearestDrivers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 text-lg">No available drivers found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {nearestDrivers.map((driver, index) => (
                      <div
                        key={driver.id}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                #{index + 1}
                              </span>
                              <h5 className="font-bold text-lg text-gray-800">
                                {driver.first_name} {driver.last_name}
                              </h5>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Distance:</span>
                                <p className="font-semibold text-green-600">
                                  {driver.distance.toFixed(2)} km
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600">Vehicle:</span>
                                <p className="font-medium">
                                  {driver.vehicle_model} ({driver.vehicle_number})
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600">Phone:</span>
                                <p className="font-medium">{driver.phone}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Service Type:</span>
                                <p className="font-medium">{driver.service_type || 'Standard'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="ml-4">
                            <button
                              onClick={() => handleAssignDriver(driver)}
                              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg"
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
