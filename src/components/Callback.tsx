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
      console.log('[CALLBACK] Already processed, skipping');
      return;
    }

    const handleCallback = async () => {
      console.log('[CALLBACK] ========================================');
      console.log('[CALLBACK] Callback component mounted, handling Spotify redirect');
      console.log('[CALLBACK] Location pathname:', location.pathname);
      console.log('[CALLBACK] Location search:', location.search);
      console.log('[CALLBACK] Window hash:', window.location.hash);
      
      // First, extract query params to check if we have a new authorization code
      // Try to get query params from multiple sources
      // Priority: hash route (after main.tsx redirect) > location.search > window.location.search
      let queryString = '';
      
      // HashRouter puts the route in window.location.hash
      // Format: #/callback?code=...&state=...
      const hash = window.location.hash || '';
      console.log('[CALLBACK] Window hash:', hash);
      
      // Extract query string from hash (after #/callback?)
      if (hash.startsWith('#/callback') && hash.includes('?')) {
        const hashParts = hash.split('?');
        if (hashParts.length > 1) {
          queryString = '?' + hashParts.slice(1).join('?');
          console.log('[CALLBACK] Found query string in hash:', queryString);
        }
      }
      
      // Fallback: check location.search (for direct navigation without hash)
      if (!queryString) {
        queryString = location.search || window.location.search || '';
        if (queryString) {
          console.log('[CALLBACK] Using search params:', queryString);
        }
      }
      
      // Last resort: parse from full URL
      if (!queryString) {
        const fullUrl = window.location.href;
        const urlMatch = fullUrl.match(/[?#]([^#]*code=[^#&]*)/);
        if (urlMatch) {
          queryString = '?' + urlMatch[1];
          console.log('[CALLBACK] Extracted from URL:', queryString);
        }
      }
      
      console.log('[CALLBACK] Location object:', location);
      console.log('[CALLBACK] Location search:', location.search);
      console.log('[CALLBACK] Full URL:', window.location.href);
      console.log('[CALLBACK] Window search:', window.location.search);
      console.log('[CALLBACK] Window hash:', window.location.hash);
      console.log('[CALLBACK] Final query string:', queryString);
      
      const urlParams = new URLSearchParams(queryString);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const state = urlParams.get('state');
      
      console.log('[CALLBACK] Extracted params:', { 
        hasCode: !!code, 
        hasState: !!state, 
        hasError: !!error,
        stateLength: state?.length || 0 
      });
      
      // If we have a new authorization code, process it even if user appears authenticated
      // This handles re-authentication cases where we want a new token with updated scopes
      if (code) {
        console.log('[CALLBACK] Found authorization code - processing new token exchange (may overwrite existing token)');
        if (state) {
          console.log('[CALLBACK] State parameter found, length:', state.length);
        } else {
          console.warn('[CALLBACK] State parameter missing - will try localStorage/sessionStorage');
        }
        hasProcessed.current = true;
        try {
          await AuthService.handleCallback(code, state || undefined);
          console.log('[CALLBACK] Token exchange successful, navigating to home...');
          navigate('/');
          return;
        } catch (err) {
          console.error('[CALLBACK] Auth error:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(`Failed to authenticate: ${errorMessage}. Please try again.`);
          hasProcessed.current = false; // Allow retry on error
          return;
        }
      }
      
      // Handle error from Spotify auth
      if (error) {
        console.error('[CALLBACK] Auth error from Spotify:', error);
        setError(`Authentication failed: ${error}. Please try again.`);
        return;
      }
      
      // If no code and no error, check if user is already authenticated
      // If authenticated, redirect to home; otherwise redirect to login
      if (!code) {
        console.log('[CALLBACK] No authorization code found in URL');
        console.log('[CALLBACK] URL params:', Array.from(urlParams.entries()));
        const isAlreadyAuthenticated = AuthService.isAuthenticated();
        if (isAlreadyAuthenticated) {
          console.log('[CALLBACK] User is already authenticated, redirecting to home');
          navigate('/');
        } else {
          console.log('[CALLBACK] Not authenticated, redirecting to login');
          navigate('/');
        }
        return;
      }
    };

    handleCallback();
  }, [navigate, location]);

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

