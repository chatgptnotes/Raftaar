import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

const EditDriver = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 });
  const [markerPosition, setMarkerPosition] = useState(null);

  // Image preview states
  const [imagePreviews, setImagePreviews] = useState({
    profileImage: null,
    vehicleImage: null,
    vehicleProof: null,
    driverProof: null,
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    profileImage: null,
    vehicleImage: null,
    vehicleProof: null,
    driverProof: null,
    serviceType: '',
    vehicleModel: '',
    vehicleNumber: '',
    address: '',
    city: '',
    pinCode: '',
    location: {
      lat: null,
      lng: null,
      formattedAddress: '',
    },
  });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    fetchDriverData();
  }, [id]);

  const fetchDriverData = async () => {
    try {
      setFetchLoading(true);
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          phone: data.phone || '',
          profileImage: null,
          vehicleImage: null,
          vehicleProof: null,
          driverProof: null,
          serviceType: data.service_type || '',
          vehicleModel: data.vehicle_model || '',
          vehicleNumber: data.vehicle_number || '',
          address: data.address || '',
          city: data.city || '',
          pinCode: data.pin_code || '',
          location: {
            lat: data.latitude,
            lng: data.longitude,
            formattedAddress: data.address || '',
          },
        });

        // Set existing images as previews
        setImagePreviews({
          profileImage: data.profile_image_url,
          vehicleImage: data.vehicle_image_url,
          vehicleProof: data.vehicle_proof_url,
          driverProof: data.driver_proof_url,
        });

        // Set map position if location exists
        if (data.latitude && data.longitude) {
          const pos = { lat: data.latitude, lng: data.longitude };
          setMapCenter(pos);
          setMarkerPosition(pos);
        }
      }
    } catch (error) {
      console.error('Error fetching driver:', error);
      alert('Failed to load driver data: ' + error.message);
      navigate('/dashboard/driver');
    } finally {
      setFetchLoading(false);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];

    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData({ ...formData, [name]: file });
      setImagePreviews({ ...imagePreviews, [name]: previewUrl });
    }
  };

  const onAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();

      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        let city = '';
        let pinCode = '';
        let address = place.formatted_address || '';

        place.address_components?.forEach((component) => {
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
          if (component.types.includes('postal_code')) {
            pinCode = component.long_name;
          }
        });

        setMapCenter({ lat, lng });
        setMarkerPosition({ lat, lng });

        setFormData({
          ...formData,
          address,
          city,
          pinCode,
          location: {
            lat,
            lng,
            formattedAddress: address,
          },
        });
      }
    }
  };

  const uploadFile = async (file, bucket, folder = '') => {
    if (!file) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress('Starting update...');

    try {
      // Upload new files if selected, otherwise keep existing URLs
      setUploadProgress('Uploading files...');

      const profileImageUrl = formData.profileImage
        ? await uploadFile(formData.profileImage, 'driver-files', 'profiles/')
        : imagePreviews.profileImage;

      const vehicleImageUrl = formData.vehicleImage
        ? await uploadFile(formData.vehicleImage, 'driver-files', 'vehicles/')
        : imagePreviews.vehicleImage;

      const vehicleProofUrl = formData.vehicleProof
        ? await uploadFile(formData.vehicleProof, 'driver-files', 'proofs/vehicle/')
        : imagePreviews.vehicleProof;

      const driverProofUrl = formData.driverProof
        ? await uploadFile(formData.driverProof, 'driver-files', 'proofs/driver/')
        : imagePreviews.driverProof;

      // Update driver data in database
      setUploadProgress('Updating driver information...');
      const { error } = await supabase
        .from('drivers')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          pin_code: formData.pinCode,
          vehicle_model: formData.vehicleModel,
          vehicle_number: formData.vehicleNumber,
          service_type: formData.serviceType,
          profile_image_url: profileImageUrl,
          vehicle_image_url: vehicleImageUrl,
          vehicle_proof_url: vehicleProofUrl,
          driver_proof_url: driverProofUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      alert('Driver updated successfully!');
      navigate('/dashboard/driver');
    } catch (error) {
      console.error('Error updating driver:', error);
      alert('Failed to update driver: ' + error.message);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🚗</div>
          <p className="text-gray-600">Loading driver data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 ml-64">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Edit Driver</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-700 font-medium">User Name: admin</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition font-semibold"
                >
                  Logout
                </button>
                <button
                  onClick={() => navigate('/dashboard/driver')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="p-8">
          <div className="bg-white rounded-2xl shadow-md p-8 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Driver Information</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Search for a place */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Search for a place</label>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                  >
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search location"
                      defaultValue={formData.address}
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Loading..."
                    disabled
                  />
                )}
              </div>

              {/* Google Map Display */}
              {isLoaded && markerPosition && (
                <div className="rounded-lg overflow-hidden border border-gray-300">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '400px' }}
                    center={mapCenter}
                    zoom={15}
                  >
                    <Marker position={markerPosition} />
                  </GoogleMap>
                </div>
              )}

              {/* First Name and Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter First Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Last Name"
                    required
                  />
                </div>
              </div>

              {/* Phone and Profile Image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Phone"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Profile Image
                  </label>
                  <input
                    type="file"
                    name="profileImage"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept="image/*"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing image</p>
                  {imagePreviews.profileImage && (
                    <div className="mt-3">
                      <img
                        src={imagePreviews.profileImage}
                        alt="Profile Preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Image and Vehicle Proof */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Vehicle Image
                  </label>
                  <input
                    type="file"
                    name="vehicleImage"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept="image/*"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing image</p>
                  {imagePreviews.vehicleImage && (
                    <div className="mt-3">
                      <img
                        src={imagePreviews.vehicleImage}
                        alt="Vehicle Preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-blue-500"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Vehicle Proof
                  </label>
                  <input
                    type="file"
                    name="vehicleProof"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept="image/*"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing image</p>
                  {imagePreviews.vehicleProof && (
                    <div className="mt-3">
                      <img
                        src={imagePreviews.vehicleProof}
                        alt="Vehicle Proof Preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Driver Proof and Service Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Driver Proof
                  </label>
                  <input
                    type="file"
                    name="driverProof"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept="image/*"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing image</p>
                  {imagePreviews.driverProof && (
                    <div className="mt-3">
                      <img
                        src={imagePreviews.driverProof}
                        alt="Driver Proof Preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-blue-500"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Service Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Ambulance</option>
                    <option value="basic">Basic Ambulance</option>
                    <option value="advanced">Advanced Life Support</option>
                    <option value="icu">ICU Ambulance</option>
                    <option value="nicu">NICU Ambulance</option>
                  </select>
                </div>
              </div>

              {/* Vehicle Model and Vehicle Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Vehicle Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Vehicle Model"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Vehicle Number (MH04SH3414/DL94MRM6/J029X9A) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Vehicle Number"
                    required
                  />
                </div>
              </div>

              {/* Address and City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Address"
                    required
                  ></textarea>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter City"
                    required
                  />
                </div>
              </div>

              {/* Pin Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Pin Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pinCode"
                    value={formData.pinCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Pin Code"
                    maxLength="6"
                    required
                  />
                </div>
              </div>

              {/* Upload Progress */}
              {uploadProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700 font-semibold">{uploadProgress}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-start gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <span className="animate-spin">⚙️</span>}
                  {loading ? 'Updating Driver...' : 'Update Driver'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/driver')}
                  className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditDriver;
