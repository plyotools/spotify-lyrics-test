import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AuthService } from '../services/auth';
import { SpotifyService } from '../services/spotify';
import type { Track, PlaybackState } from '../types/spotify';
import { LyricsService } from '../services/lyrics';
import type { LyricsData } from '../types/lyrics';

interface SpotifyContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentTrack: Track | null;
  playbackState: PlaybackState | null;
  lyrics: LyricsData | null;
  currentPosition: number;
  error: string | null;
  login: () => void;
  logout: () => void;
  togglePlayback: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export const useSpotify = () => {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error('useSpotify must be used within SpotifyProvider');
  }
  return context;
};

interface SpotifyProviderProps {
  children: ReactNode;
}

export const SpotifyProvider = ({ children }: SpotifyProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (AuthService.isAuthenticated()) {
          setIsAuthenticated(true);
          // Try to initialize Web Playback SDK, but don't fail if it doesn't work
          // We can still use the Web API to get playback state
          try {
            await SpotifyService.initializePlayer();
            console.log('Spotify Web Playback SDK initialized successfully');
          } catch (playerError) {
            const errorMessage = playerError instanceof Error ? playerError.message : String(playerError);
            if (errorMessage.includes('Invalid token scopes') || errorMessage.includes('scope')) {
              console.warn('Web Playback SDK requires streaming scope. App will continue using Web API only.');
              // Don't log out - continue with Web API
              // The app works fine without Web Playback SDK
              // User can still see lyrics and control playback
            } else {
              console.warn('Web Playback SDK initialization failed, but continuing with Web API:', playerError);
            }
            // Continue anyway - we can still track playback via Web API
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize Spotify player. You can still view lyrics if a song is playing on another device.');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let intervalId: number;
    let animationFrameId: number;
    let basePosition = 0;
    let baseTimestamp = 0;
    let isPlaying = false;

    const updatePlayback = async () => {
      try {
        const state = await SpotifyService.getPlaybackState();
        if (state) {
          const newTrackId = state.item?.id;
          const currentTrackId = currentTrack?.id;
          
          // Log when track changes
          if (newTrackId && newTrackId !== currentTrackId) {
            console.log('Track changed:', {
              from: currentTrack?.name || 'none',
              to: state.item?.name,
              artist: state.item?.artists[0]?.name,
            });
          }
          
          setPlaybackState(state);
          setCurrentTrack(state.item);
          isPlaying = state.is_playing;
          
          // Update base position and timestamp for smooth tracking
          basePosition = state.progress_ms;
          baseTimestamp = Date.now();
          setCurrentPosition(state.progress_ms);
        } else {
          console.log('No playback state - no active device or paused');
        }
      } catch (err) {
        console.error('Error updating playback:', err);
        // Don't silently fail - show error to user if it persists
        if (err instanceof Error && err.message.includes('No refresh token')) {
          setError('Session expired. Please log out and log in again.');
        }
      }
    };

    const animate = () => {
      if (isPlaying && baseTimestamp > 0) {
        const elapsed = Date.now() - baseTimestamp;
        const currentPos = basePosition + elapsed;
        setCurrentPosition(currentPos);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    // Initial update
    updatePlayback();

    // Update every 1 second to sync with Spotify (more frequent for better sync)
    intervalId = window.setInterval(updatePlayback, 1000);

    // Start smooth position updates
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      clearInterval(intervalId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null);
      return;
    }

    const fetchLyrics = async () => {
      try {
        const artist = currentTrack.artists[0]?.name || '';
        const title = currentTrack.name;
        const duration = currentTrack.duration_ms;
        const lyricsData = await LyricsService.getSynchronizedLyrics(artist, title, duration);
        setLyrics(lyricsData);
      } catch (err) {
        console.error('Error fetching lyrics:', err);
        setLyrics(null);
      }
    };

    fetchLyrics();
  }, [currentTrack?.id]);

  const login = async () => {
    await AuthService.initiateLogin();
  };

  const logout = () => {
    AuthService.logout();
    SpotifyService.disconnect();
    setIsAuthenticated(false);
    setCurrentTrack(null);
    setPlaybackState(null);
    setLyrics(null);
    setCurrentPosition(0);
    LyricsService.clearCache();
  };

  const togglePlayback = async () => {
    try {
      await SpotifyService.togglePlayback();
      // Refresh playback state after toggle
      setTimeout(async () => {
        const state = await SpotifyService.getPlaybackState();
        if (state) {
          setPlaybackState(state);
        }
      }, 500);
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const skipToNext = async () => {
    try {
      await SpotifyService.skipToNext();
      // Refresh playback state after skip
      setTimeout(async () => {
        const state = await SpotifyService.getPlaybackState();
        if (state) {
          setPlaybackState(state);
          setCurrentTrack(state.item);
        }
      }, 500);
    } catch (error) {
      console.error('Error skipping to next:', error);
      setError('Failed to skip to next track');
    }
  };

  const skipToPrevious = async () => {
    try {
      await SpotifyService.skipToPrevious();
      // Refresh playback state after skip
      setTimeout(async () => {
        const state = await SpotifyService.getPlaybackState();
        if (state) {
          setPlaybackState(state);
          setCurrentTrack(state.item);
        }
      }, 500);
    } catch (error) {
      console.error('Error skipping to previous:', error);
      setError('Failed to skip to previous track');
    }
  };

  return (
    <SpotifyContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        currentTrack,
        playbackState,
        lyrics,
        currentPosition,
        error,
        login,
        logout,
        togglePlayback,
        skipToNext,
        skipToPrevious,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};

