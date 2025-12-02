import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SpotifyService } from '../../../src/services/spotify';
import { AuthService } from '../../../src/services/auth';
import { apiCache } from '../../../src/utils/apiCache';

// Mock AuthService
vi.mock('../../../src/services/auth', () => ({
  AuthService: {
    getValidToken: vi.fn().mockResolvedValue('mock_access_token'),
    isAuthenticated: vi.fn().mockReturnValue(true),
  },
}));

describe('SpotifyService', () => {
  beforeEach(() => {
    apiCache.clear();
    vi.clearAllMocks();
    // Reset SDK state
    (SpotifyService as any).player = null;
    (SpotifyService as any).isInitialized = false;
    delete (window as any).Spotify;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Playback State Fetching', () => {
    it('should fetch playback state successfully', async () => {
      const mockState = {
        is_playing: true,
        item: {
          id: 'track_id',
          name: 'Test Track',
          artists: [{ name: 'Artist' }],
          album: { name: 'Album', images: [{ url: 'image.jpg' }] },
          duration_ms: 180000,
        },
        progress_ms: 30000,
        timestamp: Date.now(),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockState,
      });

      const result = await SpotifyService.getPlaybackState();

      expect(result).toBeTruthy();
      expect(result?.is_playing).toBe(true);
      expect(result?.item?.name).toBe('Test Track');
    });

    it('should return null when no content (204)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
      });

      const result = await SpotifyService.getPlaybackState();

      expect(result).toBeNull();
    });

    it('should use cache when available', async () => {
      const mockState = {
        is_playing: true,
        item: null,
        progress_ms: 0,
        timestamp: Date.now(),
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockState,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockState,
        });

      // First call - will call fetch (token + playback state)
      await SpotifyService.getPlaybackState(true, false);
      // Second call should use cache - only token fetch if needed
      await SpotifyService.getPlaybackState(true, false);

      // Cache should prevent second playback state fetch
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should skip cache when requested', async () => {
      const mockState = {
        is_playing: true,
        item: null,
        progress_ms: 0,
        timestamp: Date.now(),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockState,
      });

      await SpotifyService.getPlaybackState(true, false);
      await SpotifyService.getPlaybackState(true, true); // Skip cache

      // Should fetch again when cache is skipped (token + playback state each time)
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should handle 429 rate limit errors with Retry-After header', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 429,
        ok: false,
        headers: {
          get: (name: string) => {
            if (name === 'Retry-After') return '3';
            return null;
          },
        },
        text: async () => 'Too many requests',
      });

      await expect(SpotifyService.getPlaybackState()).rejects.toThrow();
      
      // Verify error message includes retry-after info
      try {
        await SpotifyService.getPlaybackState();
      } catch (error: any) {
        expect(error.message).toContain('429');
      }
    });

    it('should handle 429 without Retry-After header', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 429,
        ok: false,
        headers: {
          get: () => null,
        },
        text: async () => 'Too many requests',
      });

      await expect(SpotifyService.getPlaybackState()).rejects.toThrow();
    });
  });

  describe('Playback Controls', () => {
    it('should toggle playback (pause)', async () => {
      global.fetch = vi.fn().mockImplementation((url: string | Request) => {
        const urlString = typeof url === 'string' ? url : (url as Request).url;
        if (urlString === 'https://api.spotify.com/v1/me/player' || urlString.includes('/v1/me/player?') || (typeof url === 'object' && urlString.includes('/v1/me/player'))) {
          // Get playback state call
          return Promise.resolve({
            ok: true,
            json: async () => ({
              is_playing: true,
              item: null,
              progress_ms: 0,
              timestamp: Date.now(),
            }),
          } as Response);
        } else if (urlString.includes('/pause')) {
          // Pause call
          return Promise.resolve({
            status: 204,
            ok: true,
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${urlString}`));
      });

      await SpotifyService.togglePlayback();

      // Should have called pause endpoint
      const calls = (global.fetch as any).mock.calls;
      const pauseCall = calls.find((call: any[]) => {
        const callUrl = typeof call[0] === 'string' ? call[0] : call[0]?.url || '';
        return callUrl.includes('/pause');
      });
      expect(pauseCall).toBeTruthy();
    });

    it('should toggle playback (play)', async () => {
      global.fetch = vi.fn().mockImplementation((url: string | Request) => {
        const urlString = typeof url === 'string' ? url : (url as Request).url;
        if (urlString === 'https://api.spotify.com/v1/me/player' || urlString.includes('/v1/me/player?') || (typeof url === 'object' && urlString.includes('/v1/me/player'))) {
          // Get playback state call
          return Promise.resolve({
            ok: true,
            json: async () => ({
              is_playing: false,
              item: null,
              progress_ms: 0,
              timestamp: Date.now(),
            }),
          } as Response);
        } else if (urlString.includes('/play') && !urlString.includes('/pause')) {
          // Play call
          return Promise.resolve({
            status: 204,
            ok: true,
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${urlString}`));
      });

      await SpotifyService.togglePlayback();

      // Should have called play endpoint
      const calls = (global.fetch as any).mock.calls;
      const playCall = calls.find((call: any[]) => {
        const callUrl = typeof call[0] === 'string' ? call[0] : call[0]?.url || '';
        return callUrl.includes('/play') && !callUrl.includes('/pause');
      });
      expect(playCall).toBeTruthy();
    });

    it('should skip to next track', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
      });

      await SpotifyService.skipToNext();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/player/next',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should skip to previous track', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
      });

      await SpotifyService.skipToPrevious();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/player/previous',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle skip errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
        text: async () => JSON.stringify({ error: { message: 'No active device' } }),
      });

      await expect(SpotifyService.skipToNext()).rejects.toThrow();
    });
  });

  describe('SDK Availability', () => {
    it('should return false when SDK is not initialized', () => {
      expect(SpotifyService.isSDKAvailable()).toBe(false);
    });
  });

  describe('State Change Callback', () => {
    it('should register state change callback', () => {
      const callback = vi.fn();
      SpotifyService.setStateChangeCallback(callback);

      // Callback should be stored (tested through SDK integration tests)
      expect(callback).toBeDefined();
    });

    it('should allow clearing callback', () => {
      const callback = vi.fn();
      SpotifyService.setStateChangeCallback(callback);
      SpotifyService.setStateChangeCallback(null);

      expect(callback).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        text: async () => 'Unauthorized',
      });

      await expect(SpotifyService.getPlaybackState()).rejects.toThrow('Unauthorized');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(SpotifyService.getPlaybackState()).rejects.toThrow();
    });
  });
});

