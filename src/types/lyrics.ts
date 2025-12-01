export interface LyricWord {
  time: number; // Time in milliseconds when this word starts
  text: string;
  endTime?: number; // Optional: when this word ends (for better accuracy)
}

export interface LyricLine {
  time: number; // Time in milliseconds when this line starts
  text: string;
  words?: LyricWord[]; // Optional: word-level timestamps if available
}

export interface LyricsData {
  lines: LyricLine[];
  synced: boolean;
  hasWordTimestamps?: boolean; // Whether word-level timestamps are available
}

