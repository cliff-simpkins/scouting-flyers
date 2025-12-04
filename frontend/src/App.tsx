import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import OAuthCallback from './pages/OAuthCallback';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

function DashboardLayout() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div>
          <h1>Volunteer Flyer Distribution</h1>
          <p>Management System</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {user.picture_url && (
                  <img
                    src={user.picture_url}
                    alt={user.name}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2px solid white'
                    }}
                  />
                )}
                <span style={{ fontSize: '0.9rem' }}>{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid white',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>
      <main>
        <HomePage />
      </main>
    </div>
  );
}

function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Welcome back, {user?.name}!</h2>
      <p style={{ marginTop: '1rem', color: '#666' }}>
        You're successfully authenticated with Google OAuth.
      </p>
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: '#f8f9fa',
        borderRadius: '8px',
        maxWidth: '600px',
        margin: '2rem auto'
      }}>
        <h3>Authentication Complete ✓</h3>
        <p>Phase 2 implementation is working!</p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
          Next up: Project management features
        </p>
      </div>
      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#999' }}>
        <p>
          <strong>API Status:</strong> Connected to{' '}
          <a
            href={process.env.REACT_APP_API_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#667eea' }}
          >
            {process.env.REACT_APP_API_URL}
          </a>
        </p>
      </div>
    </div>
  );
}

export default App;
