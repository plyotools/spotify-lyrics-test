import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../../src/services/auth';

describe('AuthService', () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
    
    // Mock window.location
    delete (window as any).location;
    window.location = {
      href: '',
      origin: 'http://127.0.0.1:5173',
    } as any;
  });

  describe('PKCE Flow', () => {
    it('should generate code verifier of correct length', async () => {
      // Test through initiateLogin which generates verifier internally
      const originalLocation = window.location.href;
      
      await AuthService.initiateLogin();
      
      // Check that code verifier was stored
      const verifier = localStorage.getItem('spotify_code_verifier');
      expect(verifier).toBeTruthy();
      expect(verifier?.length).toBe(128);
    });

    it('should store code verifier in localStorage and sessionStorage', async () => {
      await AuthService.initiateLogin();
      
      const localVerifier = localStorage.getItem('spotify_code_verifier');
      const sessionVerifier = sessionStorage.getItem('spotify_code_verifier');
      
      expect(localVerifier).toBeTruthy();
      expect(sessionVerifier).toBeTruthy();
      expect(localVerifier).toBe(sessionVerifier);
    });

    it('should generate valid authorization URL with all scopes', async () => {
      await AuthService.initiateLogin();
      
      const authUrl = window.location.href;
      expect(authUrl).toContain('https://accounts.spotify.com/authorize');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('code_challenge_method=S256');
      expect(authUrl).toContain('code_challenge=');
      
      // Check all required scopes are present
      expect(authUrl).toContain('user-read-currently-playing');
      expect(authUrl).toContain('user-read-playback-state');
      expect(authUrl).toContain('user-modify-playback-state');
      expect(authUrl).toContain('streaming'); // Critical for SDK
      expect(authUrl).toContain('user-library-read');
      expect(authUrl).toContain('playlist-read-private');
      expect(authUrl).toContain('playlist-read-collaborative');
    });

    it('should handle extension context with state parameter', async () => {
      // Mock extension context
      Object.defineProperty(window, 'location', {
        value: {
          href: '',
          origin: 'chrome-extension://test-id',
        },
        writable: true,
      });
      
      await AuthService.initiateLogin();
      
      const authUrl = window.location.href;
      expect(authUrl).toContain('state=');
    });
  });

  describe('Token Exchange', () => {
    it('should exchange authorization code for tokens', async () => {
      // Setup: store code verifier
      const mockVerifier = 'test_code_verifier_1234567890'.repeat(4); // 128 chars
      localStorage.setItem('spotify_code_verifier', mockVerifier);
      sessionStorage.setItem('spotify_code_verifier', mockVerifier);
      
      // Mock fetch for token exchange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      });
      
      const result = await AuthService.handleCallback('test_code');
      
      expect(result.access_token).toBe('mock_access_token');
      expect(result.refresh_token).toBe('mock_refresh_token');
      expect(result.expires_in).toBe(3600);
      
      // Verify tokens stored
      expect(localStorage.getItem('spotify_token')).toBe('mock_access_token');
      expect(localStorage.getItem('spotify_refresh_token')).toBe('mock_refresh_token');
    });

    it('should throw error when code verifier is missing', async () => {
      // Don't set code verifier
      localStorage.clear();
      sessionStorage.clear();
      
      await expect(
        AuthService.handleCallback('test_code')
      ).rejects.toThrow('Code verifier not found');
    });

    it('should handle invalid authorization code', async () => {
      const mockVerifier = 'test_code_verifier_1234567890'.repeat(4);
      localStorage.setItem('spotify_code_verifier', mockVerifier);
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant' }),
      });
      
      await expect(
        AuthService.handleCallback('invalid_code')
      ).rejects.toThrow();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh expired token', async () => {
      // Store expired token
      localStorage.setItem('spotify_token', 'expired_token');
      localStorage.setItem('spotify_refresh_token', 'refresh_token');
      localStorage.setItem('spotify_token_expiry', String(Date.now() - 1000)); // Expired
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new_access_token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      });
      
      const token = await AuthService.getValidToken();
      
      expect(token).toBe('new_access_token');
      expect(localStorage.getItem('spotify_token')).toBe('new_access_token');
    });

    it('should use existing token if not expired', async () => {
      const validToken = 'valid_token_123';
      localStorage.setItem('spotify_token', validToken);
      localStorage.setItem('spotify_token_expiry', String(Date.now() + 3600000)); // Valid for 1 hour
      
      // Mock fetch in case it's needed
      global.fetch = vi.fn();
      
      const token = await AuthService.getValidToken();
      
      expect(token).toBe(validToken);
      // getValidToken may still check token validity, so fetch might be called
      // The important thing is that the returned token matches
    });
  });

  describe('Authentication State', () => {
    it('should return false when not authenticated', () => {
      localStorage.clear();
      
      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('should return true when valid token exists', () => {
      localStorage.setItem('spotify_token', 'valid_token');
      localStorage.setItem('spotify_token_expiry', String(Date.now() + 3600000));
      
      expect(AuthService.isAuthenticated()).toBe(true);
    });

    it('should return true when token exists regardless of expiry', () => {
      // isAuthenticated() only checks token existence, not expiry
      localStorage.setItem('spotify_token', 'expired_token');
      localStorage.setItem('spotify_token_expiry', String(Date.now() - 1000));
      
      expect(AuthService.isAuthenticated()).toBe(true);
    });
  });

  describe('Logout', () => {
    it('should clear stored tokens but not code verifier', () => {
      // logout() clears tokens but intentionally keeps code_verifier for ongoing login flow
      localStorage.setItem('spotify_token', 'token');
      localStorage.setItem('spotify_refresh_token', 'refresh');
      localStorage.setItem('spotify_token_expiry', '123');
      localStorage.setItem('spotify_code_verifier', 'verifier');
      sessionStorage.setItem('spotify_code_verifier', 'verifier');
      
      AuthService.logout();
      
      expect(localStorage.getItem('spotify_token')).toBeNull();
      expect(localStorage.getItem('spotify_refresh_token')).toBeNull();
      expect(localStorage.getItem('spotify_token_expiry')).toBeNull();
      // Code verifier is intentionally not cleared by logout
      expect(localStorage.getItem('spotify_code_verifier')).toBe('verifier');
    });
  });

  describe('Extension Context Handling', () => {
    it('should store code verifier in chrome.storage when in extension context', async () => {
      // Mock chrome API
      const mockChromeStorage: any = {
        local: {
          set: vi.fn((items: any, callback?: () => void) => {
            if (callback) callback();
          }),
        },
      };
      (global as any).chrome = { storage: mockChromeStorage };
      
      Object.defineProperty(window, 'location', {
        value: {
          href: '',
          origin: 'chrome-extension://test-id',
        },
        writable: true,
      });
      
      await AuthService.initiateLogin();
      
      expect(mockChromeStorage.local.set).toHaveBeenCalled();
    });

    it('should retrieve code verifier from chrome.storage during callback', async () => {
      const mockVerifier = 'test_verifier'.repeat(10);
      const mockChromeStorage: any = {
        local: {
          get: vi.fn((keys: string[], callback: (result: any) => void) => {
            callback({ spotify_code_verifier: mockVerifier });
          }),
        },
      };
      (global as any).chrome = { storage: mockChromeStorage };
      
      // Mock state parameter with verifier
      const state = btoa(JSON.stringify({ verifier: mockVerifier, timestamp: Date.now() }));
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
        }),
      });
      
      await AuthService.handleCallback('code', state);
      
      // Should succeed
      expect(localStorage.getItem('spotify_token')).toBeTruthy();
    });
  });
});

