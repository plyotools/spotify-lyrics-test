import { AuthService } from './auth';
import type { Track, PlaybackState } from '../types/spotify';

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
          console.log('Ready with Device ID', device_id);
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

        // Listen for player state changes to capture track_window
        (this.player as any).addListener('player_state_changed', (state: any) => {
          if (state?.track_window) {
            // Store track_window data for later use
            this.lastTrackWindow = {
              previous_tracks: state.track_window.previous_tracks || [],
              next_tracks: state.track_window.next_tracks || [],
            };
          }
        });

        this.player.connect();
  }

  private static lastTrackWindow: { previous_tracks: any[]; next_tracks: any[] } | null = null;

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

  static async getPlaybackState(): Promise<PlaybackState | null> {
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
      
      return {
        is_playing: data.is_playing,
        item: data.item,
        progress_ms: data.progress_ms || 0,
        timestamp: data.timestamp || Date.now(),
        context: {
          previous_tracks: previousTracks,
          next_tracks: nextTracks,
        },
      };
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

      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to skip to next track');
      }
    } catch (error) {
      console.error('Error skipping to next track:', error);
      throw error;
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

