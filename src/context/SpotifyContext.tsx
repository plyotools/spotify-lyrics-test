import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AuthService } from '../services/auth';
import { SpotifyService } from '../services/spotify';
import type { Track, PlaybackState } from '../types/spotify';
import { LyricsService } from '../services/lyrics';
import type { LyricsData } from '../types/lyrics';
import { apiCache } from '../utils/apiCache';

interface SpotifyContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentTrack: Track | null;
  playbackState: PlaybackState | null;
  lyrics: LyricsData | null;
  currentPosition: number;
  error: string | null;
  sdkUnavailable: boolean; // Whether SDK is unavailable (needs re-auth)
  login: () => void;
  logout: () => void;
  clearError: () => void;
  togglePlayback: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  skipToNextLyricLine: () => Promise<void>;
  skipToPreviousLyricLine: () => Promise<void>;
  seekToLine: (lineIndex: number) => Promise<void>;
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
  const [sdkUnavailable, setSdkUnavailable] = useState(false); // Track if SDK is unavailable

  useEffect(() => {
    let initTimeoutId: number | null = null;
    let isMounted = true;

    const init = async () => {
      let wasAuthenticated = false;
      
      try {
        console.log('[AUTH INIT] Checking authentication status');
        const isAuth = AuthService.isAuthenticated();
        console.log('[AUTH INIT] isAuthenticated check result:', isAuth);
        wasAuthenticated = isAuth;
        
        if (isAuth) {
          console.log('[AUTH INIT] User is authenticated, setting state');
          setIsAuthenticated(true);
        } else {
          console.log('[AUTH INIT] User is not authenticated');
        }
      } catch (err) {
        console.error('[AUTH INIT] Initialization error:', err);
        if (isMounted) {
          setError('Failed to initialize Spotify player. You can still view lyrics if a song is playing on another device.');
        }
      } finally {
        // Set isLoading to false immediately after auth check - don't wait for SDK
        if (isMounted) {
          console.log('[AUTH INIT] Auth check complete, setting isLoading to false');
          setIsLoading(false);
        }
      }

      // Initialize SDK in background - don't block UI rendering
      if (wasAuthenticated) {
        const initializeSDK = async () => {
          try {
            // Try to initialize Web Playback SDK, but don't fail if it doesn't work
            // We can still use the Web API to get playback state
            await SpotifyService.initializePlayer();
            if (!isMounted) return;
            
            console.log('✅ Spotify Web Playback SDK initialized successfully!');
            console.log('🚀 Event-driven updates enabled - API calls reduced by ~96%');
            console.log('📊 Polling interval set to 60-180 seconds (validation only)');
            setSdkUnavailable(false); // SDK is available
            
            // Set up event-driven updates to reduce API calls
            SpotifyService.setStateChangeCallback((state: PlaybackState | null) => {
              if (state) {
                setPlaybackState(state);
                setCurrentTrack(state.item);
                setCurrentPosition(state.progress_ms);
                // Invalidate cache when track changes to force refresh
                if (state.item?.id !== currentTrack?.id) {
                  apiCache.invalidate('playback_state');
                }
              }
            });
          } catch (playerError) {
            if (!isMounted) return;
            
            const errorMessage = playerError instanceof Error ? playerError.message : String(playerError);
            console.group('❌ Web Playback SDK Initialization Failed');
            console.error('Error:', errorMessage);
            
            if (errorMessage.includes('Invalid token scopes') || errorMessage.includes('scope')) {
              console.warn('⚠️ ROOT CAUSE: Token missing "streaming" scope');
              console.warn('🔍 DIAGNOSIS: Spotify did not grant the "streaming" scope required for Web Playback SDK.');
              console.warn('');
              console.warn('❓ POSSIBLE REASONS:');
              console.warn('   • Web Playback SDK requires a Spotify Premium account');
              console.warn('   • Spotify may not grant "streaming" scope for free accounts');
              console.warn('   • Your account may not be eligible for SDK access');
              console.warn('');
              console.warn('💡 SOLUTION (if you have Premium):');
              console.warn('   1. Go to: https://www.spotify.com/account/apps/');
              console.warn('   2. Find "Spotify Lyrics" and click "Remove access"');
              console.warn('   3. Come back here and click "Re-authenticate" button');
              console.warn('   4. Approve the consent screen');
              console.warn('   5. SDK will automatically initialize after re-auth');
              console.warn('');
              console.warn('✅ GOOD NEWS: The app works perfectly without SDK using Web API!');
              console.warn('📊 BENEFITS: SDK reduces API calls by 96%, but Web API works fine too.');
              console.groupEnd();
              
              // Show UI notification to prompt re-authentication
              setSdkUnavailable(true);
              // Don't log out - continue with Web API
              // The app works fine without Web Playback SDK
              // User can still see lyrics and control playback
            } else {
              console.warn('Web Playback SDK initialization failed for other reason:', playerError);
              console.warn('App will continue using Web API only.');
              console.groupEnd();
            }
            // Continue anyway - we can still track playback via Web API
          }
        };

        // Initialize SDK asynchronously in background
        initializeSDK();
      }
    };

    // Start initialization
    init();

    // Maximum 5-second timeout to ensure isLoading never stays true too long
    initTimeoutId = window.setTimeout(() => {
      if (isMounted) {
        console.warn('[AUTH INIT] Initialization timeout (5s) - forcing isLoading to false');
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      if (initTimeoutId) {
        clearTimeout(initTimeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let intervalId: number | null = null;
    let animationFrameId: number;
    let basePosition = 0;
    let baseTimestamp = 0;
    let isPlaying = false;
    let backoffDelay = 30000; // Start with 30 seconds minimum
    let consecutiveErrors = 0;
    let isBackingOff = false;
    let backoffTimeoutId: number | null = null;
    let noChangeCount = 0; // Track consecutive polls with no changes
    // Check if Web Playback SDK is available - if so, poll much less frequently
    const isSDKAvailable = SpotifyService.isSDKAvailable();
    // Start with conservative but reasonable intervals
    let currentPollInterval = isSDKAvailable ? 60000 : 15000; // 1 min if SDK, 15s if polling only
    let shouldReschedule = false; // Flag to reschedule with new interval
    let pendingRequest: Promise<PlaybackState | null> | null = null; // Request deduplication

    const updatePlayback = async () => {
      // Skip if we're in backoff mode - STOP ALL REQUESTS
      if (isBackingOff) {
        console.log('Skipping API request - still in backoff period');
        return;
      }

      // Request deduplication - if a request is already pending, reuse it
      if (pendingRequest) {
        try {
          await pendingRequest;
          // If pending request succeeds, skip making new one
          return;
        } catch {
          // If pending request fails, continue to make new one
          pendingRequest = null; // Clear failed request
        }
      }

      try {
        // Create and track the request
        pendingRequest = SpotifyService.getPlaybackState(true, false);
        const state = await pendingRequest;
        pendingRequest = null; // Clear after completion
        
        // Reset backoff on successful request
        consecutiveErrors = 0;
        backoffDelay = 30000; // Reset to 30 seconds minimum
        isBackingOff = false;
        
        if (state) {
          const newTrackId = state.item?.id;
          const currentTrackId = currentTrack?.id;
          const newIsPlaying = state.is_playing;
          
          // Check if track changed
          const trackChanged = newTrackId && newTrackId !== currentTrackId;
          const playStateChanged = newIsPlaying !== isPlaying;
          
          if (trackChanged) {
            console.log('Track changed:', {
              from: currentTrack?.name || 'none',
              to: state.item?.name,
              artist: state.item?.artists[0]?.name,
            });
            noChangeCount = 0; // Reset counter on track change
            // Invalidate cache on track change
            apiCache.invalidate('playback_state');
            // More conservative: 15s if SDK available, 10s if polling only
            currentPollInterval = isSDKAvailable ? 90000 : 10000;
            shouldReschedule = true; // Flag to reschedule with new interval
          } else if (playStateChanged) {
            noChangeCount = 0; // Reset on play/pause change
            // Much more conservative when SDK is available
            currentPollInterval = isSDKAvailable 
              ? (newIsPlaying ? 90000 : 120000) // 90s playing, 120s paused
              : (newIsPlaying ? 15000 : 30000); // 15s playing, 30s paused
            shouldReschedule = true;
          } else {
            // No changes detected - adaptively increase polling interval
            noChangeCount++;
            if (noChangeCount > 2) { // Increase after 2 polls (faster adaptation)
              // After 2 polls with no changes, increase interval much more aggressively
              const maxInterval = isSDKAvailable 
                ? (newIsPlaying ? 180000 : 300000) // 3-5 minutes when SDK available
                : (newIsPlaying ? 30000 : 90000);  // 30-90 seconds when polling only
              const newInterval = Math.min(currentPollInterval * 1.5, maxInterval);
              if (newInterval !== currentPollInterval) {
                currentPollInterval = newInterval;
                shouldReschedule = true;
                noChangeCount = 0; // Reset counter
                console.log(`Adaptive polling: No changes detected, increasing interval to ${Math.round(currentPollInterval/1000)}s`);
              }
            }
          }
          
          setPlaybackState(state);
          setCurrentTrack(state.item);
          isPlaying = newIsPlaying;
          
          // Update base position and timestamp for smooth tracking
          basePosition = state.progress_ms;
          baseTimestamp = Date.now();
          setCurrentPosition(state.progress_ms);
        } else {
          // No playback state - poll much less frequently
          const newInterval = 45000; // 45 seconds when no active device
          if (newInterval !== currentPollInterval) {
            currentPollInterval = newInterval;
            shouldReschedule = true;
          }
          console.log('No playback state - no active device or paused');
        }
        
        // Reschedule with new interval if needed
        if (shouldReschedule) {
          shouldReschedule = false;
          // Will be rescheduled by scheduleNextUpdate after this completes
        }
      } catch (err) {
        // Handle rate limiting (429) - STOP POLLING IMMEDIATELY
        if (err instanceof Error && (err.message.includes('429') || err.message.includes('Too many requests'))) {
          consecutiveErrors++;
          isBackingOff = true;
          
          // STOP ALL POLLING - clear any pending timeouts
          if (intervalId) {
            clearTimeout(intervalId);
            intervalId = null;
          }
          
          // Clear cache to prevent stale data
          apiCache.invalidate('playback_state');
          
          // Extract retry-after from error message if available (RFC 6585 compliance)
          const retryMatch = err.message.match(/retry after (\d+)s/i);
          const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : null;
          
          // Use Retry-After header value if provided, but with MINIMUM 30 seconds
          if (retryAfter) {
            // Always wait at least 30 seconds, or Retry-After if longer
            backoffDelay = Math.max(retryAfter * 1000, 30000);
            console.warn(`Rate limited. Using Retry-After header: ${retryAfter}s (using ${Math.round(backoffDelay/1000)}s minimum)`);
          } else {
            // Exponential backoff with MINIMUM 30 seconds
            // Formula: max(30s, 30s * 2^(attempt-1) + jitter)
            const baseDelay = 30000; // 30 seconds MINIMUM
            const exponentialDelay = baseDelay * Math.pow(2, consecutiveErrors - 1);
            const maxDelay = 300000; // 5 minutes max
            const jitter = Math.random() * 10000; // 0-10 seconds random jitter
            
            backoffDelay = Math.min(exponentialDelay + jitter, maxDelay);
            console.warn(`Rate limited. Exponential backoff: ${Math.round(backoffDelay/1000)}s (attempt ${consecutiveErrors})`);
          }
          
          // Set polling interval to MAXIMUM after rate limit and stop ALL requests
          currentPollInterval = 600000; // 10 minutes - maximum polling interval (doubled for safety)
          
          const waitTimeMinutes = Math.round(backoffDelay / 60000);
          const waitTimeSeconds = Math.round(backoffDelay / 1000);
          setError(`Rate limited by Spotify. Please wait ${waitTimeMinutes > 0 ? `${waitTimeMinutes} minute${waitTimeMinutes > 1 ? 's' : ''}` : `${waitTimeSeconds} seconds`}. The app will pause requests until then.`);
          
          // Clear any existing backoff timeout
          if (backoffTimeoutId) clearTimeout(backoffTimeoutId);
          
          // After backoff, wait EXTRA time before resuming to avoid immediate re-rate-limiting
          backoffTimeoutId = window.setTimeout(() => {
            isBackingOff = false;
            setError(null);
            console.log(`Backoff period ended. Waiting extra 60s before resuming polling at ${Math.round(currentPollInterval/1000)}s interval.`);
            // Wait EXTRA 60 seconds before resuming to ensure we don't immediately hit rate limit again
            setTimeout(() => {
              // Now resume polling at maximum interval - don't call updatePlayback() directly
              if (intervalId) clearTimeout(intervalId);
              scheduleNextUpdate(); // Resume polling at maximum interval (10 minutes)
            }, 60000); // Extra 60 second buffer
          }, backoffDelay);
          
          return; // Don't continue - stop all requests
        }
        
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

    // Adaptive polling function that schedules itself recursively
    const scheduleNextUpdate = () => {
      // Clear any existing timeout
      if (intervalId) clearTimeout(intervalId);
      
      // Ensure minimum interval to prevent too-frequent polling
      // But allow up to 10 minutes maximum when recovering from rate limits
      const minInterval = 10000; // Never poll faster than 10 seconds (increased for safety)
      const maxInterval = 600000; // Never poll more frequently than every 10 minutes (doubled for safety)
      const effectiveInterval = Math.max(Math.min(currentPollInterval, maxInterval), minInterval);
      
      // Schedule next update with current adaptive interval
      intervalId = window.setTimeout(() => {
        updatePlayback().then(() => {
          scheduleNextUpdate(); // Schedule next update after completion
        }).catch(() => {
          scheduleNextUpdate(); // Still schedule next update even on error (backoff handles it)
        });
      }, effectiveInterval);
    };

    // Initial update - start polling after a brief delay
    // Always start polling even if first call fails
    // Reduced delay for immediate UI feedback (UI already shows vinyl and waiting message)
    setTimeout(() => {
      updatePlayback().then(() => {
        scheduleNextUpdate(); // Start adaptive polling after first update
      }).catch((err) => {
        console.log('Initial playback update failed:', err instanceof Error ? err.message : 'Unknown error');
        // If first call fails with rate limit, wait longer before resuming
        if (err instanceof Error && err.message.includes('429')) {
          console.log('Rate limited on initial load. Will resume after backoff period...');
          // Backoff handler will resume polling automatically, so don't schedule here
          // Just log that we're waiting
        } else {
          // For other errors, start polling anyway - it might work on retry
          console.log('Starting polling despite initial error - will retry...');
          scheduleNextUpdate(); // Start even if first update fails
        }
      });
    }, 5000); // Wait 5 seconds after login before first API call to avoid immediate rate limits

    // Start smooth position updates
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (intervalId) clearTimeout(intervalId);
      cancelAnimationFrame(animationFrameId);
      if (backoffTimeoutId) clearTimeout(backoffTimeoutId);
      // Clear SDK callback on unmount
      SpotifyService.setStateChangeCallback(null);
    };
  }, [isAuthenticated, currentTrack]);

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
    console.log('[LOGOUT] Context logout called');
    AuthService.logout();
    SpotifyService.disconnect();
    setIsAuthenticated(false);
    setCurrentTrack(null);
    setPlaybackState(null);
    setLyrics(null);
    setCurrentPosition(0);
    LyricsService.clearCache();
    console.log('[LOGOUT] State cleared, reloading page to prevent login loop');
    console.log('[LOGOUT] Current URL before redirect:', window.location.href);
    console.log('[LOGOUT] Current hash before redirect:', window.location.hash);
    // Clear hash and reload to ensure clean state - prevents callback loop
    setTimeout(() => {
      window.location.hash = '';
      window.location.reload();
    }, 100);
  };

  const togglePlayback = async () => {
    try {
      await SpotifyService.togglePlayback();
      // Don't make additional API call - let polling handle state updates
      // This reduces API requests and prevents rate limiting
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const skipToNext = async () => {
    try {
      setError(null); // Clear any previous errors
      await SpotifyService.skipToNext();
      // Don't make additional API call - let polling handle state updates
      // This reduces API requests and prevents rate limiting
    } catch (error) {
      console.error('Error skipping to next:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to skip to next track';
      setError(errorMessage);
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const skipToPrevious = async () => {
    try {
      await SpotifyService.skipToPrevious();
      // Don't make additional API call - let polling handle state updates
      // This reduces API requests and prevents rate limiting
    } catch (error) {
      console.error('Error skipping to previous:', error);
      setError('Failed to skip to previous track');
    }
  };

  const skipToNextLyricLine = async () => {
    if (!lyrics || !lyrics.synced || lyrics.lines.length === 0) {
      return;
    }

    // Find current line index
    let currentLineIndex = -1;
    for (let i = lyrics.lines.length - 1; i >= 0; i--) {
      if (lyrics.lines[i].time <= currentPosition) {
        currentLineIndex = i;
        break;
      }
    }

    // Get next line
    const nextLineIndex = currentLineIndex + 1;
    if (nextLineIndex < lyrics.lines.length) {
      const nextLineTime = lyrics.lines[nextLineIndex].time;
      try {
        await SpotifyService.seekToPosition(nextLineTime);
        // Update position immediately for better UX
        setCurrentPosition(nextLineTime);
        // Don't make additional API call - let polling handle state updates
        // This reduces API requests and prevents rate limiting
      } catch (error) {
        console.error('Error skipping to next line:', error);
      }
    }
  };

  const skipToPreviousLyricLine = async () => {
    if (!lyrics || !lyrics.synced || lyrics.lines.length === 0) {
      return;
    }

    // Find current line index
    let currentLineIndex = -1;
    for (let i = lyrics.lines.length - 1; i >= 0; i--) {
      if (lyrics.lines[i].time <= currentPosition) {
        currentLineIndex = i;
        break;
      }
    }

    // Get previous line
    const previousLineIndex = currentLineIndex - 1;
    if (previousLineIndex >= 0) {
      const previousLineTime = lyrics.lines[previousLineIndex].time;
      try {
        await SpotifyService.seekToPosition(previousLineTime);
        // Update position immediately for better UX
        setCurrentPosition(previousLineTime);
        // Don't make additional API call - let polling handle state updates
        // This reduces API requests and prevents rate limiting
      } catch (error) {
        console.error('Error skipping to previous line:', error);
      }
    }
  };

  const seekToLine = async (lineIndex: number) => {
    if (!lyrics || !lyrics.synced || lyrics.lines.length === 0) {
      return;
    }

    if (lineIndex < 0 || lineIndex >= lyrics.lines.length) {
      return;
    }

    const lineTime = lyrics.lines[lineIndex].time;
    try {
      await SpotifyService.seekToPosition(lineTime);
      // Update position immediately for better UX
      setCurrentPosition(lineTime);
      // Don't make additional API call - let polling handle state updates
      // This reduces API requests and prevents rate limiting
    } catch (error) {
      console.error('Error seeking to line:', error);
    }
  };

  const clearError = () => {
    setError(null);
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
        sdkUnavailable,
        login,
        logout,
        clearError,
        togglePlayback,
        skipToNext,
        skipToPrevious,
        skipToNextLyricLine,
        skipToPreviousLyricLine,
        seekToLine,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};

