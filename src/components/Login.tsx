import { AuthService } from '../services/auth';
import { useEffect, useState } from 'react';

export const Login = () => {
  const [hasExistingSession, setHasExistingSession] = useState(false);

  useEffect(() => {
    // Check if there's an existing session
    setHasExistingSession(AuthService.isAuthenticated());
  }, []);

  const handleLogin = async () => {
    await AuthService.initiateLogin();
  };

  const handleLogout = () => {
    AuthService.logout();
    setHasExistingSession(false);
    // Reload to clear any state
    window.location.reload();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Spotify Lyrics Player</h1>
        <p>Connect your Spotify account to see synchronized lyrics</p>
        <button onClick={handleLogin} className="login-button">
          Connect with Spotify
        </button>
        {hasExistingSession && (
          <button 
            onClick={handleLogout} 
            className="logout-link-button"
            style={{
              marginTop: '1rem',
              background: 'transparent',
              border: 'none',
              color: '#B3B3B3',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.85rem',
            }}
          >
            Clear existing session
          </button>
        )}
      </div>
    </div>
  );
};

