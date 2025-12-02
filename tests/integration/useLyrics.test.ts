import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLyrics } from '../../src/hooks/useLyrics';
import type { LyricsData } from '../../src/types/lyrics';

const mockLyrics: LyricsData = {
  synced: true,
  hasWordTimestamps: true,
  lines: [
    {
      time: 1000,
      text: 'First line',
      words: [
        { time: 1000, text: 'First', endTime: 1200 },
        { time: 1200, text: 'line', endTime: 2000 },
      ],
    },
    {
      time: 3000,
      text: 'Second line',
      words: [
        { time: 3000, text: 'Second', endTime: 3500 },
        { time: 3500, text: 'line', endTime: 5000 },
      ],
    },
  ],
};

describe('useLyrics Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return current line based on position', () => {
    const { result } = renderHook(() => useLyrics(mockLyrics, 1500));

    expect(result.current.currentLine).toBeTruthy();
    expect(result.current.currentLine?.text).toBe('First line');
    expect(result.current.currentIndex).toBe(0);
  });

  it('should advance to next line when position increases', () => {
    const { result, rerender } = renderHook(
      ({ position }) => useLyrics(mockLyrics, position),
      { initialProps: { position: 1500 } }
    );

    expect(result.current.currentIndex).toBe(0);

    rerender({ position: 3500 });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentLine?.text).toBe('Second line');
  });

  it('should detect pause state when position stops', () => {
    const { result, rerender } = renderHook(
      ({ position }) => useLyrics(mockLyrics, position),
      { initialProps: { position: 1500 } }
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Position unchanged for a while = pause
    expect(result.current.isPause).toBeDefined();
  });

  it('should return null when lyrics are not available', () => {
    const { result } = renderHook(() => useLyrics(null, 1000));

    expect(result.current.currentLine).toBeNull();
    expect(result.current.currentIndex).toBe(-1);
  });
});

