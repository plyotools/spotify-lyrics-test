import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LyricsService } from '../../../src/services/lyrics';

describe('LyricsService', () => {
  beforeEach(() => {
    LyricsService.clearCache();
    vi.clearAllMocks();
  });

  describe('LRCLIB Integration', () => {
    it('should fetch lyrics from LRCLIB API', async () => {
      const mockLRC = `[00:12.00]First line
[00:15.50]Second line`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          syncedLyrics: mockLRC,
          name: 'Test Song',
          artistName: 'Test Artist',
        }),
      });

      const result = await LyricsService.getSynchronizedLyrics('Test Artist', 'Test Song');

      expect(result).toBeTruthy();
      expect(result?.lines.length).toBeGreaterThan(0);
      expect(result?.synced).toBe(true);
    });

    it('should handle 404 when lyrics not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await LyricsService.getSynchronizedLyrics('Unknown Artist', 'Unknown Song');

      expect(result).toBeNull();
    });

    it('should retry without duration if initial request fails', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            syncedLyrics: '[00:10.00]Test line',
          }),
        });

      const result = await LyricsService.getSynchronizedLyrics('Artist', 'Song', 180000);

      expect(result).toBeTruthy();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('LRC Parsing', () => {
    it('should parse basic LRC format', () => {
      const lrc = `[00:12.00]First line of lyrics
[00:15.50]Second line here
[00:18.75]Third line continues`;

      const result = LyricsService.parseLRC(lrc);

      expect(result.lines.length).toBe(3);
      expect(result.synced).toBe(true);
      expect(result.lines[0].time).toBe(12000);
      expect(result.lines[0].text).toBe('First line of lyrics');
      expect(result.lines[1].time).toBe(15500);
    });

    it('should parse word-level timestamps', () => {
      const lrc = `[00:12.00][00:12.00]First [00:13.00]word [00:14.00]here`;

      const result = LyricsService.parseLRC(lrc);

      expect(result.hasWordTimestamps).toBe(true);
      expect(result.lines[0].words).toBeDefined();
      expect(result.lines[0].words?.length).toBeGreaterThan(0);
    });

    it('should handle various timestamp formats', () => {
      const lrc = `[0:12.00]Short minutes
[01:05.50]Two digit minutes
[12:30.25]Long format`;

      const result = LyricsService.parseLRC(lrc);

      expect(result.lines.length).toBe(3);
      expect(result.lines[0].time).toBe(12000);
      expect(result.lines[1].time).toBe(65500);
      expect(result.lines[2].time).toBe(750250);
    });

    it('should sort lines by timestamp', () => {
      const lrc = `[00:30.00]Third line
[00:10.00]First line
[00:20.00]Second line`;

      const result = LyricsService.parseLRC(lrc);

      expect(result.lines[0].time).toBe(10000);
      expect(result.lines[1].time).toBe(20000);
      expect(result.lines[2].time).toBe(30000);
    });
  });

  describe('Caching', () => {
    it('should cache lyrics results', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          syncedLyrics: '[00:10.00]Cached lyrics',
        }),
      });

      // First call
      await LyricsService.getSynchronizedLyrics('Artist', 'Song');
      // Second call should use cache
      await LyricsService.getSynchronizedLyrics('Artist', 'Song');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          syncedLyrics: '[00:10.00]Test',
        }),
      });

      await LyricsService.getSynchronizedLyrics('Artist', 'Song');
      LyricsService.clearCache();
      await LyricsService.getSynchronizedLyrics('Artist', 'Song');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await LyricsService.getSynchronizedLyrics('Artist', 'Song');

      expect(result).toBeNull();
    });

    it('should handle invalid JSON responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await LyricsService.getSynchronizedLyrics('Artist', 'Song');

      expect(result).toBeNull();
    });
  });

  describe('Plain Lyrics Fallback', () => {
    it('should handle plain lyrics when synced not available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          plainLyrics: 'Line 1\nLine 2\nLine 3',
        }),
      });

      const result = await LyricsService.getSynchronizedLyrics('Artist', 'Song');

      expect(result).toBeTruthy();
      expect(result?.synced).toBe(false);
      expect(result?.lines.length).toBe(3);
    });
  });
});






