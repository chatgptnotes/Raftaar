import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import { sendLocationToDriver } from '../services/doubletickService';

const Driver = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [driverData, setDriverData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(null); // Track which driver is being sent WhatsApp
  const [whatsappSuccess, setWhatsappSuccess] = useState(null);
  const [whatsappError, setWhatsappError] = useState(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDriverData(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (driver) => {
    setSelectedDriver(driver);
    setShowViewModal(true);
  };

  const handleEdit = (driverId) => {
    navigate(`/dashboard/driver/edit/${driverId}`);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh the list
      fetchDrivers();
      alert('Driver deleted successfully!');
    } catch (error) {
      console.error('Error deleting driver:', error);
      alert('Failed to delete driver: ' + error.message);
    }
  };

  const filteredDrivers = driverData.filter((driver) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      driver.first_name?.toLowerCase().includes(searchLower) ||
      driver.last_name?.toLowerCase().includes(searchLower) ||
      driver.id?.toLowerCase().includes(searchLower)
    );
  });

  const handleSendWhatsApp = async (driver) => {
    try {
      setSendingWhatsApp(driver.id);
      setWhatsappError(null);
      setWhatsappSuccess(null);

      // Fetch the latest pending booking
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (bookingError) throw bookingError;

      if (!bookings || bookings.length === 0) {
        setWhatsappError('No pending bookings found to send');
        setSendingWhatsApp(null);
        setTimeout(() => setWhatsappError(null), 5000);
        return;
      }

      const booking = bookings[0];

      // Send WhatsApp message
      const result = await sendLocationToDriver(driver.phone, booking);

      if (result.success) {
        setWhatsappSuccess(`WhatsApp sent to ${driver.first_name} ${driver.last_name}`);
        setTimeout(() => setWhatsappSuccess(null), 5000);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      setWhatsappError(error.message || 'Failed to send WhatsApp message');
      setTimeout(() => setWhatsappError(null), 5000);
    } finally {
      setSendingWhatsApp(null);
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 ml-64">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Driver Management</h1>
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

        {/* Main Content */}
        <main className="p-8">
          {/* WhatsApp Success Message */}
          {whatsappSuccess && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-700 font-semibold">{whatsappSuccess}</p>
              </div>
            </div>
          )}

          {/* WhatsApp Error Message */}
          {whatsappError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-semibold">{whatsappError}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Driver Data</h2>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Search by First Name or ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
                />
                <button
                  onClick={() => navigate('/dashboard/driver/create')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Create Driver
                </button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin text-6xl mb-4">🚗</div>
                  <p className="text-gray-600">Loading drivers...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600 font-semibold">Error loading drivers</p>
                <p className="text-red-500 text-sm mt-2">{error}</p>
                <button
                  onClick={fetchDrivers}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ) : driverData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No drivers found</p>
                <button
                  onClick={() => navigate('/dashboard/driver/create')}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create First Driver
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Id</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Full Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vehicle</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-4 text-gray-600">{driver.id}</td>
                        <td className="px-4 py-4 text-gray-800 font-medium">
                          {driver.first_name} {driver.last_name}
                        </td>
                        <td className="px-4 py-4 text-gray-600 text-sm">{driver.email || '-'}</td>
                        <td className="px-4 py-4 text-gray-600">{driver.phone}</td>
                        <td className="px-4 py-4 text-gray-600">{driver.address || '-'}</td>
                        <td className="px-4 py-4 text-gray-600 text-sm">
                          {driver.vehicle_model} ({driver.vehicle_number})
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSendWhatsApp(driver)}
                              disabled={sendingWhatsApp === driver.id}
                              className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-green-700 transition font-semibold disabled:bg-green-400 disabled:cursor-not-allowed flex items-center gap-1"
                              title="Send location via WhatsApp"
                            >
                              {sendingWhatsApp === driver.id ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                  </svg>
                                  WhatsApp
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleView(driver)}
                              className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-600 transition font-semibold"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEdit(driver.id)}
                              className="bg-orange-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-orange-600 transition font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(driver.id)}
                              className="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-600 transition font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition">
                &lt;
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition">
                &gt;
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* View Modal */}
      {showViewModal && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">Driver Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">First Name</p>
                    <p className="text-base font-medium text-gray-900">{selectedDriver.first_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Name</p>
                    <p className="text-base font-medium text-gray-900">{selectedDriver.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-base font-medium text-gray-900">{selectedDriver.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service Type</p>
                    <p className="text-base font-medium text-gray-900 capitalize">{selectedDriver.service_type}</p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <p className="text-sm text-gray-600">Full Address</p>
                    <p className="text-base font-medium text-gray-900">{selectedDriver.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="text-base font-medium text-gray-900">{selectedDriver.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pin Code</p>
                    <p className="text-base font-medium text-gray-900">{selectedDriver.pin_code || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Vehicle Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Vehicle Model</p>
                    <p className="text-base font-medium text-gray-900">{selectedDriver.vehicle_model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vehicle Number</p>
                    <p className="text-base font-medium text-gray-900">{selectedDriver.vehicle_number}</p>
                  </div>
                </div>
              </div>

              {/* Images */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Images & Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Profile Image */}
                  {selectedDriver.profile_image_url && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Profile Image</p>
                      <img
                        src={selectedDriver.profile_image_url}
                        alt="Profile"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                      />
                    </div>
                  )}

                  {/* Vehicle Image */}
                  {selectedDriver.vehicle_image_url && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Vehicle Image</p>
                      <img
                        src={selectedDriver.vehicle_image_url}
                        alt="Vehicle"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                      />
                    </div>
                  )}

                  {/* Vehicle Proof */}
                  {selectedDriver.vehicle_proof_url && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Vehicle Proof</p>
                      <img
                        src={selectedDriver.vehicle_proof_url}
                        alt="Vehicle Proof"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                      />
                    </div>
                  )}

                  {/* Driver Proof */}
                  {selectedDriver.driver_proof_url && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Driver Proof</p>
                      <img
                        src={selectedDriver.driver_proof_url}
                        alt="Driver Proof"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowViewModal(false)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(selectedDriver.id);
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Edit Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Driver;
