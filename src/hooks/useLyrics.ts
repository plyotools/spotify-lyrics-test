import { useMemo } from 'react';
import type { LyricsData, LyricLine } from '../types/lyrics';

export interface ActiveLyric {
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  currentIndex: number;
  currentWordIndex: number; // Index of the current word in the current line
}

export const useLyrics = (lyrics: LyricsData | null, currentPosition: number): ActiveLyric => {
  return useMemo(() => {
    if (!lyrics || !lyrics.synced || lyrics.lines.length === 0) {
      return {
        currentLine: null,
        nextLine: null,
        currentIndex: -1,
        currentWordIndex: -1,
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
      };
    }

    // If we're after the last line, show the last line
    if (currentIndex === -1) {
      currentIndex = lyrics.lines.length - 1;
    }

    const currentLine = lyrics.lines[currentIndex] || null;
    let currentWordIndex = -1;

    // Find the current word within the line
    if (currentLine && currentLine.words && currentLine.words.length > 0) {
      // Find the last word where time <= currentPosition
      for (let i = currentLine.words.length - 1; i >= 0; i--) {
        const word = currentLine.words[i];
        const wordEndTime = word.endTime || (i < currentLine.words.length - 1 
          ? currentLine.words[i + 1].time 
          : currentLine.time + 3000); // Default 3 seconds if no next word
        
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

    return {
      currentLine,
      nextLine: lyrics.lines[currentIndex + 1] || null,
      currentIndex,
      currentWordIndex,
    };
  }, [lyrics, currentPosition]);
};

