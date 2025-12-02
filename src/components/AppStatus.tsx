import { useEffect, useState } from 'react';
import { useSpotify } from '../context/SpotifyContext';
import { SpotifyService } from '../services/spotify';

interface AppStatusProps {
  className?: string;
}

export const AppStatus = ({ className }: AppStatusProps) => {
  const { playbackState, error, sdkUnavailable, currentTrack } = useSpotify();
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSDKActive, setIsSDKActive] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (playbackState || currentTrack) {
      setLastUpdateTime(new Date());
    }
  }, [playbackState, currentTrack]);

  useEffect(() => {
    // Check SDK status periodically
    const checkSDKStatus = () => {
      setIsSDKActive(SpotifyService.isSDKAvailable());
    };
    checkSDKStatus();
    const interval = setInterval(checkSDKStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return '#ff3b30'; // Red for offline
    if (error) return '#ff9500'; // Orange for error
    if (sdkUnavailable) return '#ff9500'; // Orange for SDK unavailable
    if (playbackState || currentTrack) return '#1DB954'; // Green for healthy
    return '#B3B3B3'; // Gray for no activity
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (error) return 'Error';
    if (isSDKActive) return 'SDK Active';
    if (playbackState || currentTrack) return 'Connected';
    return 'Waiting';
  };

  const formatLastUpdate = () => {
    if (!lastUpdateTime) return 'Never';
    const secondsAgo = Math.floor((Date.now() - lastUpdateTime.getTime()) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ago`;
  };

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        padding: '0.5rem 0.75rem',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(10px)',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        zIndex: 999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      title={`Status: ${getStatusText()}${lastUpdateTime ? ` | Last update: ${formatLastUpdate()}` : ''}`}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          flexShrink: 0,
        }}
      />
      <span>{getStatusText()}</span>
      {lastUpdateTime && (
        <span style={{ opacity: 0.6 }}>• {formatLastUpdate()}</span>
      )}
    </div>
  );
};
