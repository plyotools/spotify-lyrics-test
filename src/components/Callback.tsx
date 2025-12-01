import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../services/auth';

export const Callback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasProcessed.current) {
      return;
    }

    const handleCallback = async () => {
      console.log('[CALLBACK] Callback component mounted, handling Spotify redirect');
      console.log('[CALLBACK] Location object:', location);
      console.log('[CALLBACK] Location search:', location.search);
      console.log('[CALLBACK] Full URL:', window.location.href);
      console.log('[CALLBACK] Window search:', window.location.search);
      console.log('[CALLBACK] Window hash:', window.location.hash);
      
      // Try to get query params from multiple sources
      // First try location.search (react-router)
      // Then try window.location.search (direct URL params)
      // Finally check hash for query params
      let queryString = location.search || window.location.search || '';
      
      if (!queryString) {
        const hash = window.location.hash || '';
        if (hash.includes('?')) {
          const hashParts = hash.split('?');
          if (hashParts.length > 1) {
            queryString = '?' + hashParts.slice(1).join('?');
          }
        }
      }
      
      console.log('[CALLBACK] Final query string:', queryString);
      const urlParams = new URLSearchParams(queryString);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        console.error('[CALLBACK] Auth error from Spotify:', error);
        setError(`Authentication failed: ${error}. Please try again.`);
        return;
      }

      if (!code) {
        console.error('[CALLBACK] No authorization code found in URL');
        console.log('[CALLBACK] URL params:', Array.from(urlParams.entries()));
        setError('No authorization code received. Please try logging in again.');
        return;
      }

      hasProcessed.current = true;
      console.log('[CALLBACK] Found authorization code, exchanging for token...');
      try {
        await AuthService.handleCallback(code);
        console.log('[CALLBACK] Token exchange successful, navigating to home...');
        navigate('/');
      } catch (err) {
        console.error('[CALLBACK] Auth error:', err);
        setError(`Failed to authenticate: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
        hasProcessed.current = false; // Allow retry on error
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="callback-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => navigate('/')}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="callback-container">
      <p>Authenticating...</p>
    </div>
  );
};

