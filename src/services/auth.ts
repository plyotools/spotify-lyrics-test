// Declare chrome API types for extension context
declare const chrome: {
  storage?: {
    local?: {
      set: (items: Record<string, any>, callback?: () => void) => void;
      get: (keys: string[], callback: (result: Record<string, any>) => void) => void;
      remove: (keys: string[], callback?: () => void) => void;
    };
  };
  runtime?: {
    lastError?: Error;
  };
} | undefined;

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// Use environment variable if set, otherwise default based on context
const getDefaultRedirectUri = () => {
  // If env variable is set, use it (most reliable)
  if (import.meta.env.VITE_SPOTIFY_REDIRECT_URI) {
    return import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  }
  
  const origin = window.location.origin;
  // For Chrome extensions, we need to use a web URL that Spotify accepts
  // Default to 127.0.0.1:5175/callback (updated port to avoid conflicts)
  if (origin.startsWith('chrome-extension://')) {
    return 'http://127.0.0.1:5175/callback';
  }
  // Replace localhost with 127.0.0.1 if needed
  if (origin.includes('localhost')) {
    return origin.replace('localhost', '127.0.0.1') + '/callback';
  }
  return origin + '/callback';
};
const REDIRECT_URI = getDefaultRedirectUri();

// Log the redirect URI for debugging
console.log('Redirect URI:', REDIRECT_URI);
const TOKEN_STORAGE_KEY = 'spotify_token';
const REFRESH_TOKEN_STORAGE_KEY = 'spotify_refresh_token';
const TOKEN_EXPIRY_KEY = 'spotify_token_expiry';
const CODE_VERIFIER_KEY = 'spotify_code_verifier';

export interface TokenResponse {
  access_token: string;
  refresh_token?: string; // Optional - may not be present on subsequent auths
  expires_in: number;
}

export class AuthService {
  // Generate a random string for PKCE
  private static generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
  }

  // Generate code verifier for PKCE
  private static generateCodeVerifier(): string {
    return this.generateRandomString(128);
  }

  // Generate code challenge from verifier
  private static async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private static async getAuthUrl(): Promise<string> {
    const scopes = [
      'user-read-currently-playing',
      'user-read-playback-state',
      'user-modify-playback-state',
      'streaming', // Required for Web Playback SDK
      'user-library-read', // For saved albums
      'playlist-read-private', // For private playlists
      'playlist-read-collaborative', // For collaborative playlists
    ];
    
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    // Store in both localStorage and sessionStorage for better compatibility
    localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
    sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
    
    // Always pass code verifier in state parameter as backup (handles storage clearing issues)
    // This ensures we can retrieve it even if localStorage/sessionStorage is cleared
    const isExtension = window.location.origin.startsWith('chrome-extension://');
    let redirectUri = REDIRECT_URI;
    // Always encode code verifier in state parameter as backup
    const state = btoa(JSON.stringify({ verifier: codeVerifier, timestamp: Date.now() }));
    
    if (isExtension) {
      // Store in extension storage as well
      try {
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          chrome.storage.local.set({ [CODE_VERIFIER_KEY]: codeVerifier });
        }
      } catch (e) {
        console.warn('[LOGIN] Could not use chrome.storage:', e);
      }
    }
    
    console.log('[LOGIN] Code verifier stored in localStorage, sessionStorage, and state parameter');
    if (isExtension) {
      console.log('[LOGIN] Extension context detected - code verifier also in chrome.storage');
    }
    
    const scopeString = scopes.join(' ');
    console.log('[AUTH] Authorization request:', {
      redirect_uri: redirectUri,
      client_id: SPOTIFY_CLIENT_ID.substring(0, 10) + '...',
      scopes: scopeString,
      scope_list: scopes,
      is_extension: isExtension,
      show_dialog: true, // Force consent screen for scope approval
    });
    console.log('[AUTH] Requesting scopes:', scopes);
    
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri, // Must match exactly what's in Spotify app settings
      scope: scopeString,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      show_dialog: 'true', // Force consent screen to ensure user approves all scopes (including streaming)
      state: state, // Always include state with code verifier as backup
    });
    
    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    console.log('Full auth URL (first 200 chars):', authUrl.substring(0, 200));
    
    // Verify streaming scope is in the URL
    if (!authUrl.includes('streaming')) {
      console.error('⚠️ WARNING: "streaming" scope not found in auth URL!');
    } else {
      console.log('✅ "streaming" scope is included in auth URL');
    }
    
    // Log the full scope parameter for verification
    const scopeParam = params.get('scope');
    console.log('[AUTH] Scope parameter value:', scopeParam);
    console.log('[AUTH] Scope parameter includes "streaming":', scopeParam?.includes('streaming'));
    
    // Log the FULL authorization URL for debugging (decode URL to make it readable)
    console.log('[AUTH] ════════════════════════════════════════════════════════');
    console.log('[AUTH] 📋 AUTHORIZATION URL DEBUG INFO:');
    console.log('[AUTH] ════════════════════════════════════════════════════════');
    try {
      const urlObj = new URL(authUrl);
      const scopeParam = urlObj.searchParams.get('scope');
      console.log('[AUTH] Scope parameter (decoded):', decodeURIComponent(scopeParam || ''));
      console.log('[AUTH] Scope includes "streaming":', scopeParam?.includes('streaming') ? '✅ YES' : '❌ NO');
      console.log('[AUTH] All scopes requested:', scopeParam?.split(' ') || []);
    } catch (e) {
      console.warn('[AUTH] Could not parse URL:', e);
    }
    console.log('[AUTH] ⚠️  IMPORTANT: Before approving, check the browser address bar!');
    console.log('[AUTH] The URL should include: scope=...streaming...');
    console.log('[AUTH] ════════════════════════════════════════════════════════');
    
    return authUrl;
  }

  static async initiateLogin(): Promise<void> {
    console.log('[LOGIN] Initiating login process');
    // Clear any old code verifier before starting new login
    const oldVerifierLocal = localStorage.getItem(CODE_VERIFIER_KEY);
    const oldVerifierSession = sessionStorage.getItem(CODE_VERIFIER_KEY);
    if (oldVerifierLocal || oldVerifierSession) {
      console.log('[LOGIN] Clearing old code verifier before new login');
      localStorage.removeItem(CODE_VERIFIER_KEY);
      sessionStorage.removeItem(CODE_VERIFIER_KEY);
    }
    const url = await this.getAuthUrl();
    console.log('[LOGIN] Code verifier should be stored. Verifying...');
    const storedLocal = localStorage.getItem(CODE_VERIFIER_KEY);
    const storedSession = sessionStorage.getItem(CODE_VERIFIER_KEY);
    console.log('[LOGIN] Code verifier stored - localStorage:', !!storedLocal, 'sessionStorage:', !!storedSession);
    if (!storedLocal && !storedSession) {
      console.error('[LOGIN] ERROR: Code verifier not stored before redirect!');
      throw new Error('Failed to store code verifier. Please try again.');
    }
    console.log('[LOGIN] Redirecting to Spotify auth URL');
    window.location.href = url;
  }

  static async handleCallback(code: string, state?: string): Promise<TokenResponse> {
    console.log('[CALLBACK] Checking for code verifier...');
    
    // Try to get code verifier from multiple sources
    let codeVerifier: string | null = null;
    
    // First, try to get from state parameter (for extension context)
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        if (stateData.verifier && Date.now() - stateData.timestamp < 600000) { // 10 minutes
          codeVerifier = stateData.verifier;
          console.log('[CALLBACK] Code verifier found in state parameter');
        }
      } catch (e) {
        console.warn('[CALLBACK] Could not parse state parameter:', e);
      }
    }
    
    // Try sessionStorage
    if (!codeVerifier) {
      codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
      if (codeVerifier) {
        console.log('[CALLBACK] Code verifier found in sessionStorage');
      }
    }
    
    // Try localStorage
    if (!codeVerifier) {
      codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
      if (codeVerifier) {
        console.log('[CALLBACK] Code verifier found in localStorage');
      }
    }
    
    // Try Chrome extension storage
    if (!codeVerifier && typeof chrome !== 'undefined' && chrome?.storage?.local) {
      try {
        const result = await new Promise<{ [key: string]: string }>((resolve, reject) => {
          chrome!.storage!.local!.get([CODE_VERIFIER_KEY], (result: Record<string, any>) => {
            if (chrome?.runtime?.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result as { [key: string]: string });
            }
          });
        });
        codeVerifier = result[CODE_VERIFIER_KEY] || null;
        if (codeVerifier) {
          console.log('[CALLBACK] Code verifier found in chrome.storage.local');
        }
      } catch (e) {
        console.warn('[CALLBACK] Could not access chrome.storage:', e);
      }
    }
    
    console.log('[CALLBACK] Code verifier found:', !!codeVerifier);
    if (!codeVerifier) {
      console.error('[CALLBACK] Code verifier missing.');
      console.log('[CALLBACK] SessionStorage keys:', Object.keys(sessionStorage));
      console.log('[CALLBACK] LocalStorage keys:', Object.keys(localStorage));
      console.log('[CALLBACK] Current origin:', window.location.origin);
      console.log('[CALLBACK] Is extension:', window.location.protocol === 'chrome-extension:');
      console.log('[CALLBACK] State parameter:', state || 'none');
      // Clear any old state and redirect to login
      throw new Error('Code verifier not found. This usually means the login session expired. Please try logging in again.');
    }

    // IMPORTANT: The redirect_uri must match EXACTLY what was used in the authorization request
    // and what's registered in your Spotify app settings
    console.log('Token exchange:', {
      redirect_uri: REDIRECT_URI,
      hasCodeVerifier: !!codeVerifier,
      codeLength: code.length,
    });

    const requestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI, // Must match exactly what's in Spotify app settings
      client_id: SPOTIFY_CLIENT_ID,
      code_verifier: codeVerifier,
    });

    console.log('Token exchange request body:', {
      grant_type: 'authorization_code',
      code: code.substring(0, 20) + '...',
      redirect_uri: REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID.substring(0, 10) + '...',
      has_verifier: !!codeVerifier,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange error:', errorText);
      console.error('Request details:', {
        redirect_uri: REDIRECT_URI,
        code_length: code.length,
        verifier_length: codeVerifier.length,
        status: response.status,
        statusText: response.statusText,
      });
      
      // If invalid_grant, the code was already used - clear verifier to force new login
      if (errorText.includes('invalid_grant')) {
        localStorage.removeItem(CODE_VERIFIER_KEY);
        sessionStorage.removeItem(CODE_VERIFIER_KEY);
        throw new Error('Authorization code already used or expired. Please log in again.');
      }
      
      throw new Error('Failed to exchange code for token');
    }

    const data: TokenResponse = await response.json();
    
    // Log token response (without sensitive data)
    console.log('Token response received:', {
      has_access_token: !!data.access_token,
      has_refresh_token: !!data.refresh_token,
      expires_in: data.expires_in,
    });
    
    // Check if refresh token is present
    if (!data.refresh_token) {
      console.warn('No refresh token in response. Token refresh may not work.');
    }
    
    this.storeTokens(data);
    
    // Verify tokens were stored
    console.log('Tokens stored:', {
      access_token_stored: !!this.getAccessToken(),
      refresh_token_stored: !!this.getRefreshToken(),
    });
    
    // Clean up code verifier immediately after successful exchange
    localStorage.removeItem(CODE_VERIFIER_KEY);
    sessionStorage.removeItem(CODE_VERIFIER_KEY);
    return data;
  }

  static storeTokens(tokenData: TokenResponse): void {
    const expiryTime = Date.now() + tokenData.expires_in * 1000;
    localStorage.setItem(TOKEN_STORAGE_KEY, tokenData.access_token);
    
    // Only store refresh token if it's present
    // (Spotify may not return it on subsequent authorizations)
    if (tokenData.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenData.refresh_token);
    } else {
      console.warn('No refresh token provided - keeping existing refresh token if available');
      // Don't remove existing refresh token - keep it for future use
    }
    
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  static isTokenExpired(): boolean {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryTime) return true;
    return Date.now() >= parseInt(expiryTime, 10);
  }

  static async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    const tokenData: TokenResponse = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken || undefined,
      expires_in: data.expires_in,
    };
    this.storeTokens(tokenData);
    return tokenData.access_token;
  }

  static async getValidToken(): Promise<string> {
    if (this.isTokenExpired()) {
      console.log('Token expired, refreshing...');
      try {
        return await this.refreshAccessToken();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        throw error;
      }
    }
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    return token;
  }

  static logout(): void {
    console.log('[LOGOUT] Starting logout process');
    console.log('[LOGOUT] Clearing tokens from localStorage');
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    // Don't clear CODE_VERIFIER_KEY here - it might be needed for ongoing login flow
    // It will be cleared after successful auth or on new login attempt
    console.log('[LOGOUT] All tokens cleared');
    console.log('[LOGOUT] Logout complete - tokens removed');
  }

  static isAuthenticated(): boolean {
    const hasToken = !!this.getAccessToken();
    // Only log on state changes, not on every check
    // console.log('[AUTH CHECK] isAuthenticated:', hasToken);
    return hasToken;
  }
}

