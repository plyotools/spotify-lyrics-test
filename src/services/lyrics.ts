import type { LyricsData, LyricLine, LyricWord } from '../types/lyrics';

// LRCLIB API - Free, no API key required
const LRCLIB_BASE_URL = 'https://lrclib.net/api';

// Fallback: Musixmatch (if API key is provided)
const MUSIXMATCH_API_KEY = import.meta.env.VITE_MUSIXMATCH_API_KEY;
const MUSIXMATCH_BASE_URL = 'https://api.musixmatch.com/ws/1.1';

export class LyricsService {
  private static lyricsCache: Map<string, LyricsData> = new Map();

  /**
   * Fetch synchronized lyrics from LRCLIB (free, no API key needed)
   * API: https://lrclib.net/api/get?track_name={title}&artist_name={artist}&duration={duration}
   */
  static async getLyricsFromLRCLIB(
    artist: string,
    title: string,
    duration?: number
  ): Promise<LyricsData | null> {
    try {
      const params = new URLSearchParams({
        track_name: title,
        artist_name: artist,
      });
      
      if (duration) {
        params.append('duration', Math.round(duration / 1000).toString());
      }

      const response = await fetch(`${LRCLIB_BASE_URL}/get?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Lyrics not found
        }
        // Try without duration if it was provided
        if (duration) {
          const paramsWithoutDuration = new URLSearchParams({
            track_name: title,
            artist_name: artist,
          });
          const retryResponse = await fetch(`${LRCLIB_BASE_URL}/get?${paramsWithoutDuration.toString()}`);
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            if (retryData?.syncedLyrics) {
              return this.parseLRC(retryData.syncedLyrics);
            }
          }
        }
        return null;
      }

      const data = await response.json();
      
      // LRCLIB returns syncedLyrics field with LRC format string
      if (data?.syncedLyrics) {
        return this.parseLRC(data.syncedLyrics);
      }
      
      // Alternative: check for plainLyrics if synced not available
      if (data?.plainLyrics) {
        const lines = data.plainLyrics
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => ({
            time: 0,
            text: line.trim(),
          }));
        return { lines, synced: false };
      }

      return null;
    } catch (error) {
      console.error('Error fetching lyrics from LRCLIB:', error);
      return null;
    }
  }

  /**
   * Fallback: Musixmatch API (requires API key)
   */
  static async searchTrackMusixmatch(artist: string, title: string): Promise<number | null> {
    if (!MUSIXMATCH_API_KEY) {
      return null;
    }

    try {
      const response = await fetch(
        `${MUSIXMATCH_BASE_URL}/track.search?` +
          new URLSearchParams({
            apikey: MUSIXMATCH_API_KEY,
            q_artist: artist,
            q_track: title,
            f_has_lyrics: '1',
            s_track_rating: 'desc',
            page_size: '1',
            page: '1',
          }).toString()
      );

      if (!response.ok) {
        throw new Error('Failed to search track');
      }

      const data = await response.json();
      const trackList = data.message?.body?.track_list;
      if (trackList && trackList.length > 0) {
        return trackList[0].track.track_id;
      }
      return null;
    } catch (error) {
      console.error('Error searching track on Musixmatch:', error);
      return null;
    }
  }

  static async getLyricsMusixmatch(trackId: number): Promise<LyricsData | null> {
    if (!MUSIXMATCH_API_KEY) {
      return null;
    }

    try {
      const response = await fetch(
        `${MUSIXMATCH_BASE_URL}/track.lyrics.get?` +
          new URLSearchParams({
            apikey: MUSIXMATCH_API_KEY,
            track_id: trackId.toString(),
          }).toString()
      );

      if (!response.ok) {
        throw new Error('Failed to fetch lyrics');
      }

      const data = await response.json();
      const lyricsBody = data.message?.body?.lyrics;
      if (!lyricsBody) {
        return null;
      }

      const lyricsText = lyricsBody.lyrics_body;
      if (!lyricsText) {
        return null;
      }

      // Check if lyrics are synced (LRC format)
      const isSynced = lyricsBody.lyrics_language === 'en' || lyricsText.includes('[');

      if (isSynced) {
        return this.parseLRC(lyricsText);
      } else {
        // Plain text lyrics - convert to unsynced format
        const lines = lyricsText
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => ({
            time: 0,
            text: line.trim(),
          }));
        return { lines, synced: false };
      }
    } catch (error) {
      console.error('Error fetching lyrics from Musixmatch:', error);
      return null;
    }
  }

  /**
   * Parse a timestamp string to milliseconds
   */
  private static parseTimestamp(minutes: string, seconds: string, fraction?: string): number {
    const min = parseInt(minutes, 10);
    const sec = parseInt(seconds, 10);
    const frac = fraction ? parseInt(fraction, 10) : 0;
    
    let timeMs = (min * 60 + sec) * 1000;
    if (frac > 0) {
      if (frac < 100) {
        // Centiseconds (0-99)
        timeMs += frac * 10;
      } else {
        // Milliseconds (100-999)
        timeMs += frac;
      }
    }
    return timeMs;
  }

  /**
   * Parse word-level timestamps from enhanced LRC format
   * Format: [00:12.00]Hello [00:12.50]world [00:13.00]today
   */
  private static parseWordTimestamps(text: string, lineStartTime: number, nextLineTime?: number): LyricWord[] {
    const words: LyricWord[] = [];
    
    // Match all timestamps in the text: [mm:ss.xx]word
    const wordPattern = /\[(\d{1,2}):(\d{2})(?:[:.](\d{2,3}))?\]([^\[]+)/g;
    let match;
    
    while ((match = wordPattern.exec(text)) !== null) {
      const wordTime = this.parseTimestamp(match[1], match[2], match[3]);
      const wordText = match[4].trim();
      
      if (wordText) {
        words.push({
          time: wordTime,
          text: wordText,
        });
      }
    }
    
    // If no word timestamps found, estimate them based on line timing
    if (words.length === 0) {
      const wordTexts = text.split(/\s+/).filter(w => w.length > 0);
      const lineDuration = nextLineTime ? nextLineTime - lineStartTime : 3000; // Default 3 seconds per line
      const wordDuration = lineDuration / wordTexts.length;
      
      wordTexts.forEach((word, index) => {
        words.push({
          time: lineStartTime + (index * wordDuration),
          text: word,
        });
      });
    } else {
      // Calculate end times for words
      words.forEach((word, index) => {
        if (index < words.length - 1) {
          word.endTime = words[index + 1].time;
        } else if (nextLineTime) {
          word.endTime = nextLineTime;
        } else {
          // Estimate end time based on word length (roughly 200ms per character)
          word.endTime = word.time + (word.text.length * 200);
        }
      });
    }
    
    return words;
  }

  static parseLRC(lrcText: string): LyricsData {
    const lines: LyricLine[] = [];
    const lrcLines = lrcText.split('\n');
    let hasWordTimestamps = false;

    for (let i = 0; i < lrcLines.length; i++) {
      const trimmed = lrcLines[i].trim();
      if (!trimmed) continue;

      // Match LRC format: [mm:ss.xx] or [mm:ss:xx] or [mm:ss] or [m:ss.xx]
      // Also handle [mm:ss.xxx] format (milliseconds)
      const timeMatch = trimmed.match(/^\[(\d{1,2}):(\d{2})(?:[:.](\d{2,3}))?\]/);
      if (timeMatch) {
        const lineStartTime = this.parseTimestamp(timeMatch[1], timeMatch[2], timeMatch[3]);
        
        // Get the text after the timestamp
        const textAfterTimestamp = trimmed.replace(/^\[\d{1,2}:\d{2}(?:[:.]\d{2,3})?\]/, '').trim();

        if (textAfterTimestamp) {
          // Check if this line has word-level timestamps (enhanced LRC)
          const hasWordLevelTimestamps = /\[\d{1,2}:\d{2}(?:[:.]\d{2,3})?\]/.test(textAfterTimestamp);
          
          // Get next line time for word duration estimation
          let nextLineTime: number | undefined;
          for (let j = i + 1; j < lrcLines.length; j++) {
            const nextTrimmed = lrcLines[j].trim();
            const nextTimeMatch = nextTrimmed.match(/^\[(\d{1,2}):(\d{2})(?:[:.](\d{2,3}))?\]/);
            if (nextTimeMatch) {
              nextLineTime = this.parseTimestamp(nextTimeMatch[1], nextTimeMatch[2], nextTimeMatch[3]);
              break;
            }
          }
          
          // Parse word-level timestamps if available
          const words = hasWordLevelTimestamps 
            ? this.parseWordTimestamps(textAfterTimestamp, lineStartTime, nextLineTime)
            : this.parseWordTimestamps(textAfterTimestamp, lineStartTime, nextLineTime); // Always parse to estimate
          
          if (hasWordLevelTimestamps) {
            hasWordTimestamps = true;
          }
          
          // Clean text (remove timestamps for display)
          const cleanText = textAfterTimestamp.replace(/\[\d{1,2}:\d{2}(?:[:.]\d{2,3})?\]/g, '').trim();
          
          lines.push({ 
            time: lineStartTime, 
            text: cleanText,
            words: words.length > 0 ? words : undefined
          });
        }
      } else if (trimmed && !trimmed.startsWith('[')) {
        // Line without timestamp (metadata or plain text)
        // Skip metadata lines like [ar:Artist], [ti:Title], etc.
        if (!trimmed.match(/^\[[a-z]+:/i)) {
          lines.push({ time: 0, text: trimmed });
        }
      }
    }

    // Sort by time
    lines.sort((a, b) => a.time - b.time);

    return { lines, synced: true, hasWordTimestamps };
  }

  /**
   * Main method to get synchronized lyrics
   * Tries LRCLIB first (free), then falls back to Musixmatch if API key is available
   */
  static async getSynchronizedLyrics(
    artist: string,
    title: string,
    duration?: number
  ): Promise<LyricsData | null> {
    // Check cache first
    const cacheKey = `${artist}-${title}`.toLowerCase();
    if (this.lyricsCache.has(cacheKey)) {
      return this.lyricsCache.get(cacheKey)!;
    }

    // Try LRCLIB first (free, no API key needed)
    let lyrics = await this.getLyricsFromLRCLIB(artist, title, duration);
    
    // Fallback to Musixmatch if LRCLIB doesn't have the lyrics
    if (!lyrics && MUSIXMATCH_API_KEY) {
      const trackId = await this.searchTrackMusixmatch(artist, title);
      if (trackId) {
        lyrics = await this.getLyricsMusixmatch(trackId);
      }
    }

    if (lyrics) {
      // Cache the result
      this.lyricsCache.set(cacheKey, lyrics);
    }

    return lyrics;
  }

  static clearCache(): void {
    this.lyricsCache.clear();
  }
}

// Re-export types for convenience
export type { LyricsData, LyricLine, LyricWord } from '../types/lyrics';
