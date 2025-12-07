import { useLyrics } from '../hooks/useLyrics';
import type { LyricsData } from '../types/lyrics';
import type { Track, PlaybackState } from '../types/spotify';
import { UpcomingConcerts } from './UpcomingConcerts';
import { LibrarySearch, type LibrarySearchRef } from './LibrarySearch';
import { useRef, useEffect, useState } from 'react';
import { extractBrightestColor, extractDarkestColor, extractVividLightColors, extractVividMidtoneColor } from '../utils/colorExtractor';

interface LyricsDisplayProps {
  lyrics: LyricsData | null;
  currentPosition: number;
  track: Track | null;
  playbackState: PlaybackState | null;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onSkipToNext: () => void;
  onSeekToLine?: (lineIndex: number) => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const LyricsDisplay = ({ lyrics, currentPosition, track, playbackState, isPlaying, onTogglePlayback, onSkipToNext, onSeekToLine, onToggleFullscreen, isFullscreen }: LyricsDisplayProps) => {
  const { currentLine, currentIndex, currentWordIndex, isPause } = useLyrics(lyrics, currentPosition);
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const lineRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<LibrarySearchRef>(null);
  
  // Generate random tilt ranges for overlapping words (-20 to +20 degrees)
  const wordTiltRanges = useRef<Map<number, { min: number; max: number; duration: number; startAngle: number }>>(new Map());
  // Generate random background positions for each word to show different midtone portions
  const wordBackgroundPositions = useRef<Map<number, { x: number; y: number }>>(new Map());
  const trackInfoPositions = useRef<Map<string, { x: number; y: number; tilt: number }>>(new Map());
  if (currentLine && currentLine.words) {
    currentLine.words.forEach((_, index) => {
      if (!wordTiltRanges.current.has(index)) {
        const startAngle = (Math.random() - 0.5) * 40; // Random start angle between -20 and +20
        const rangeAmount = 8 + Math.random() * 4; // Animation range between 8-12 degrees
        wordTiltRanges.current.set(index, {
          min: startAngle - rangeAmount / 2, // Range around start angle
          max: startAngle + rangeAmount / 2,
          duration: 10 + Math.random() * 6, // Random duration between 10-16s for smoother motion
          startAngle: startAngle, // Store the starting angle
        });
      }
      if (!wordBackgroundPositions.current.has(index)) {
        // Random positions within 30-70% range (midtones area)
        wordBackgroundPositions.current.set(index, {
          x: 30 + Math.random() * 40, // 30-70%
          y: 30 + Math.random() * 40, // 30-70%
        });
      }
    });
  }

  // Keyboard shortcut: 'S' key to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // 'S' key: Focus search
      if ((e.key === 's' || e.key === 'S') && !e.repeat) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  // const [ballPosition, setBallPosition] = useState({ left: 0, top: 0, visible: false, isMoving: false });
  // const prevLeftRef = useRef<number>(0);

  const albumArt = track?.album.images[0]?.url || '';
  const artistName = track?.artists.map((artist) => artist.name).join(', ') || '';
  const trackName = track?.name || '';
  const albumName = track?.album.name || '';
  
  // Extract brightest and darkest colors from album cover
  const [brightestColor, setBrightestColor] = useState<string>('#1DB954'); // Default to Spotify green
  const [_darkestColor, setDarkestColor] = useState<string>('#121212'); // Default to dark background (used for CSS variable)
  const [vividBrightColors, setVividBrightColors] = useState<string[]>(Array(5).fill('#1DB954')); // 5 vivid bright colors for current line transition
  const [_vividMidtoneColor, setVividMidtoneColor] = useState<string>('#B3B3B3'); // Most vivid midtone for coming lines (set but not read)
  const [currentColorIndex, setCurrentColorIndex] = useState<number>(0); // Index for color transition
  
  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  useEffect(() => {
    if (!albumArt) {
      setBrightestColor('#1DB954'); // Reset to default if no album art
      setDarkestColor('#121212');
      document.documentElement.style.setProperty('--album-darkest-color', '#121212');
      return;
    }
    
    // Extract colors in parallel
    Promise.all([
      extractBrightestColor(albumArt),
      extractDarkestColor(albumArt),
      extractVividLightColors(albumArt, 5), // Extract 5 vivid bright colors
      extractVividMidtoneColor(albumArt) // Extract most vivid midtone color
    ])
      .then(([brightColor, darkColor, vividColors, midtoneColor]) => {
        setBrightestColor(brightColor);
        setDarkestColor(darkColor);
        setVividBrightColors(vividColors);
        setVividMidtoneColor(midtoneColor);
        setCurrentColorIndex(0); // Reset color index
        // Set CSS variable for background
        document.documentElement.style.setProperty('--album-darkest-color', darkColor);
      })
      .catch((error) => {
        console.error('Failed to extract colors from album art:', error);
        setBrightestColor('#1DB954'); // Fallback to default
        setDarkestColor('#121212');
        setVividBrightColors(Array(5).fill('#1DB954'));
        setVividMidtoneColor('#B3B3B3');
        document.documentElement.style.setProperty('--album-darkest-color', '#121212');
      });
  }, [albumArt]);
  
  // Transition between 5 vivid bright colors for current line
  useEffect(() => {
    if (vividBrightColors.length < 5) return;
    
    const interval = setInterval(() => {
      setCurrentColorIndex((prev) => (prev + 1) % vividBrightColors.length);
    }, 75000); // Change color every 75 seconds (5x slower)
    
    return () => clearInterval(interval);
  }, [vividBrightColors]);
  
  // Get current transitioning color for active line
  const currentTransitionColor = vividBrightColors[currentColorIndex] || brightestColor;
  
  // Track info word cycling for masked background (before lyrics)
  const [trackWordIndex, setTrackWordIndex] = useState<number>(0);
  const [isTransitioningToLyrics, setIsTransitioningToLyrics] = useState<boolean>(false);
  const prevHasLyricsRef = useRef<boolean>(false);
  const trackWordsRef = useRef<string[]>([]);
  
  // Get first word of song for vinyl stage
  useEffect(() => {
    if (!track || !albumArt || (lyrics && lyrics.synced && lyrics.lines.length > 0)) {
      trackWordsRef.current = [];
      return;
    }
    
    // Only use the first word of the song name
    const words: string[] = [];
    
    if (trackName) {
      const songWords = trackName.trim().split(/\s+/).filter(w => w.length > 0);
      if (songWords.length > 0) {
        words.push(songWords[0]); // Only the first word
      }
    }
    
    trackWordsRef.current = words;
    setTrackWordIndex(0); // Always show the first (and only) word
  }, [track, albumArt, lyrics, trackName]);
  
  // Track when lyrics first appear to trigger transition
  useEffect(() => {
    const hasLyrics = !!(currentLine && currentLine.text);
    if (hasLyrics && !prevHasLyricsRef.current) {
      // Lyrics just appeared - start transition
      setIsTransitioningToLyrics(true);
      setTimeout(() => {
        setIsTransitioningToLyrics(false);
      }, 2000); // Transition duration
    }
    prevHasLyricsRef.current = hasLyrics;
  }, [currentLine]);
  
  // Get next track
  const nextTrack = playbackState?.context?.next_tracks?.[0] || null;

  // Update ball position when current word changes
  // COMMENTED OUT: Animated karaoke ball
  // useEffect(() => {
  //   const updateBallPosition = () => {
  //     if (currentWordIndex >= 0 && currentLine?.words && wordRefs.current.has(currentWordIndex)) {
  //       const wordElement = wordRefs.current.get(currentWordIndex);
  //       const lineElement = lineRef.current;
  //       
  //       if (wordElement && lineElement) {
  //         const wordRect = wordElement.getBoundingClientRect();
  //         const lineRect = lineElement.getBoundingClientRect();
  //         
  //         // Position ball below the word, centered horizontally
  //         const left = wordRect.left - lineRect.left + (wordRect.width / 2);
  //         const top = wordRect.height + 8 + 12; // Position below the text + 12px down
  //         
  //         // Check if ball is moving (position changed)
  //         const isMoving = Math.abs(left - prevLeftRef.current) > 1;
  //         prevLeftRef.current = left;
  //         
  //         setBallPosition({ left, top, visible: true, isMoving });
  //         
  //         // After movement stops, trigger squeeze effect
  //         if (isMoving) {
  //           setTimeout(() => {
  //             setBallPosition(prev => ({ ...prev, isMoving: false }));
  //           }, 350); // Match transition duration
  //         }
  //         
  //         return;
  //       }
  //     }
  //     // Hide ball if no valid word
  //     if (currentWordIndex < 0 || !currentLine?.words) {
  //       setBallPosition(prev => ({ ...prev, visible: false, isMoving: false }));
  //     }
  //   };

  //   // Use double requestAnimationFrame for smoother updates
  //   const rafId1 = requestAnimationFrame(() => {
  //     const rafId2 = requestAnimationFrame(() => {
  //       updateBallPosition();
  //     });
  //     return () => cancelAnimationFrame(rafId2);
  //   });

  //   return () => cancelAnimationFrame(rafId1);
  // }, [currentWordIndex, currentLine]);

  if (!lyrics) {
    return (
      <div className="lyrics-display">
        {track && (
          <div className="track-card">
            {albumArt && (
              <img src={albumArt} alt={`${trackName} album art`} className={`track-card-artwork ${!isPlaying ? 'paused' : ''}`} />
            )}
            <div className="track-card-info">
              <div className="track-card-info-container">
                <span className="track-card-name track-card-fade">{trackName}</span>
                <span className="track-card-artist track-card-fade">{artistName}</span>
                <span className="track-card-album track-card-fade">{albumName}</span>
              </div>
            </div>
            <div className="track-card-controls">
              <LibrarySearch ref={searchRef} />
              <button onClick={onTogglePlayback} className="play-pause-button" title={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              {nextTrack && (
                <button onClick={onSkipToNext} className="next-track-button" type="button" title="Next track">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
                  </svg>
                </button>
              )}
              <button 
                onClick={onToggleFullscreen}
                className="fullscreen-button"
                title={isFullscreen ? "Exit fullscreen (ESC)" : "Enter fullscreen (F)"}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
        <div className="lyrics-container-simple">
          {/* Masked background text effect for track info - show first word of song */}
          {albumArt && track && trackName && (() => {
            const songWords = trackName.trim().split(/\s+/).filter(w => w.length > 0);
            const firstWord = songWords.length > 0 ? songWords[0] : null;
            
            if (!firstWord) return null;
            
            const wordKey = 'track-word-0';
            if (!trackInfoPositions.current.has(wordKey)) {
              trackInfoPositions.current.set(wordKey, {
                x: 30 + Math.random() * 40,
                y: 30 + Math.random() * 40,
                tilt: (Math.random() - 0.5) * 40
              });
            }
            const bgPos = trackInfoPositions.current.get(wordKey)!;
            
            return (
              <div 
                className="lyrics-masked-background"
                style={{
                  '--album-art': `url(${albumArt})`,
                } as React.CSSProperties}
              >
                <div className="lyrics-masked-text-wrapper">
                  <div
                    className="lyrics-masked-text-word-wrapper"
                    style={{
                      '--target-scale': 1.2,
                      '--target-opacity': 0.4,
                      zIndex: 1,
                    } as React.CSSProperties}
                  >
                    <div
                      className="lyrics-masked-text-word"
                      style={{
                        '--base-rotation': `${bgPos.tilt}deg`,
                        '--rotation-range': '8deg',
                        '--background-position-x': `${bgPos.x}%`,
                        '--background-position-y': `${bgPos.y}%`,
                      } as React.CSSProperties}
                    >
                      {firstWord}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="lyrics-line lyrics-line-active lyrics-line-pause">
            <div className="lyrics-loading-container">
              {!track && (
                <div className="waiting-message" style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  fontSize: '1.5rem',
                  marginBottom: '2rem',
                  textAlign: 'center',
                  fontWeight: '500'
                }}>
                  Waiting for playback...
                </div>
              )}
              <div className="lyrics-loading-album-wrapper">
                <img 
                  src="/lp.png" 
                  alt="Vinyl record" 
                  className="lyrics-loading-vinyl" 
                />
                {albumArt && (
                <img 
                  src={albumArt} 
                  alt="Album art" 
                  className="lyrics-loading-album-cover"
                />
              )}
              </div>
            </div>
          </div>
        </div>
        <UpcomingConcerts track={track} />
      </div>
    );
  }

  if (!lyrics.synced) {
    // For unsynced lyrics, show first few lines
    return (
      <div className="lyrics-display">
        {track && (
          <div className="track-card">
            {albumArt && (
              <img src={albumArt} alt={`${trackName} album art`} className={`track-card-artwork ${!isPlaying ? 'paused' : ''}`} />
            )}
            <div className="track-card-info">
              <div className="track-card-info-container">
                <span className="track-card-name track-card-fade">{trackName}</span>
                <span className="track-card-artist track-card-fade">{artistName}</span>
                <span className="track-card-album track-card-fade">{albumName}</span>
              </div>
            </div>
            <div className="track-card-controls">
              <LibrarySearch ref={searchRef} />
              <button onClick={onTogglePlayback} className="play-pause-button" title={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              {nextTrack && (
                <button onClick={onSkipToNext} className="next-track-button" type="button" title="Next track">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
                  </svg>
                </button>
              )}
              <button 
                onClick={onToggleFullscreen}
                className="fullscreen-button"
                title={isFullscreen ? "Exit fullscreen (ESC)" : "Enter fullscreen (F)"}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
        <div className="lyrics-container-simple">
          {lyrics.lines.slice(0, 3).map((line, index) => (
            <div key={index} className="lyrics-line">
              {line.text}
            </div>
          ))}
        </div>
        <UpcomingConcerts track={track} />
      </div>
    );
  }

  // Get all remaining lines after current
  const remainingLines = currentIndex >= 0 && currentIndex < lyrics.lines.length - 1
    ? lyrics.lines.slice(currentIndex + 1)
    : [];
  
  // Get the next line (first remaining line)
  const nextLine = remainingLines.length > 0 ? remainingLines[0] : null;
  const otherRemainingLines = remainingLines.slice(1);

  // Handler to seek to a specific line
  const handleLineClick = (lineIndex: number) => {
    if (onSeekToLine && lineIndex >= 0 && lineIndex < lyrics.lines.length) {
      onSeekToLine(lineIndex);
    }
  };

  return (
    <div className="lyrics-display">
      {track && (
        <div className="track-card">
          {albumArt && (
            <img src={albumArt} alt={`${trackName} album art`} className="track-card-artwork" />
          )}
          <div className="track-card-info">
            <div className="track-card-info-container">
              <span className="track-card-name track-card-fade">{trackName}</span>
              <span className="track-card-artist track-card-fade">{artistName}</span>
              <span className="track-card-album track-card-fade">{albumName}</span>
            </div>
          </div>
          <div className="track-card-controls">
            <LibrarySearch ref={searchRef} />
            <button onClick={onTogglePlayback} className="play-pause-button" title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            {nextTrack && (
              <button onClick={onSkipToNext} className="next-track-button" type="button" title="Next track">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
                </svg>
              </button>
            )}
            <button 
              onClick={onToggleFullscreen}
              className="fullscreen-button"
              title={isFullscreen ? "Exit fullscreen (ESC)" : "Enter fullscreen (F)"}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
      <div className="lyrics-container-simple">
        {/* Masked background text effect */}
        {albumArt ? (() => {
          // Check if we have lyrics to show
          const hasLyrics = currentLine && currentLine.text;
          const showTrackInfo = !hasLyrics && track && trackWordsRef.current.length > 0;
          
          // Render both track info and lyrics in the same container for smooth transition
          return (
            <div 
              className="lyrics-masked-background"
              style={{
                '--album-art': `url(${albumArt})`,
              } as React.CSSProperties}
            >
              {/* Track info layer - shows all words one by one before lyrics and fades out during transition */}
              {(showTrackInfo || (hasLyrics && isTransitioningToLyrics)) && track && trackWordsRef.current.length > 0 && (() => {
                return (
                  <div className={`lyrics-masked-text-wrapper ${isTransitioningToLyrics ? 'lyrics-masked-fade-out' : ''}`}>
                    {trackWordsRef.current.map((word, wordIdx) => {
                      // Use stable random positions stored in ref for each word
                      const wordKey = `track-word-${wordIdx}`;
                      if (!trackInfoPositions.current.has(wordKey)) {
                        trackInfoPositions.current.set(wordKey, {
                          x: 30 + Math.random() * 40,
                          y: 30 + Math.random() * 40,
                          tilt: (Math.random() - 0.5) * 40
                        });
                      }
                      const bgPos = trackInfoPositions.current.get(wordKey)!;
                      const isActive = wordIdx === trackWordIndex;
                      
                      // Only show active word, others fade out (similar to lyrics animation)
                      // Previous words fade out, coming words fade in
                      let scale = 0;
                      let opacity = 0;
                      
                      if (isActive) {
                        scale = 1.2;
                        opacity = 0.08;
                      } else if (wordIdx < trackWordIndex) {
                        // Previous words: already faded out
                        scale = 0;
                        opacity = 0;
                      } else {
                        // Coming words: not yet visible
                        scale = 0;
                        opacity = 0;
                      }
                      
                      return (
                        <div
                          key={wordKey}
                          className="lyrics-masked-text-word-wrapper"
                          style={{
                            '--target-scale': scale,
                            '--target-opacity': opacity,
                            zIndex: isActive ? trackWordsRef.current.length + 1 : wordIdx,
                          } as React.CSSProperties}
                        >
                          <div
                            className="lyrics-masked-text-word"
                            style={{
                              '--base-rotation': `${bgPos.tilt}deg`,
                              '--rotation-range': '8deg',
                              '--background-position-x': `${bgPos.x}%`,
                              '--background-position-y': `${bgPos.y}%`,
                            } as React.CSSProperties}
                          >
                            {word}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              
              {/* Lyrics layer - fades in when available */}
              {hasLyrics && (() => {
                // Show lyrics when available
                let textToShow = currentLine.text.trim();
                // Use current word if available, otherwise use full line
                if (currentLine.words && currentLine.words.length > 0 && currentWordIndex >= 0) {
                  textToShow = currentLine.words[currentWordIndex].text;
                }
                
                return textToShow ? (
                  <div className={`lyrics-masked-text-wrapper ${isTransitioningToLyrics ? 'lyrics-masked-fade-in' : ''}`}>
                {currentLine.words && currentLine.words.length > 0 ? (
                  // Show overlapping words with completely smooth animations
                  currentLine.words.map((word, wordIdx) => {
                    const tiltRange = wordTiltRanges.current.get(wordIdx) || { min: -20, max: 20, duration: 10, startAngle: 0 };
                    const bgPosition = wordBackgroundPositions.current.get(wordIdx) || { x: 50, y: 50 };
                    const isActive = wordIdx === currentWordIndex;
                    
                    // Calculate word progress for current word (starts large, shrinks to 0)
                    let scale = 1;
                    let opacity = 0.08;
                    
                    if (isActive) {
                      // Current word: calculate progress through the word
                      const wordStartTime = word.time;
                      const wordEndTime = word.endTime || 
                        (wordIdx < (currentLine.words?.length ?? 0) - 1 
                          ? (currentLine.words?.[wordIdx + 1]?.time ?? wordStartTime + 1000)
                          : (currentLine.words?.[wordIdx]?.time ?? wordStartTime) + 1000); // Default 1 second duration
                      
                      const wordDuration = (wordEndTime ?? wordStartTime + 1000) - wordStartTime;
                      const elapsed = currentPosition - wordStartTime;
                      const progress = wordDuration > 0 
                        ? Math.max(0, Math.min(1, elapsed / wordDuration))
                        : 0;
                      
                      // Start at large scale, shrink to 0 slowly
                      // Simplified easing for smoother animation
                      const slowedProgress = progress * 0.2; // Progress 5x slower
                      const easedProgress = Math.min(1, slowedProgress); // Linear easing
                      scale = Math.round(Math.max(0, 1.8 * (1 - easedProgress)) * 100) / 100; // Round for performance
                      opacity = Math.round(Math.max(0, 0.3 * (1 - easedProgress)) * 100) / 100; // Round for performance
                    } else if (wordIdx < currentWordIndex) {
                      // Previous words: already gone (scale 0, opacity 0)
                      scale = 0;
                      opacity = 0;
                    } else {
                      // Coming words: ease in smoothly from zoomed position
                      const distance = wordIdx - currentWordIndex;
                      
                      // For the next word (distance = 1), ease in smoothly before becoming active
                      if (distance === 1 && currentLine.words) {
                        // Calculate how close we are to this word becoming active
                        const nextWord = currentLine.words[wordIdx];
                        const currentWord = currentLine.words[currentWordIndex];
                        if (!nextWord || !currentWord) return null;
                        const currentWordEndTime = currentWord.endTime || 
                          (currentWordIndex < currentLine.words.length - 1 
                            ? currentLine.words[currentWordIndex + 1]?.time 
                            : (currentWord.time + 1000));
                        
                        // Time until next word starts
                        const timeUntilNext = nextWord.time - currentPosition;
                        const currentWordDuration = Math.max(100, currentWordEndTime - currentWord.time);
                        
                        // Ease in during the last 60% of current word's duration
                        const easeInDuration = currentWordDuration * 0.6;
                        const timeUntilEaseInEnds = timeUntilNext;
                        const easeInProgress = timeUntilEaseInEnds < easeInDuration
                          ? Math.max(0, Math.min(1, 1 - (timeUntilEaseInEnds / easeInDuration)))
                          : 0;
                        
                        // Start from smaller scale/invisible, ease in to coming position
                        const startScale = 0.8;
                        const endScale = 1.1;
                        const easedIn = Math.min(1, Math.max(0, easeInProgress)); // Clamp and linear
                        scale = Math.round((startScale + (endScale - startScale) * easedIn) * 100) / 100; // Round for performance
                        
                        const startOpacity = 0.02;
                        const endOpacity = 0.08;
                        opacity = Math.round((startOpacity + (endOpacity - startOpacity) * easedIn) * 100) / 100; // Round for performance
                      } else {
                        // Other coming words: zoomed in position
                        scale = 1.1; // Fixed scale - simpler
                        opacity = 0.08;
                      }
                    }
                    
                    // Use the starting angle as base rotation for arriving words
                    const baseRotation = tiltRange.startAngle || (tiltRange.min + tiltRange.max) / 2;
                    const rotationRange = (tiltRange.max - tiltRange.min) / 2;
                    
                    // Use stable key: line index + word index - this preserves DOM element
                    // so animation continues smoothly when word becomes active
                    const stableKey = `line-${currentIndex}-word-${wordIdx}`;
                    
                    return (
                      <div
                        key={stableKey}
                        className="lyrics-masked-text-word-wrapper"
                        style={{
                          '--target-scale': scale,
                          '--target-opacity': opacity,
                          zIndex: isActive ? 10 : wordIdx,
                        } as React.CSSProperties}
                      >
                        <div
                          className="lyrics-masked-text-word"
                          style={{
                            '--base-rotation': `${baseRotation}deg`,
                            '--rotation-range': `${rotationRange}deg`,
                            '--background-position-x': `${bgPosition.x}%`,
                            '--background-position-y': `${bgPosition.y}%`,
                          } as React.CSSProperties}
                        >
                          {word.text}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Fallback: show single line text
                  <div 
                    className="lyrics-masked-text lyrics-masked-text-active"
                    key={`${currentIndex}`}
                  >
                    {textToShow}
                  </div>
                )}
                  </div>
                ) : null;
              })()}
            </div>
          );
        })() : null}
        {(() => {
          // Always show lyrics if we have valid content, otherwise show vinyl
          const hasValidLyrics = currentLine && !isPause && (
            (currentLine.text && currentLine.text.trim()) || 
            (currentLine.words && currentLine.words.length > 0)
          );
          
          if (hasValidLyrics) {
            return (
          <>
            <div 
              key={currentIndex} 
              className="lyrics-line lyrics-line-active lyrics-line-enter" 
              ref={lineRef}
              onClick={() => handleLineClick(currentIndex)}
                  style={{ 
                    cursor: 'pointer',
                    color: currentTransitionColor,
                    textShadow: `0 0 20px ${hexToRgba(currentTransitionColor, 0.4)}`,
                    transition: 'color 50s ease-in-out, text-shadow 50s ease-in-out',
                    position: 'relative',
                    zIndex: 2
                  }}
            >
              {currentLine.words && currentLine.words.length > 0 ? (
                // Render words individually with word-level highlighting
                <>
                  {currentLine.words.map((word, wordIndex) => (
                    <span
                      key={wordIndex}
                      ref={(el) => {
                        if (el) {
                          wordRefs.current.set(wordIndex, el);
                        } else {
                          wordRefs.current.delete(wordIndex);
                        }
                      }}
                      className={`lyrics-word ${wordIndex === currentWordIndex ? 'lyrics-word-active' : ''}`}
                    >
                      {word.text}
                      {wordIndex < currentLine.words!.length - 1 && ' '}
                    </span>
                  ))}
                </>
              ) : (
                // Fallback: render as plain text if no word timestamps
                    currentLine.text || ''
              )}
            </div>
          </>
            );
          }
          
          // Pause state - don't show vinyl/cover when lyrics are present
          return null;
        })()}
        {nextLine && (
          <div 
            className="lyrics-line lyrics-line-next"
            onClick={() => handleLineClick(currentIndex + 1)}
            style={{ 
              cursor: 'pointer',
              color: currentTransitionColor,
              textShadow: `0 0 10px ${hexToRgba(currentTransitionColor, 0.3)}`,
              transition: 'color 50s ease-in-out, text-shadow 50s ease-in-out'
            }}
          >
            {nextLine.text}
          </div>
        )}
        {otherRemainingLines.map((line, index) => (
          <div 
            key={currentIndex + 2 + index} 
            className="lyrics-line lyrics-line-remaining"
            onClick={() => handleLineClick(currentIndex + 2 + index)}
            style={{ 
              cursor: 'pointer',
              color: currentTransitionColor,
              opacity: 0.7,
              textShadow: `0 0 10px ${hexToRgba(currentTransitionColor, 0.3)}`,
              transition: 'color 50s ease-in-out, text-shadow 50s ease-in-out, opacity 0.3s ease-in-out'
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
      <UpcomingConcerts track={track} />
    </div>
  );
};

