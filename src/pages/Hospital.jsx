import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import Sidebar from '../components/Sidebar';

const libraries = ['places'];

const Hospital = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);

  const mapContainerStyle = {
    width: '100%',
    height: '600px',
    borderRadius: '12px',
  };

  // Default center (Delhi)
  const defaultCenter = {
    lat: 28.6139,
    lng: 77.2090,
  };

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Fetch nearby hospitals using Google Places API
  const fetchNearbyHospitals = useCallback((location, mapInstance) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('Google Maps Places API not loaded');
      setLoading(false);
      return;
    }

    const service = new window.google.maps.places.PlacesService(mapInstance || map);

    const request = {
      location: new window.google.maps.LatLng(location.lat, location.lng),
      radius: 5000, // 5km radius
      type: 'hospital',
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setNearbyHospitals(results);
      } else {
        console.error('Places API error:', status);
      }
      setLoading(false);
    });
  }, [map]);

  // Get user's current location
  useEffect(() => {
    if (!isLoaded) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation(defaultCenter);
        }
      );
    } else {
      setUserLocation(defaultCenter);
    }
  }, [isLoaded]);

  // Fetch hospitals when map and location are ready
  useEffect(() => {
    if (map && userLocation && isLoaded) {
      fetchNearbyHospitals(userLocation, map);
    }
  }, [map, userLocation, isLoaded, fetchNearbyHospitals]);

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Map</h2>
            <p className="text-red-700">
              Failed to load Google Maps. Please check your API key configuration.
            </p>
            <p className="text-red-600 text-sm mt-2">
              Make sure you have set VITE_GOOGLE_MAPS_API_KEY in your .env file
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Google Maps...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Nearby Hospitals</h1>
              <p className="text-gray-600">
                Find the nearest hospitals and emergency medical facilities
              </p>
            </div>
            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
              <div className="text-sm font-medium">Emergency</div>
              <div className="text-2xl font-bold">108</div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={userLocation || defaultCenter}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
          >
            {/* User Location Marker */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                }}
                title="Your Location"
              />
            )}

            {/* Hospital Markers */}
            {nearbyHospitals.map((hospital, index) => (
              <Marker
                key={index}
                position={{
                  lat: hospital.geometry.location.lat(),
                  lng: hospital.geometry.location.lng(),
                }}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                }}
                onClick={() => setSelectedHospital(hospital)}
              />
            ))}

            {/* Info Window for selected hospital */}
            {selectedHospital && (
              <InfoWindow
                position={{
                  lat: selectedHospital.geometry.location.lat(),
                  lng: selectedHospital.geometry.location.lng(),
                }}
                onCloseClick={() => setSelectedHospital(null)}
              >
                <div className="p-2">
                  <h3 className="font-bold text-gray-800 mb-1">
                    {selectedHospital.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {selectedHospital.vicinity}
                  </p>
                  {selectedHospital.rating && (
                    <p className="text-sm text-yellow-600">
                      ⭐ {selectedHospital.rating} ({selectedHospital.user_ratings_total} reviews)
                    </p>
                  )}
                  {selectedHospital.opening_hours && (
                    <p className="text-sm mt-1">
                      {selectedHospital.opening_hours.open_now ? (
                        <span className="text-green-600 font-medium">Open Now</span>
                      ) : (
                        <span className="text-red-600 font-medium">Closed</span>
                      )}
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          {loading && (
            <div className="text-center mt-4">
              <p className="text-gray-600">Loading nearby hospitals...</p>
            </div>
          )}
        </div>

        {/* Hospital List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Nearby Hospitals ({nearbyHospitals.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyHospitals.map((hospital, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedHospital(hospital)}
              >
                <div className="flex items-start gap-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <span className="text-2xl">🏥</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">
                      {hospital.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {hospital.vicinity}
                    </p>
                    {hospital.rating && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-yellow-500">⭐ {hospital.rating}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">
                          {hospital.user_ratings_total} reviews
                        </span>
                      </div>
                    )}
                    {hospital.opening_hours && (
                      <div className="mt-2">
                        {hospital.opening_hours.open_now ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            Open Now
                          </span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                            Closed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {nearbyHospitals.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              <p>No hospitals found nearby. Please try again later.</p>
            </div>
          )}
        </div>

        {/* Emergency Info */}
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-red-500 text-white p-3 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <h3 className="font-bold text-red-800 mb-2">Emergency Information</h3>
              <p className="text-red-700 mb-3">
                In case of emergency, call 108 for immediate ambulance service or visit the nearest hospital.
              </p>
              <div className="flex gap-4">
                <button className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition">
                  Call 108
                </button>
                <button className="bg-white text-red-600 border border-red-600 px-6 py-2 rounded-lg font-semibold hover:bg-red-50 transition">
                  Emergency Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hospital;
