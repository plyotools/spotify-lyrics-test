const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// Use environment variable if set, otherwise default based on context
const getDefaultRedirectUri = () => {
  // If env variable is set, use it (most reliable)
  if (import.meta.env.VITE_SPOTIFY_REDIRECT_URI) {
    return import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  }
  
  const origin = window.location.origin;
  // For Chrome extensions, we need to use a web URL that Spotify accepts
  // Default to 127.0.0.1:5173/callback (the original working setup)
  if (origin.startsWith('chrome-extension://')) {
    return 'http://127.0.0.1:5173/callback';
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
  refresh_token: string;
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
    ];
    
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
    
    const scopeString = scopes.join(' ');
    console.log('Authorization request:', {
      redirect_uri: REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID,
      scopes: scopeString,
    });
    
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI, // Must match exactly what's in Spotify app settings
      scope: scopeString,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });
    
    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    console.log('Full auth URL (first 200 chars):', authUrl.substring(0, 200));
    return authUrl;
  }

  static async initiateLogin(): Promise<void> {
    const url = await this.getAuthUrl();
    window.location.href = url;
  }

  static async handleCallback(code: string): Promise<TokenResponse> {
    const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
    if (!codeVerifier) {
      throw new Error('Code verifier not found. Please try logging in again.');
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
        throw new Error('Authorization code already used or expired. Please log in again.');
      }
      
      throw new Error('Failed to exchange code for token');
    }

    const data: TokenResponse = await response.json();
    this.storeTokens(data);
    // Clean up code verifier immediately after successful exchange
    localStorage.removeItem(CODE_VERIFIER_KEY);
    return data;
  }

  static storeTokens(tokenData: TokenResponse): void {
    const expiryTime = Date.now() + tokenData.expires_in * 1000;
    localStorage.setItem(TOKEN_STORAGE_KEY, tokenData.access_token);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenData.refresh_token);
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
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in,
    };
    this.storeTokens(tokenData);
    return tokenData.access_token;
  }

  static async getValidToken(): Promise<string> {
    if (this.isTokenExpired()) {
      return await this.refreshAccessToken();
    }
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    return token;
  }

  static logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

