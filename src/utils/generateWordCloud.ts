/**
 * Utility functions for generating word clouds from lyrics
 * Uses Python wordcloud library via API or generates client-side
 */

import type { LyricsData } from '../types/lyrics';

/**
 * Check if lyrics are ready and have meaningful content
 */
export function areLyricsReady(lyrics: LyricsData | null): boolean {
  if (!lyrics) {
    return false;
  }
  
  // Check if lyrics have lines
  if (!lyrics.lines || lyrics.lines.length === 0) {
    return false;
  }
  
  // Check if we have at least a few lines with actual text
  const linesWithText = lyrics.lines.filter(line => {
    if (line.words && line.words.length > 0) {
      return line.words.some(word => word.text && word.text.trim().length > 0);
    }
    return line.text && line.text.trim().length > 0;
  });
  
  // Require at least 3 lines with text to consider lyrics ready
  return linesWithText.length >= 3;
}

/**
 * Extract all text from lyrics data
 */
export function extractLyricsText(lyrics: LyricsData): string {
  if (!lyrics || !lyrics.lines) {
    return '';
  }
  
  // Extract text from all lines, handling word-level timestamps
  const textParts: string[] = [];
  
  for (const line of lyrics.lines) {
    if (line.words && line.words.length > 0) {
      // Use word-level text if available
      const words = line.words
        .map(word => word.text)
        .filter(text => text && text.trim().length > 0)
        .join(' ');
      if (words.trim().length > 0) {
        textParts.push(words);
      }
    } else if (line.text && line.text.trim().length > 0) {
      // Use line text
      textParts.push(line.text.trim());
    }
  }
  
  return textParts.join(' ').trim();
}

/**
 * Generate word cloud image data URL using Python backend
 * This requires a Python server running the wordcloud script
 */
export async function generateWordCloudImage(
  lyrics: LyricsData,
  colors: string[],
  width: number = 1920,
  height: number = 1080
): Promise<string | null> {
  const lyricsText = extractLyricsText(lyrics);
  
  if (!lyricsText.trim()) {
    console.warn('No lyrics text to generate word cloud from');
    return null;
  }
  
  try {
    // Call Python backend API (you'll need to set this up)
    const response = await fetch('/api/wordcloud', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lyrics: lyricsText,
        colors,
        width,
        height,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Word cloud generation failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.image; // Base64 encoded image
  } catch (error) {
    console.error('Error generating word cloud:', error);
    return null;
  }
}

/**
 * Generate word cloud using Python script (for server-side generation)
 * Returns the command to run
 */
export function getWordCloudCommand(
  lyrics: LyricsData,
  colors: string[],
  outputPath: string = 'wordcloud.png'
): { command: string; args: string[] } {
  const lyricsText = extractLyricsText(lyrics);
  
  return {
    command: 'python3',
    args: [
      'scripts/generate_wordcloud.py',
      '--lyrics', lyricsText,
      '--colors', ...colors,
      '--output', outputPath,
      '--background', 'rgba(0,0,0,0)', // Transparent
      '--width', '1920',
      '--height', '1080',
    ],
  };
}

