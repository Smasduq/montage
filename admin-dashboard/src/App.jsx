import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import VideoApprovals from './VideoApprovals';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  // Verify token validity on load could be added here, but for now relies on API calls failing to logout

  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/" element={!token ? <Login setToken={setToken} /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={token ? <Dashboard token={token} setToken={setToken} /> : <Navigate to="/" />} />
          <Route path="/approvals" element={token ? <VideoApprovals token={token} setToken={setToken} /> : <Navigate to="/" />} />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}

export default App;
