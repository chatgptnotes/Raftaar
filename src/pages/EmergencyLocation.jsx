import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { supabase } from '../lib/supabase';
import logo from '../assets/raftaar_seva_logo.png';

const libraries = ['places'];

const EmergencyLocation = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [mobile, setMobile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [nearestHospital, setNearestHospital] = useState(null);
  const [hospitalPhone, setHospitalPhone] = useState(null);
  const [hospitalWebsite, setHospitalWebsite] = useState(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Fetch hospital when location is set and API is loaded
  useEffect(() => {
    console.log('==========================================');
    console.log('🔄 [HOSPITAL SEARCH] useEffect TRIGGERED');
    console.log('📊 [HOSPITAL SEARCH] isLoaded:', isLoaded);
    console.log('📍 [HOSPITAL SEARCH] userLocation:', userLocation);
    console.log('🌍 [HOSPITAL SEARCH] window.google:', !!window.google);
    console.log('🗺️ [HOSPITAL SEARCH] window.google.maps:', !!window.google?.maps);
    console.log('📍 [HOSPITAL SEARCH] window.google.maps.places:', !!window.google?.maps?.places);
    console.log('==========================================');

    if (!isLoaded) {
      console.log('⏳ [HOSPITAL SEARCH] Waiting for Google Maps API to load...');
      return;
    }

    if (!userLocation) {
      console.log('📍 [HOSPITAL SEARCH] No user location set yet');
      return;
    }

    // Check if Google Maps API is properly loaded
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('❌ [HOSPITAL SEARCH] Google Maps Places API not available in window object');
      console.error('   window.google exists:', !!window.google);
      console.error('   window.google.maps exists:', !!window.google?.maps);
      console.error('   window.google.maps.places exists:', !!window.google?.maps?.places);
      return;
    }

    console.log('✅ [HOSPITAL SEARCH] All conditions met! Starting search...');
    console.log('🏥 [HOSPITAL SEARCH] Location:', userLocation);

    const location = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
    const service = new window.google.maps.places.PlacesService(document.createElement('div'));

    // Search with increasing radius: 5km -> 10km -> 20km -> 30km
    const searchWithRadius = (radiusIndex = 0) => {
      const radiuses = [5000, 10000, 20000, 30000];

      if (radiusIndex >= radiuses.length) {
        console.log('❌ No hospitals found within 30km');
        setNearestHospital('No hospital found nearby');
        setHospitalPhone('N/A');
        return;
      }

      const currentRadius = radiuses[radiusIndex];
      console.log(`🔍 Searching for hospitals within ${currentRadius / 1000}km...`);

      const request = {
        location: location,
        radius: currentRadius,
        type: 'hospital'
      };

      service.nearbySearch(request, (results, status) => {
        console.log(`📊 Search at ${currentRadius / 1000}km - Status:`, status);

        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          const hospital = results[0];
          console.log('✅ Nearest hospital found:', hospital.name);
          setNearestHospital(hospital.name);

          // Get place details for phone number and website
          if (hospital.place_id) {
            const detailsRequest = {
              placeId: hospital.place_id,
              fields: ['formatted_phone_number', 'international_phone_number', 'website', 'url']
            };

            service.getDetails(detailsRequest, (place, detailsStatus) => {
              console.log('📞 Place details status:', detailsStatus);
              console.log('📊 Available fields:', place);

              if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                // Try formatted_phone_number first, then international_phone_number
                if (place.formatted_phone_number) {
                  console.log('✅ Hospital formatted phone found:', place.formatted_phone_number);
                  setHospitalPhone(place.formatted_phone_number);
                } else if (place.international_phone_number) {
                  console.log('✅ Hospital international phone found:', place.international_phone_number);
                  setHospitalPhone(place.international_phone_number);
                } else {
                  console.log('⚠️ No phone number available');
                  setHospitalPhone('Not Available');
                }

                // Store website if available
                if (place.website) {
                  console.log('🌐 Hospital website found:', place.website);
                  setHospitalWebsite(place.website);
                } else if (place.url) {
                  console.log('🌐 Hospital Google Maps URL found:', place.url);
                  setHospitalWebsite(place.url);
                } else {
                  console.log('⚠️ No website available');
                  setHospitalWebsite(null);
                }
              }
            });
          }
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          console.log(`⚠️ No hospitals at ${currentRadius / 1000}km, trying larger radius...`);
          searchWithRadius(radiusIndex + 1);
        } else {
          console.error('❌ Places API error:', status);
        }
      });
    };

    searchWithRadius(0);
  }, [isLoaded, userLocation]);

  // Default center (India)
  const defaultCenter = {
    lat: 20.5937,
    lng: 78.9629
  };

  const mapContainerStyle = {
    width: '100%',
    height: '100%'
  };

  // Standalone function to search nearby hospitals
  const searchNearbyHospitals = (lat, lng) => {
    console.log('🏥🏥🏥 [DIRECT CALL] searchNearbyHospitals called with:', lat, lng);

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('❌ [DIRECT CALL] Google Maps Places API not available');
      return;
    }

    console.log('✅ [DIRECT CALL] Google Maps API available, starting search...');

    const location = new window.google.maps.LatLng(lat, lng);
    const service = new window.google.maps.places.PlacesService(document.createElement('div'));

    // Try distance-based search first (returns closest hospital)
    console.log('🎯 [DIRECT CALL] Attempting DISTANCE-BASED search (closest hospital)...');

    const distanceRequest = {
      location: location,
      rankBy: window.google.maps.places.RankBy.DISTANCE,
      type: 'hospital'
      // Note: Cannot use 'radius' with rankBy.DISTANCE
    };

    service.nearbySearch(distanceRequest, (results, status) => {
      console.log('📊 [DIRECT CALL] Distance-based search status:', status);

      if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
        const hospital = results[0];
        console.log('✅ [DIRECT CALL] CLOSEST hospital found:', hospital.name);
        console.log('📍 [DIRECT CALL] Hospital address:', hospital.vicinity);
        setNearestHospital(hospital.name);

        // Get place details for phone number and website
        if (hospital.place_id) {
          const detailsRequest = {
            placeId: hospital.place_id,
            fields: ['formatted_phone_number', 'international_phone_number', 'website', 'url', 'formatted_address']
          };

          service.getDetails(detailsRequest, (place, detailsStatus) => {
            console.log('📞 [DIRECT CALL] Place details status:', detailsStatus);
            console.log('📊 [DIRECT CALL] Available fields:', {
              formatted_phone: place?.formatted_phone_number,
              intl_phone: place?.international_phone_number,
              website: place?.website,
              url: place?.url
            });

            if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
              // Try formatted_phone_number first, then international_phone_number
              if (place.formatted_phone_number) {
                console.log('✅ [DIRECT CALL] Hospital formatted phone found:', place.formatted_phone_number);
                setHospitalPhone(place.formatted_phone_number);
              } else if (place.international_phone_number) {
                console.log('✅ [DIRECT CALL] Hospital international phone found:', place.international_phone_number);
                setHospitalPhone(place.international_phone_number);
              } else {
                console.log('⚠️ [DIRECT CALL] No phone number available');
                setHospitalPhone('Not Available');
              }

              // Store website if available
              if (place.website) {
                console.log('🌐 [DIRECT CALL] Hospital website found:', place.website);
                setHospitalWebsite(place.website);
              } else if (place.url) {
                console.log('🌐 [DIRECT CALL] Hospital Google Maps URL found:', place.url);
                setHospitalWebsite(place.url);
              } else {
                console.log('⚠️ [DIRECT CALL] No website available');
                setHospitalWebsite(null);
              }
            }
          });
        }
      } else {
        // Fallback: Try radius-based search if distance-based fails
        console.warn('⚠️ [DIRECT CALL] Distance-based search failed, falling back to radius-based...');
        searchWithRadiusFallback(location, service);
      }
    });
  };

  // Fallback: Radius-based search with progressive expansion
  const searchWithRadiusFallback = (location, service) => {
    const searchWithRadius = (radiusIndex = 0) => {
      const radiuses = [5000, 10000, 20000, 30000, 50000]; // 5km, 10km, 20km, 30km, 50km

      if (radiusIndex >= radiuses.length) {
        console.log('❌ [FALLBACK] No hospitals found within 50km');
        setNearestHospital('No hospital found nearby');
        setHospitalPhone('N/A');
        return;
      }

      const currentRadius = radiuses[radiusIndex];
      console.log(`🔍 [FALLBACK] Searching within ${currentRadius / 1000}km radius...`);

      const request = {
        location: location,
        radius: currentRadius,
        type: 'hospital'
      };

      service.nearbySearch(request, (results, status) => {
        console.log(`📊 [FALLBACK] Search at ${currentRadius / 1000}km - Status:`, status);

        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          const hospital = results[0];
          console.log('✅ [FALLBACK] Hospital found:', hospital.name);
          setNearestHospital(hospital.name);

          // Get phone number and website
          if (hospital.place_id) {
            const detailsRequest = {
              placeId: hospital.place_id,
              fields: ['formatted_phone_number', 'international_phone_number', 'website', 'url']
            };

            service.getDetails(detailsRequest, (place, detailsStatus) => {
              console.log('📞 [FALLBACK] Place details status:', detailsStatus);
              console.log('📊 [FALLBACK] Available fields:', {
                formatted_phone: place?.formatted_phone_number,
                intl_phone: place?.international_phone_number,
                website: place?.website,
                url: place?.url
              });

              if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                // Try formatted_phone_number first, then international_phone_number
                if (place.formatted_phone_number) {
                  console.log('✅ [FALLBACK] Hospital formatted phone found:', place.formatted_phone_number);
                  setHospitalPhone(place.formatted_phone_number);
                } else if (place.international_phone_number) {
                  console.log('✅ [FALLBACK] Hospital international phone found:', place.international_phone_number);
                  setHospitalPhone(place.international_phone_number);
                } else {
                  console.log('⚠️ [FALLBACK] No phone number available');
                  setHospitalPhone('Not Available');
                }

                // Store website if available
                if (place.website) {
                  console.log('🌐 [FALLBACK] Hospital website found:', place.website);
                  setHospitalWebsite(place.website);
                } else if (place.url) {
                  console.log('🌐 [FALLBACK] Hospital Google Maps URL found:', place.url);
                  setHospitalWebsite(place.url);
                } else {
                  console.log('⚠️ [FALLBACK] No website available');
                  setHospitalWebsite(null);
                }
              }
            });
          }
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          console.log(`⚠️ [FALLBACK] No hospitals at ${currentRadius / 1000}km, trying larger radius...`);
          searchWithRadius(radiusIndex + 1);
        } else {
          console.error('❌ [FALLBACK] Places API error:', status);
        }
      });
    };

    searchWithRadius(0);
  };

  const handleAllowLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('📍 [LOCATION] User location obtained:', latitude, longitude);

          setUserLocation({ lat: latitude, lng: longitude });
          setLocationGranted(true);
          setShowModal(false);

          // Reverse geocode using Google Geocoding API
          reverseGeocode(latitude, longitude);

          // Search for nearby hospitals directly
          console.log('🏥 [LOCATION] Calling searchNearbyHospitals directly...');
          if (isLoaded) {
            searchNearbyHospitals(latitude, longitude);
          } else {
            console.warn('⚠️ [LOCATION] Google Maps not loaded yet, will try via useEffect');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setShowModal(false);
          // Set default location instead of showing alert
          setUserLocation(defaultCenter);
          setLocationGranted(true);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
      setShowModal(false);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results[0]) {
        const result = data.results[0];
        setAddress(result.formatted_address);

        // Extract city and pincode from address components
        result.address_components.forEach(component => {
          if (component.types.includes('locality')) {
            setCity(component.long_name);
          }
          if (component.types.includes('postal_code')) {
            setPincode(component.long_name);
          }
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  // Handle marker drag
  const handleMarkerDragEnd = (e) => {
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();

    console.log('📍 [MARKER DRAG] New location:', newLat, newLng);
    setUserLocation({ lat: newLat, lng: newLng });
    reverseGeocode(newLat, newLng);

    // Search for nearby hospitals directly
    if (isLoaded) {
      searchNearbyHospitals(newLat, newLng);
    }
  };

  // Handle map click
  const handleMapClick = (e) => {
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();

    console.log('📍 [MAP CLICK] New location:', newLat, newLng);
    setUserLocation({ lat: newLat, lng: newLng });
    setLocationGranted(true);
    reverseGeocode(newLat, newLng);

    // Search for nearby hospitals directly
    if (isLoaded) {
      searchNearbyHospitals(newLat, newLng);
    }
  };

  const handleDeny = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset error and success states
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);

    try {
      // Generate a unique booking ID using timestamp
      const bookingId = `EMG-${Date.now()}`;

      // Prepare the data to insert
      const bookingData = {
        booking_id: bookingId,
        address: address,
        city: city,
        pincode: pincode,
        phone_number: mobile,
        status: 'pending',
        nearest_hospital: nearestHospital,
        hospital_phone: hospitalPhone,
        hospital_website: hospitalWebsite,
        // Store location coordinates in remarks
        remarks: userLocation
          ? `Location: ${userLocation.lat}, ${userLocation.lng}`
          : null
      };

      // Insert data into Supabase
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select();

      if (error) {
        throw error;
      }

      // Success! Show success message
      setSubmitSuccess(true);
      console.log('Booking created successfully:', data);

      // No automatic reset - user must refresh page for new request

    } catch (error) {
      console.error('Error submitting emergency request:', error);
      setSubmitError(error.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Navbar */}
      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Raftaar Seva Logo"
                className="h-12 sm:h-14 md:h-16 w-auto object-contain"
              />
              <div className="hidden lg:block">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 leading-tight">
                  Raftaar Help Emergency Seva
                </h1>
                <p className="text-xs text-blue-600 mt-0.5">Real-Time Emergency Response System</p>
              </div>
            </div>

            {/* Emergency Badge */}
            <div className="flex items-center gap-3">
              <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
                EMERGENCY
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Location Permission Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6 md:p-8 animate-fadeIn">
          <div className="relative bg-gradient-to-br from-white via-white to-red-50 rounded-3xl shadow-2xl max-w-[90%] xs:max-w-sm sm:max-w-md w-full p-6 sm:p-8 md:p-10 transform animate-scaleIn border-2 border-red-100/50 overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/10 to-orange-400/10 rounded-full blur-3xl -z-0"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-400/10 to-purple-400/10 rounded-full blur-3xl -z-0"></div>

            <div className="relative z-10">
              {/* Icon Section */}
              <div className="text-center mb-6 sm:mb-8">
                <div className="relative inline-block mb-4 sm:mb-6">
                  {/* Animated Ring */}
                  <div className="absolute inset-0 w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-r from-red-400 to-orange-400 rounded-full blur-xl opacity-30 animate-pulse-slow"></div>

                  {/* Main Icon Container */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-red-400 via-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse-slow border-4 border-white">
                    <span className="text-5xl sm:text-6xl animate-bounce-slow filter drop-shadow-lg">📍</span>
                  </div>

                  {/* Pulsing Rings */}
                  <div className="absolute -inset-2 border-4 border-red-300/40 rounded-full animate-ping"></div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-500 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-3 sm:mb-4 leading-tight">
                  Allow Location Access
                </h2>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed px-2">
                  We need your location to confirm the emergency. Please allow access for better assistance.
                </p>
              </div>

              {/* Buttons Section */}
              <div className="space-y-3 sm:space-y-4">
                {/* Allow Button */}
                <button
                  onClick={handleAllowLocation}
                  className="group relative w-full bg-gradient-to-r from-red-500 via-red-600 to-orange-500 hover:from-red-600 hover:via-red-700 hover:to-orange-600 text-white font-bold py-4 sm:py-5 px-6 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                >
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  </div>

                  {/* Button Content */}
                  <span className="relative flex items-center justify-center gap-2 text-base sm:text-lg">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Allow Location
                  </span>

                  {/* Glow Effect */}
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity animate-glow"></div>
                </button>

                {/* Deny Button */}
                <button
                  onClick={handleDeny}
                  className="group relative w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold py-4 sm:py-5 px-6 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border border-gray-300/50"
                >
                  <span className="relative flex items-center justify-center gap-2 text-base sm:text-lg">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Deny
                  </span>
                </button>
              </div>

              {/* Security Badge */}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200/60">
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-500">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Your data is secure & private</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Section */}
      <div className="px-2 mt-2 sm:px-3 sm:mt-3 md:px-4 md:mt-4 lg:px-6 lg:mt-5">
        <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[400px] overflow-hidden rounded-lg shadow-md">
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-red-600 font-semibold text-lg">Error loading maps</p>
              <p className="text-red-500 text-sm mt-2">Please check your internet connection</p>
            </div>
          </div>
        )}

        {!isLoaded && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
            <div className="text-center">
              <div className="animate-spin text-6xl mb-4">🗺️</div>
              <p className="text-blue-800 font-semibold text-lg">Loading maps...</p>
            </div>
          </div>
        )}

        {isLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={userLocation || defaultCenter}
            zoom={userLocation ? 15 : 5}
            onClick={handleMapClick}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
              disableDefaultUI: false,
              zoomControlOptions: {
                position: 9, // RIGHT_BOTTOM
              },
              fullscreenControlOptions: {
                position: 9, // RIGHT_BOTTOM
              },
              styles: [
                {
                  featureType: 'poi',
                  elementType: 'labels',
                  stylers: [{ visibility: 'on' }],
                },
              ],
            }}
          >
            {userLocation && (
              <Marker
                position={userLocation}
                draggable={true}
                onDragEnd={handleMarkerDragEnd}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new window.google.maps.Size(50, 50),
                }}
                animation={window.google.maps.Animation.DROP}
                title="Drag to change location"
              />
            )}
          </GoogleMap>
        )}

        {locationGranted && userLocation && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/95 backdrop-blur-md px-2 py-1.5 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl shadow-lg sm:shadow-2xl z-10 border border-blue-100">
            <p className="text-[10px] sm:text-xs text-blue-600 font-semibold mb-0.5 sm:mb-1">📍 Location</p>
            <p className="text-[9px] sm:text-xs text-gray-500">
              {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </p>
          </div>
        )}

        {!locationGranted && !showModal && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-300 px-5 py-3 rounded-xl shadow-lg z-10">
            <p className="text-sm text-yellow-800 font-semibold">⚠️ Location access required for better service</p>
          </div>
        )}

        {locationGranted && (
          <div className="hidden md:block absolute bottom-4 left-4 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-lg z-10 text-sm max-w-xs">
            <p className="font-semibold mb-1">💡 Quick Tip:</p>
            <p className="text-xs">Drag the red marker or click anywhere on the map to adjust your location</p>
          </div>
        )}
        </div>
      </div>

      {/* Mobile Tip - Below Map */}
      {locationGranted && (
        <div className="md:hidden px-4 mt-3">
          <div className="bg-blue-50 border-l-4 border-blue-600 px-4 py-3 rounded-r-lg">
            <p className="text-sm text-blue-900 font-semibold mb-1">💡 Quick Tip:</p>
            <p className="text-xs text-blue-800">Drag the red marker or click anywhere on the map to adjust your location</p>
          </div>
        </div>
      )}

      {/* Form Section */}
      <div className="container mx-auto px-0 sm:px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Form Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 border border-gray-100">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl sm:text-2xl">📋</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
                Confirm Your Emergency Location
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Address */}
              <div className="group">
                <label className="block text-gray-700 font-semibold mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your full address"
                  className="w-full px-4 py-3 sm:px-5 sm:py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 focus:bg-white text-sm sm:text-base"
                  required
                />
              </div>

              {/* City and Pincode Row */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* City */}
                <div className="group">
                  <label className="block text-gray-700 font-semibold mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter your city"
                    className="w-full px-4 py-3 sm:px-5 sm:py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 focus:bg-white text-sm sm:text-base"
                    required
                  />
                </div>

                {/* Pincode */}
                <div className="group">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Enter pincode"
                    maxLength="6"
                    className="w-full px-4 py-3 sm:px-5 sm:py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 focus:bg-white text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="group">
                <label className="block text-gray-700 font-semibold mb-2">
                  Mobile Number
                </label>
                <PhoneInput
                  country={'in'}
                  value={mobile}
                  onChange={(phone) => setMobile(phone)}
                  inputClass="phone-input-custom"
                  containerClass="phone-container-custom"
                  buttonClass="phone-button-custom"
                  dropdownClass="phone-dropdown-custom"
                  placeholder="Enter your mobile number"
                  enableSearch={true}
                  searchPlaceholder="Search country"
                  inputProps={{
                    required: true,
                  }}
                />
              </div>

              {/* Success Message */}
              {submitSuccess && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-green-700 font-semibold">
                        Emergency request submitted successfully! We'll contact you shortly.
                      </p>
                      <p className="text-green-600 text-sm mt-1">
                        To submit another request, please refresh the page.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-700 font-semibold">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || submitSuccess}
                className={`w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 sm:py-4 md:py-5 rounded-xl text-base sm:text-lg transition transform hover:scale-105 flex items-center justify-center gap-3 ${
                  isSubmitting || submitSuccess ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Emergency Request'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-800 via-blue-900 to-blue-950 py-8 sm:py-10 md:py-12 mt-16 shadow-2xl">
        <div className="container mx-auto px-6 sm:px-8 md:px-10">
          {/* Grid Container for Contact and Join Our Team */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-8 md:mb-0">
            {/* Contact Section */}
            <div>
              <h3 className="text-blue-300 font-bold text-xl sm:text-2xl mb-4 sm:mb-6">Contact</h3>

              <div className="space-y-3 sm:space-y-4 text-white">
                {/* Phone */}
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-base sm:text-lg">8412030400</span>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-base sm:text-lg">support@emergencyseva.in</span>
                </div>

                {/* Address */}
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-300 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm sm:text-base leading-relaxed">
                    Emergency Seva office is at 701, Casa royal apartment, Mohan nagar, Nagpur and feel free to visit us for any assistance.
                  </p>
                </div>
              </div>
            </div>

            {/* Join Our Team Section */}
            <div>
              <h3 className="text-blue-300 font-bold text-xl sm:text-2xl mb-3 sm:mb-4">Join Our Team</h3>
              <p className="text-white text-sm sm:text-base leading-relaxed">
                At Emergency Seva, your safety and satisfaction are our top priorities. Whether you need emergency assistance, have a general inquiry, or want to provide feedback, we're just a call or message away.
              </p>
            </div>
          </div>

          {/* Copyright Section */}
          <div className="mt-8 pt-6 border-t border-blue-700">
            <p className="text-white text-center text-sm">
              © 2025 Created By <span className="font-semibold">Drm Software Pvt Ltd</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EmergencyLocation;
