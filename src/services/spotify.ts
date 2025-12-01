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
          // If it's a scope error, clear tokens to force re-login
          if (message.includes('Invalid token scopes') || message.includes('scope')) {
            console.warn('Token missing required scopes. Please log out and log in again.');
            AuthService.logout();
          }
          reject(new Error(message));
        });

        this.player.addListener('account_error', ({ message }: { message: string }) => {
          console.error('Failed to validate Spotify account', message);
          reject(new Error(message));
        });

        this.player.connect();
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

  static async getPlaybackState(): Promise<PlaybackState | null> {
    try {
      const token = await AuthService.getValidToken();
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 204) {
        return null; // No playback state
      }

      if (!response.ok) {
        throw new Error('Failed to fetch playback state');
      }

      const data = await response.json();
      return {
        is_playing: data.is_playing,
        item: data.item,
        progress_ms: data.progress_ms || 0,
        timestamp: data.timestamp || Date.now(),
      };
    } catch (error) {
      console.error('Error fetching playback state:', error);
      return null;
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

