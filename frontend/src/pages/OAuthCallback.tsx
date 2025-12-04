/**
 * OAuth callback handler page
 * Handles redirect from Google OAuth
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      // Check for OAuth error
      if (errorParam) {
        setError(`Authentication failed: ${errorParam}`);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code || !state) {
        setError('Missing authorization code or state');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Exchange code for token
        await authService.handleCallback(code, state);

        // Refresh user in context
        await refreshUser();

        // Redirect to home
        navigate('/', { replace: true });
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Failed to complete authentication. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div>
        {error ? (
          <>
            <h2 style={{ color: '#e74c3c' }}>Authentication Error</h2>
            <p>{error}</p>
            <p>Redirecting to login...</p>
          </>
        ) : (
          <>
            <h2>Completing sign in...</h2>
            <p>Please wait while we verify your credentials.</p>
            <div style={{
              display: 'inline-block',
              marginTop: '1rem',
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </>
        )}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OAuthCallback;
