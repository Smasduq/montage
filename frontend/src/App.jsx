import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Home from './pages/Home';
import Flash from './pages/Flash';
import Posts from './pages/Posts';
import Upload from './pages/Upload';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Watch from './pages/Watch';

import Search from './pages/Search';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, loading, user } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!token) return <Navigate to="/login" />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  return children;
};

function AppContent() {
  const { user, logout, token } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  const isFlashPage = location.pathname === '/flash';

  return (
    <div className="app-container">
      <Header
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        isMenuOpen={isMenuOpen}
      />
      <div className="app-layout">
        <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <main className={`main-stage ${isFlashPage ? 'no-padding' : ''}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/flash" element={<Flash />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/search" element={<Search />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            {/* Admin and Moderator routes removed */}

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </main>
      </div>
      <BottomNav />

      {!token && (
        <Link to="/login" className="floating-auth-pill glass">
          <Zap size={20} fill="white" />
          Join Montage
        </Link>
      )}
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
