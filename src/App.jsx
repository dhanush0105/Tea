import React, { useState, useEffect } from 'react';

const LocationTracker = () => {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    error: null
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser'
      }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null
        });
      },
      (error) => {
        setLocation((prev) => ({
          ...prev,
          error: error.message
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Clean up the watcher on component unmount
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div style={{ fontFamily: 'Arial', padding: '20px' }}>
      <h2>🌍 Location Tracker</h2>
      {location.error ? (
        <p style={{ color: 'red' }}>Error: {location.error}</p>
      ) : location.latitude && location.longitude ? (
        <div>
          <p><strong>Latitude:</strong> {location.latitude}</p>
          <p><strong>Longitude:</strong> {location.longitude}</p>
        </div>
      ) : (
        <p>Getting location...</p>
      )}
    </div>
  );
};

export default LocationTracker;
