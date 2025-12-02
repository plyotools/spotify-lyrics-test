import { http, HttpResponse } from 'msw';

// Mock data
const mockAccessToken = 'mock_access_token_123';
const mockRefreshToken = 'mock_refresh_token_456';

const mockTrack: any = {
  id: 'test_track_id',
  name: 'Test Song',
  artists: [{ name: 'Test Artist' }],
  album: {
    name: 'Test Album',
    images: [{ url: 'https://via.placeholder.com/300' }],
  },
  duration_ms: 180000, // 3 minutes
};

const mockPlaybackState = {
  is_playing: true,
  item: mockTrack,
  progress_ms: 30000,
  timestamp: Date.now(),
  context: {
    previous_tracks: [],
    next_tracks: [],
  },
};

const mockLyricsLRC = `[00:12.00]First line of lyrics
[00:15.50]Second line here
[00:18.75]Third line continues
[00:22.00]Fourth line ends`;

export const handlers = [
  // Spotify OAuth Token Exchange
  http.post('https://accounts.spotify.com/api/token', async ({ request }) => {
    const body = await request.formData();
    const grantType = body.get('grant_type');
    const code = body.get('code');
    const codeVerifier = body.get('code_verifier');
    const refreshToken = body.get('refresh_token');

    // Token exchange (authorization code flow)
    if (grantType === 'authorization_code' && code && codeVerifier) {
      return HttpResponse.json({
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        expires_in: 3600,
        token_type: 'Bearer',
      });
    }

    // Token refresh
    if (grantType === 'refresh_token' && refreshToken) {
      return HttpResponse.json({
        access_token: 'refreshed_access_token',
        expires_in: 3600,
        token_type: 'Bearer',
      });
    }

    // Invalid request
    return HttpResponse.json(
      { error: 'invalid_request' },
      { status: 400 }
    );
  }),

  // Spotify Playback State
  http.get('https://api.spotify.com/v1/me/player', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for rate limiting scenario
    const url = new URL(request.url);
    if (url.searchParams.get('force_rate_limit') === 'true') {
      return HttpResponse.json(
        { error: { status: 429, message: 'Too many requests' } },
        { 
          status: 429,
          headers: {
            'Retry-After': '3',
          },
        }
      );
    }

    return HttpResponse.json(mockPlaybackState);
  }),

  // Spotify Currently Playing
  http.get('https://api.spotify.com/v1/me/player/currently-playing', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      item: mockTrack,
      is_playing: true,
      progress_ms: 30000,
    });
  }),

  // Spotify Queue
  http.get('https://api.spotify.com/v1/me/player/queue', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      queue: [],
    });
  }),

  // Spotify Play
  http.put('https://api.spotify.com/v1/me/player/play', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Spotify Pause
  http.put('https://api.spotify.com/v1/me/player/pause', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Spotify Skip Next
  http.post('https://api.spotify.com/v1/me/player/next', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Spotify Skip Previous
  http.post('https://api.spotify.com/v1/me/player/previous', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Spotify Seek
  http.put('https://api.spotify.com/v1/me/player/seek', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // LRCLIB Lyrics API
  http.get('https://lrclib.net/api/get', ({ request }) => {
    const url = new URL(request.url);
    const trackName = url.searchParams.get('track_name');
    const artistName = url.searchParams.get('artist_name');

    if (!trackName || !artistName) {
      return HttpResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Return mock lyrics
    return HttpResponse.json({
      syncedLyrics: mockLyricsLRC,
      plainLyrics: 'First line of lyrics\nSecond line here\nThird line continues\nFourth line ends',
      name: trackName,
      artistName: artistName,
    });
  }),

  // Musixmatch Track Search (optional fallback)
  http.get('https://api.musixmatch.com/ws/1.1/track.search', ({ request }) => {
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('apikey');

    if (!apiKey) {
      return HttpResponse.json(
        { message: { body: { error: 'API key required' } } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      message: {
        body: {
          track_list: [
            {
              track: {
                track_id: 12345,
                track_name: 'Test Song',
                artist_name: 'Test Artist',
              },
            },
          ],
        },
      },
    });
  }),

  // Musixmatch Lyrics (optional fallback)
  http.get('https://api.musixmatch.com/ws/1.1/track.lyrics.get', ({ request }) => {
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('apikey');

    if (!apiKey) {
      return HttpResponse.json(
        { message: { body: { error: 'API key required' } } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      message: {
        body: {
          lyrics: {
            lyrics_body: 'First line of lyrics\nSecond line here\nThird line continues\nFourth line ends',
          },
        },
      },
    });
  }),
];

