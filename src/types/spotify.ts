export interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
}

export interface PlaybackState {
  is_playing: boolean;
  item: Track | null;
  progress_ms: number;
  timestamp: number;
  context?: {
    previous_tracks?: Track[];
    next_tracks?: Track[];
  };
}

