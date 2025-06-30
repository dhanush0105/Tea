<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Location Visit Tracker</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f5f7fa;
      color: #333;
    }
    
    .app-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #2c3e50;
      margin-bottom: 10px;
    }
    
    .header p {
      color: #7f8c8d;
      margin-top: 0;
    }
    
    .card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .btn {
      background-color: #3498db;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    
    .btn:hover {
      background-color: #2980b9;
    }
    
    .btn:disabled {
      background-color: #bdc3c7;
      cursor: not-allowed;
    }
    
    .location-display {
      margin: 20px 0;
      padding: 15px;
      background-color: #ecf0f1;
      border-radius: 4px;
    }
    
    .visit-count {
      font-weight: bold;
      color: #27ae60;
    }
    
    .map-container {
      width: 100%;
      height: 300px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .history-list {
      margin-top: 20px;
    }
    
    .history-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    
    .timestamp {
      font-size: 0.9em;
      color: #7f8c8d;
    }
    
    .error {
      color: #e74c3c;
      margin-top: 10px;
    }
    
    @media (max-width: 600px) {
      .app-container {
        padding: 15px;
      }
      
      .card {
        padding: 15px;
      }
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect } = React;
    
    // Helper function to format coordinates
    const formatCoordinates = (coords) => {
      return {
        latitude: coords.latitude.toFixed(6),
        longitude: coords.longitude.toFixed(6),
      };
    };
    
    // Helper function to get current timestamp
    const getCurrentTimestamp = () => {
      return new Date().toLocaleString();
    };
    
    // Helper function to generate a location key based on coordinates
    const getLocationKey = (coords) => {
      return `${coords.latitude.toFixed(4)}_${coords.longitude.toFixed(4)}`;
    };

    // Backend API base URL
    const API_URL = 'http://localhost:3001/api';

    const App = () => {
      const [map, setMap] = useState(null);
      const [marker, setMarker] = useState(null);
      const [isLoggedIn, setIsLoggedIn] = useState(false);
      const [apiConnected, setApiConnected] = useState(false);
      const [username, setUsername] = useState('');
      const [age, setAge] = useState('');
      const [password, setPassword] = useState('');
      const [loginUsername, setLoginUsername] = useState('');
      const [loginPassword, setLoginPassword] = useState('');
      const [users, setUsers] = useState([]);
      const [lastVisitTime, setLastVisitTime] = useState(null);
      const [currentLocation, setCurrentLocation] = useState(null);
      const [locationHistory, setLocationHistory] = useState([]);
      const [visitCounts, setVisitCounts] = useState({});
      const [error, setError] = useState(null);
      const [isTracking, setIsTracking] = useState(false);
      const [watchId, setWatchId] = useState(null);
      
      // Load saved data from localStorage on initial render
      useEffect(() => {
        // Check backend connection
        fetch(`${API_URL}/status`)
          .then(res => {
            if (res.ok) {
              setApiConnected(true);
              return res.json();
            }
            throw new Error('Backend connection failed');
          })
          .catch(err => {
            console.error('Using localStorage fallback:', err);
            setApiConnected(false);
          });

        const savedHistory = localStorage.getItem('locationHistory');
        const savedCounts = localStorage.getItem('visitCounts');
        
        if (savedHistory) {
          setLocationHistory(JSON.parse(savedHistory));
        }
        
        if (savedCounts) {
          setVisitCounts(JSON.parse(savedCounts));
        }
      }, []);
      
      // Save data to localStorage whenever it changes
      useEffect(() => {
        localStorage.setItem('locationHistory', JSON.stringify(locationHistory));
        localStorage.setItem('visitCounts', JSON.stringify(visitCounts));
        localStorage.setItem('users', JSON.stringify(users));
      }, [locationHistory, visitCounts, users]);
      
      useEffect(() => {
        const savedUsers = localStorage.getItem('users');
        if (savedUsers) {
          setUsers(JSON.parse(savedUsers));
        }
      }, []);
      
      const handleSuccess = (position) => {
        const { coords } = position;
        const formattedCoords = formatCoordinates(coords);
        const locationKey = getLocationKey(coords);
        const timestamp = getCurrentTimestamp();
        const now = new Date();
        
        // Only count visits that are at least 10 minutes apart
        if (lastVisitTime && (now - lastVisitTime) < 10 * 60 * 1000) {
          setError('Visit too soon - must wait at least 10 minutes between visits');
          return;
        }
        
        setLastVisitTime(now);
        
        setCurrentLocation({
          ...formattedCoords,
          timestamp
        });
        
        setError(null);
        
        // Update visit counts
        const newCounts = { ...visitCounts };
        newCounts[locationKey] = (newCounts[locationKey] || 0) + 1;
        setVisitCounts(newCounts);
        
        // Add to history
        setLocationHistory(prev => [
          {
            ...formattedCoords,
            timestamp,
            visits: newCounts[locationKey]
          },
          ...prev.slice(0, 49) // Keep only the last 50 items
        ]);
      };
      
      const handleError = (err) => {
        setError(`Unable to retrieve your location (${err.message})`);
      };
      
      const startTracking = () => {
        if (isTracking) return;
        
        if (navigator.geolocation) {
          setIsTracking(true);
          const id = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            { enableHighAccuracy: true }
          );
          setWatchId(id);
        } else {
          setError('Geolocation is not supported by your browser');
        }
      };
      
      const stopTracking = () => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
          setWatchId(null);
        }
        setIsTracking(false);
      };

      useEffect(() => {
        return () => {
          if (map) {
            map.remove();
          }
        };
      }, [map]);
      
      const resetData = () => {
        if (window.confirm('Are you sure you want to clear all your location data? This cannot be undone.')) {
          setLocationHistory([]);
          setVisitCounts({});
          localStorage.removeItem('locationHistory');
          localStorage.removeItem('visitCounts');
        }
      };
      
      const validatePassword = (password) => {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      return password.length >= 8 && hasUpperCase && hasNumber && hasSpecialChar;
    };

    const handleRegister = async () => {
      if (!validatePassword(password)) {
        setError('Password does not meet requirements');
        return;
      }
      
      try {
        const response = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, age, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Registration failed');
        }

        setIsLoggedIn(true);
        setError(null);
      } catch (err) {
        setError(err.message);
        // Fallback to localStorage if backend fails
        setUsers([...users, { username, age, password }]);
      }
    };
      
      const handleLogin = async () => {
        try {
          const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: loginUsername, password: loginPassword }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
          }

          const user = await response.json();
          setUsername(user.username);
          setAge(user.age);
          setIsLoggedIn(true);
          setError(null);
        } catch (err) {
          setError(err.message);
          // Fallback to localStorage if backend fails
          const user = users.find(u => u.username === loginUsername && u.password === loginPassword);
          if (user) {
            setUsername(user.username);
            setAge(user.age);
            setIsLoggedIn(true);
            setError(null);
          }
        }
      };
      
      const getCurrentVisitCount = () => {
        if (!currentLocation) return 0;
        
        const locationKey = getLocationKey({
          latitude: parseFloat(currentLocation.latitude),
          longitude: parseFloat(currentLocation.longitude)
        });
        
        return visitCounts[locationKey] || 0;
      };
      
      return (
        <div className="app-container">
          <div className="header">
            <h1>Chai Tapri Visit Tracker</h1>
            <p>Track your visits to the local tea shop (₹15 per visit)</p>
            <p style={{color: apiConnected ? '#27ae60' : '#e74c3c', fontWeight: 'bold'}}>
              {apiConnected ? 'Connected to backend' : 'Using localStorage fallback'}
            </p>
            
            {!isLoggedIn ? (
              <div className="card" style={{marginTop: '20px'}}>
                <h2>Register/Login</h2>
                <div style={{display: 'flex', gap: '20px'}}>
                  <div style={{flex: 1}}>
                    <h3>Register</h3>
                    <div style={{marginBottom: '10px'}}>
                      <input type="text" placeholder="Name" value={username} onChange={(e) => setUsername(e.target.value)} style={{width: '100%', padding: '8px', marginBottom: '10px'}} />
                      <input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} style={{width: '100%', padding: '8px', marginBottom: '10px'}} />
                      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{width: '100%', padding: '8px'}} />
                      <p style={{fontSize: '0.8em', color: '#666'}}>
                        Password must contain: 8+ chars, 1 uppercase, 1 number, 1 special char
                      </p>
                    </div>
                    <button className="btn" onClick={handleRegister} disabled={!username || !age || !validatePassword(password)}>
                      Register
                    </button>
                  </div>
                  <div style={{flex: 1}}>
                    <h3>Login</h3>
                    <input type="text" placeholder="Username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} style={{width: '100%', padding: '8px', marginBottom: '10px'}} />
                    <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} style={{width: '100%', padding: '8px', marginBottom: '10px'}} />
                    <button className="btn" onClick={handleLogin} disabled={!loginUsername || !loginPassword}>
                      Login
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="user-input" style={{marginTop: '20px'}}>
                <p>Welcome, {username}!</p>
                <button className="btn" onClick={() => setIsLoggedIn(false)} style={{backgroundColor: '#e74c3c'}}>
                  Logout
                </button>
              </div>
            )}
          </div>
          
          <div className="card">
            <h2>Current Location</h2>
            <div className="controls">
              <button 
                className="btn" 
                onClick={startTracking} 
                disabled={isTracking}
              >
                Start Tracking
              </button>
              <button 
                className="btn" 
                onClick={stopTracking} 
                disabled={!isTracking}
                style={{ marginLeft: '10px', backgroundColor: '#e74c3c' }}
              >
                Stop Tracking
              </button>
            </div>
            
            {error && <div className="error">{error}</div>}
            
            {currentLocation && (
              <div className="location-display">
                <p>
                  <strong>Coordinates:</strong> 
                  {currentLocation.latitude}, {currentLocation.longitude}
                </p>
                {username && <p><strong>Customer:</strong> {username}</p>}
                <p>
                  <strong>Tea Purchases:</strong> 
                  <span className="visit-count">{getCurrentVisitCount()}</span>
                  {(getCurrentVisitCount() > 0) && (
                    <span> (Total: ₹{getCurrentVisitCount() * 15})</span>
                  )}
                </p>
                <p>
                  <strong>Last updated:</strong> {currentLocation.timestamp}
                </p>
                
                <div id="map" className="map-container" ref={(el) => {
                  if (el && !map && currentLocation) {
                    const newMap = L.map(el).setView(
                      [currentLocation.latitude, currentLocation.longitude], 
                      15
                    );
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(newMap);
                    setMap(newMap);
                    
                    const newMarker = L.marker([currentLocation.latitude, currentLocation.longitude])
                      .addTo(newMap)
                      .bindPopup("Your current location");
                    setMarker(newMarker);
                  } else if (map && marker && currentLocation) {
                    map.setView([currentLocation.latitude, currentLocation.longitude]);
                    marker.setLatLng([currentLocation.latitude, currentLocation.longitude])
                      .setPopupContent("Your current location");
                  }
                }}></div>
              </div>
            )}
          </div>
          
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2>Location History</h2>
              <button 
                className="btn" 
                onClick={resetData}
                style={{ backgroundColor: '#95a5a6', height: 'fit-content' }}
              >
                Clear Data
              </button>
            </div>
            
            {locationHistory.length > 0 ? (
              <div className="history-list">
                {locationHistory.map((loc, index) => (
                  <div key={index} className="history-item">
                    <div>
                      <div><strong>Visit #{index + 1}</strong></div>
                      <div className="timestamp">{loc.timestamp}</div>
                    </div>
                    <div className="visit-count">
                      ₹{loc.visits * 15}<br/>
                      <small>({loc.visits} teas)</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No location history yet. Start tracking to see your visit history.</p>
            )}
          </div>
        </div>
      );
    };
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>

