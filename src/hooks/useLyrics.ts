import { useMemo } from 'react';
import type { LyricsData, LyricLine } from '../types/lyrics';

export interface ActiveLyric {
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  currentIndex: number;
  currentWordIndex: number; // Index of the current word in the current line
  isPause: boolean; // Whether we're in a pause between lines
}

export const useLyrics = (lyrics: LyricsData | null, currentPosition: number): ActiveLyric => {
  return useMemo(() => {
    if (!lyrics || !lyrics.synced || lyrics.lines.length === 0) {
      return {
        currentLine: null,
        nextLine: null,
        currentIndex: -1,
        currentWordIndex: -1,
        isPause: false,
      };
    }

    // Find the current line based on position
    let currentIndex = -1;
    
    // Simple linear search - find the last line where time <= currentPosition
    for (let i = lyrics.lines.length - 1; i >= 0; i--) {
      if (lyrics.lines[i].time <= currentPosition) {
        currentIndex = i;
        break;
      }
    }

    // If we're before the first line, show nothing
    if (currentIndex === -1 && lyrics.lines[0]?.time > currentPosition) {
      return {
        currentLine: null,
        nextLine: lyrics.lines[0] || null,
        currentIndex: -1,
        currentWordIndex: -1,
        isPause: false,
      };
    }

    // If we're after the last line, show the last line
    if (currentIndex === -1) {
      currentIndex = lyrics.lines.length - 1;
    }

    const currentLine = lyrics.lines[currentIndex] || null;
    const nextLine = lyrics.lines[currentIndex + 1] || null;
    let currentWordIndex = -1;
    let isPause = false;

    // Calculate the end time of the current line
    let lineEndTime: number | null = null;
    if (currentLine) {
      if (currentLine.words && currentLine.words.length > 0) {
        // Use the last word's end time, or estimate based on next word/line
        const lastWord = currentLine.words[currentLine.words.length - 1];
        lineEndTime = lastWord.endTime || (nextLine ? nextLine.time : lastWord.time + 3000);
      } else {
        // No word timestamps - estimate line duration (default 3 seconds or until next line)
        lineEndTime = nextLine ? nextLine.time : currentLine.time + 3000;
      }
    }

    // Find the current word within the line
    if (currentLine && currentLine.words && currentLine.words.length > 0) {
      // Find the last word where time <= currentPosition
      for (let i = currentLine.words.length - 1; i >= 0; i--) {
        const word = currentLine.words[i];
        const wordEndTime = word.endTime || (i < currentLine.words.length - 1 
          ? currentLine.words[i + 1].time 
          : lineEndTime || currentLine.time + 3000);
        
        if (word.time <= currentPosition && currentPosition <= wordEndTime) {
          currentWordIndex = i;
          break;
        }
      }
      
      // If no word matches, check if we're before the first word
      if (currentWordIndex === -1 && currentLine.words[0]?.time > currentPosition) {
        currentWordIndex = -1; // Before first word
      } else if (currentWordIndex === -1) {
        // We're in the line but past all words, show last word
        currentWordIndex = currentLine.words.length - 1;
      }
    }

    // Detect pause: we're past the current line's end time but before the next line starts
    // Only consider it a pause if there's a gap of at least 500ms
    if (currentLine && lineEndTime && nextLine) {
      const gapDuration = nextLine.time - lineEndTime;
      if (currentPosition > lineEndTime && currentPosition < nextLine.time && gapDuration >= 500) {
        isPause = true;
      }
    }

    return {
      currentLine,
      nextLine,
      currentIndex,
      currentWordIndex,
      isPause,
    };
  }, [lyrics, currentPosition]);
};

