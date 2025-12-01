import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';

export const Callback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasProcessed.current) {
      return;
    }

    const handleCallback = async () => {
      // Spotify redirects with query params
      const search = window.location.search;
      
      console.log('Callback - Search:', search);
      console.log('Callback - Full URL:', window.location.href);
      
      const urlParams = new URLSearchParams(search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        console.error('Auth error from Spotify:', error);
        setError(`Authentication failed: ${error}. Please try again.`);
        return;
      }

      if (!code) {
        console.error('No authorization code found in URL');
        setError('No authorization code received. Please try logging in again.');
        return;
      }

      hasProcessed.current = true;
      console.log('Found authorization code, exchanging for token...');
      try {
        await AuthService.handleCallback(code);
        console.log('Token exchange successful, navigating to home...');
        navigate('/');
      } catch (err) {
        console.error('Auth error:', err);
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

