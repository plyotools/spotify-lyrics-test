import { AuthService } from './auth';
import type { Track, PlaybackState } from '../types/spotify';
import { apiCache } from '../utils/apiCache';

// Spotify SDK types
interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: 'ready', callback: (data: { device_id: string }) => void): void;
  addListener(event: 'not_ready', callback: (data: { device_id: string }) => void): void;
  addListener(event: 'authentication_error', callback: (data: { message: string }) => void): void;
  addListener(event: 'account_error', callback: (data: { message: string }) => void): void;
}

interface SpotifyPlayerConstructor {
  new (options: {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }): SpotifyPlayer;
}

export class SpotifyService {
  private static player: SpotifyPlayer | null = null;
  private static isInitialized = false;
  private static stateChangeCallback: ((state: PlaybackState | null) => void) | null = null;

  static async initializePlayer(): Promise<void> {
    if (this.isInitialized && this.player) {
      return;
    }

    // Check if we have a valid token first
    try {
      await AuthService.getValidToken();
    } catch (error) {
      throw new Error('No valid access token. Please log in again.');
    }

    return new Promise((resolve, reject) => {
      // Set a timeout to avoid hanging forever
      const timeout = setTimeout(() => {
        reject(new Error('Spotify Web Playback SDK initialization timeout'));
      }, 30000); // 30 second timeout

      const cleanup = () => {
        clearTimeout(timeout);
      };

      // Check if SDK is already loaded
      if ((window as any).Spotify) {
        this.setupPlayer(
          () => {
            cleanup();
            resolve();
          },
          (error) => {
            cleanup();
            reject(error);
          }
        );
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
        // Wait for SDK to be ready
        const originalReady = (window as any).onSpotifyWebPlaybackSDKReady;
        (window as any).onSpotifyWebPlaybackSDKReady = () => {
          if (originalReady) originalReady();
          this.setupPlayer(
            () => {
              cleanup();
              resolve();
            },
            (error) => {
              cleanup();
              reject(error);
            }
          );
        };
        return;
      }

      // Load Spotify Web Playback SDK script
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onerror = () => {
        cleanup();
        reject(new Error('Failed to load Spotify Web Playback SDK script'));
      };
      document.body.appendChild(script);

      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        this.setupPlayer(
          () => {
            cleanup();
            resolve();
          },
          (error) => {
            cleanup();
            reject(error);
          }
        );
      };
    });
  }

  private static setupPlayer(resolve: () => void, reject: (error: Error) => void): void {
    const Spotify = (window as any).Spotify as { Player: SpotifyPlayerConstructor };
    this.player = new Spotify.Player({
          name: 'Spotify Lyrics Player',
          getOAuthToken: async (cb: (token: string) => void) => {
            try {
              const token = await AuthService.getValidToken();
              cb(token);
            } catch (error) {
              console.error('Error getting token:', error);
            }
          },
          volume: 0.5,
        });

        this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
          console.log('✅ Web Playback SDK ready with Device ID:', device_id);
          console.log('🎵 Event-driven playback updates enabled');
          this.isInitialized = true;
          resolve();
        });

        this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('Device ID has gone offline', device_id);
        });

        this.player.addListener('authentication_error', ({ message }: { message: string }) => {
          console.error('Failed to authenticate', message);
          // If it's a scope error, don't log out - just reject
          // The app can still work with Web API without Web Playback SDK
          if (message.includes('Invalid token scopes') || message.includes('scope')) {
            console.warn('Token missing required scopes for Web Playback SDK. App will continue using Web API only.');
            // Don't log out - keep tokens for Web API usage
          }
          reject(new Error(message));
        });

        this.player.addListener('account_error', ({ message }: { message: string }) => {
          console.error('Failed to validate Spotify account', message);
          reject(new Error(message));
        });

        // Listen for player state changes - use this for real-time updates!
        (this.player as any).addListener('player_state_changed', (sdkState: any) => {
          if (sdkState?.track_window) {
            // Store track_window data for later use
            this.lastTrackWindow = {
              previous_tracks: sdkState.track_window.previous_tracks || [],
              next_tracks: sdkState.track_window.next_tracks || [],
            };
          }

          // Convert SDK state to our PlaybackState format and notify callback
          if (sdkState && this.stateChangeCallback) {
            const playbackState: PlaybackState = {
              is_playing: sdkState.paused === false,
              item: sdkState.track_window?.current_track ? {
                id: sdkState.track_window.current_track.id,
                name: sdkState.track_window.current_track.name,
                artists: sdkState.track_window.current_track.artists.map((a: any) => ({ name: a.name })),
                album: {
                  name: sdkState.track_window.current_track.album?.name || '',
                  images: sdkState.track_window.current_track.album?.images || [],
                },
                duration_ms: sdkState.track_window.current_track.duration_ms || 0,
              } : null,
              progress_ms: sdkState.position || 0,
              timestamp: Date.now(),
              context: {
                previous_tracks: sdkState.track_window?.previous_tracks || [],
                next_tracks: sdkState.track_window?.next_tracks || [],
              },
            };

            // Update cache with fresh state from SDK
            apiCache.set('playback_state', playbackState, 10000); // Cache for 10s (SDK updates frequently)

            // Notify callback (context will use this instead of polling!)
            // This is a real-time event - no API call needed!
            this.stateChangeCallback(playbackState);
          }
        });

        this.player.connect();
  }

  private static lastTrackWindow: { previous_tracks: any[]; next_tracks: any[] } | null = null;

  /**
   * Set a callback to receive real-time state updates from Web Playback SDK
   * This eliminates the need for frequent polling when SDK is available
   */
  static setStateChangeCallback(callback: ((state: PlaybackState | null) => void) | null): void {
    this.stateChangeCallback = callback;
  }

  /**
   * Check if Web Playback SDK is available and initialized
   */
  static isSDKAvailable(): boolean {
    return this.isInitialized && this.player !== null;
  }

  static async getCurrentlyPlayingTrack(): Promise<Track | null> {
    try {
      const token = await AuthService.getValidToken();
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 204) {
        return null; // No track playing
      }

      if (!response.ok) {
        throw new Error('Failed to fetch currently playing track');
      }

      const data = await response.json();
      return data.item;
    } catch (error) {
      console.error('Error fetching currently playing track:', error);
      return null;
    }
  }

  static async getPlaybackState(useCache: boolean = true, skipCache: boolean = false): Promise<PlaybackState | null> {
    // Check cache first (default 5 second TTL) to reduce API calls
    const cacheKey = 'playback_state';
    if (useCache && !skipCache) {
      const cached = apiCache.get<PlaybackState>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      const token = await AuthService.getValidToken();
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 204) {
        // No content - no active device or nothing playing
        return null;
      }

      if (response.status === 401) {
        // Unauthorized - token might be invalid
        console.warn('Unauthorized - token may need refresh');
        throw new Error('Unauthorized - please log in again');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : null;
          // Log the full response headers for debugging
          console.warn(`Rate limited (429). Retry after: ${retrySeconds || 'unknown'} seconds`);
          console.warn('Rate limit headers:', {
            'retry-after': retryAfter,
            'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
            'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
            'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
          });
          throw new Error(`429 Too many requests${retrySeconds ? ` - retry after ${retrySeconds}s` : ''}`);
        }
        
        console.error('Playback state error:', response.status, errorText);
        throw new Error(`Failed to fetch playback state: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Try to get queue for next tracks
      let nextTracks: Track[] = [];
      let previousTracks: Track[] = [];
      
      // First, try to get from Web Playback SDK if available
      if (this.player && this.isInitialized) {
        try {
          const player = this.player as any;
          const state = await player.getCurrentState();
          if (state?.track_window) {
            previousTracks = state.track_window.previous_tracks || [];
            nextTracks = state.track_window.next_tracks || [];
          } else if (this.lastTrackWindow) {
            // Fallback to last known track_window
            previousTracks = this.lastTrackWindow.previous_tracks || [];
            nextTracks = this.lastTrackWindow.next_tracks || [];
          }
        } catch (err) {
          // SDK not available, try queue endpoint
        }
      }
      
      // If SDK didn't provide tracks, try queue endpoint
      if (nextTracks.length === 0 && previousTracks.length === 0) {
        try {
          const queueResponse = await fetch('https://api.spotify.com/v1/me/player/queue', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (queueResponse.ok) {
            const queueData = await queueResponse.json();
            nextTracks = queueData.queue || [];
            // Queue endpoint doesn't provide previous tracks
          }
        } catch (err) {
          // Queue endpoint might not be available, continue without it
          console.log('Queue endpoint not available, previous/next tracks will not be shown');
        }
      }
      
      const playbackState: PlaybackState = {
        is_playing: data.is_playing,
        item: data.item,
        progress_ms: data.progress_ms || 0,
        timestamp: data.timestamp || Date.now(),
        context: {
          previous_tracks: previousTracks,
          next_tracks: nextTracks,
        },
      };

      // Cache the result for 5 seconds (reduces redundant calls)
      apiCache.set(cacheKey, playbackState, 5000);

      return playbackState;
    } catch (error) {
      // Only log if it's not a refresh token error (that's already logged in auth.ts)
      if (error instanceof Error && !error.message.includes('No refresh token')) {
        console.error('Error fetching playback state:', error);
      }
      // Re-throw so the caller can handle it
      throw error;
    }
  }

  static async getCurrentPosition(): Promise<number> {
    const state = await this.getPlaybackState();
    if (!state || !state.is_playing) {
      return state?.progress_ms || 0;
    }

    // Calculate current position accounting for time elapsed since last update
    const elapsed = Date.now() - state.timestamp;
    return state.progress_ms + elapsed;
  }

  static async togglePlayback(): Promise<void> {
    try {
      const token = await AuthService.getValidToken();
      const state = await this.getPlaybackState();
      
      if (!state) {
        throw new Error('No playback state available');
      }

      const endpoint = state.is_playing 
        ? 'https://api.spotify.com/v1/me/player/pause'
        : 'https://api.spotify.com/v1/me/player/play';

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to toggle playback');
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      throw error;
    }
  }

  static async skipToNext(): Promise<void> {
    try {
      const token = await AuthService.getValidToken();
      const response = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 204 No Content is a valid success response for skip
      if (response.status === 204) {
        return;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorMessage = 'Failed to skip to next track';
        
        if (response.status === 403) {
          errorMessage = 'No next track available or insufficient permissions';
        } else if (response.status === 404) {
          errorMessage = 'No active device found. Please start playing music on a Spotify device.';
        } else if (response.status === 401) {
          errorMessage = 'Session expired. Please refresh the page.';
        } else {
          errorMessage = `Failed to skip to next track (${response.status})`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error skipping to next track:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to skip to next track');
    }
  }

  static async skipToPrevious(): Promise<void> {
    try {
      const token = await AuthService.getValidToken();
      const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to skip to previous track');
      }
    } catch (error) {
      console.error('Error skipping to previous track:', error);
      throw error;
    }
  }

  static async seekToPosition(positionMs: number): Promise<void> {
    try {
      const token = await AuthService.getValidToken();
      const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(positionMs)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to seek to position');
      }
    } catch (error) {
      console.error('Error seeking to position:', error);
      throw error;
    }
  }

  static getPlayer(): any {
    return this.player;
  }

  static disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.isInitialized = false;
    }
  }
}

// Re-export types for convenience
export type { Track, PlaybackState } from '../types/spotify';

// Extend Window interface for Spotify SDK
declare global {
  interface Window {
    Spotify?: SpotifyPlayerConstructor;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

