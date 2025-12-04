// Test data fixtures

export const mockTrack = {
  id: 'test_track_id',
  name: 'Test Song',
  artists: [{ name: 'Test Artist' }],
  album: {
    name: 'Test Album',
    images: [{ url: 'https://via.placeholder.com/300' }],
  },
  duration_ms: 180000, // 3 minutes
};

export const mockPlaybackState = {
  is_playing: true,
  item: mockTrack,
  progress_ms: 30000,
  timestamp: Date.now(),
  context: {
    previous_tracks: [],
    next_tracks: [],
  },
};

export const mockLyricsLRC = `[00:12.00]First line of lyrics
[00:15.50]Second line here
[00:18.75]Third line continues
[00:22.00]Fourth line ends`;

export const mockAccessToken = 'mock_access_token_123';
export const mockRefreshToken = 'mock_refresh_token_456';



