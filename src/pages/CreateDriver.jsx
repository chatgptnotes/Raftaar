import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

const CreateDriver = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 }); // Default: Delhi
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
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      // Update form data
      setFormData({ ...formData, [name]: file });

      // Update preview
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

        // Extract address components
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

        // Update map center and marker
        setMapCenter({ lat, lng });
        setMarkerPosition({ lat, lng });

        // Update form data
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
    setUploadProgress('Starting upload...');

    try {
      // Upload files to Supabase Storage
      setUploadProgress('Uploading profile image...');
      const profileImageUrl = await uploadFile(formData.profileImage, 'driver-files', 'profiles/');

      setUploadProgress('Uploading vehicle image...');
      const vehicleImageUrl = await uploadFile(formData.vehicleImage, 'driver-files', 'vehicles/');

      setUploadProgress('Uploading vehicle proof...');
      const vehicleProofUrl = await uploadFile(formData.vehicleProof, 'driver-files', 'proofs/vehicle/');

      setUploadProgress('Uploading driver proof...');
      const driverProofUrl = await uploadFile(formData.driverProof, 'driver-files', 'proofs/driver/');

      // Insert driver data into database
      setUploadProgress('Saving driver information...');
      const { data, error} = await supabase
        .from('drivers')
        .insert([
          {
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
            latitude: formData.location.lat,
            longitude: formData.location.lng,
            is_available: true,
            current_status: 'online',
          },
        ])
        .select();

      if (error) throw error;

      alert('Driver created successfully!');
      navigate('/dashboard/driver');
    } catch (error) {
      console.error('Error creating driver:', error);
      alert('Failed to create driver: ' + error.message);
    } finally {
      setLoading(false);
      setUploadProgress('');
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
                <h1 className="text-2xl font-bold text-gray-800">Create Driver</h1>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Driver</h2>

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
                  <p className="text-xs text-red-500 mt-1">(img-size.png)</p>
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
                  <p className="text-xs text-red-500 mt-1">(img-size.png)</p>
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
                  <p className="text-xs text-red-500 mt-1">(img-size.png)</p>
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
                  <p className="text-xs text-red-500 mt-1">(img-size.png)</p>
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
              <div className="flex justify-start">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <span className="animate-spin">⚙️</span>}
                  {loading ? 'Creating Driver...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateDriver;
