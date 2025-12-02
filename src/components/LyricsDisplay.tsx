import { useLyrics } from '../hooks/useLyrics';
import type { LyricsData } from '../types/lyrics';
import type { Track, PlaybackState } from '../types/spotify';
import { UpcomingConcerts } from './UpcomingConcerts';
import { LibrarySearch, type LibrarySearchRef } from './LibrarySearch';
import { useRef, useEffect } from 'react';
// import { useRef, useEffect, useState } from 'react'; // Commented out: karaoke ball disabled

interface LyricsDisplayProps {
  lyrics: LyricsData | null;
  currentPosition: number;
  track: Track | null;
  playbackState: PlaybackState | null;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onSkipToNext: () => void;
  onSeekToLine?: (lineIndex: number) => void;
}

export const LyricsDisplay = ({ lyrics, currentPosition, track, playbackState, isPlaying, onTogglePlayback, onSkipToNext, onSeekToLine }: LyricsDisplayProps) => {
  const { currentLine, currentIndex, currentWordIndex, isPause } = useLyrics(lyrics, currentPosition);
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const lineRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<LibrarySearchRef>(null);

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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
        <div className="lyrics-container-simple">
          <div className="lyrics-line lyrics-line-active lyrics-line-pause">
            <div className="lyrics-loading-container">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
                  </svg>
                </button>
              )}
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
          </div>
        </div>
      )}
      <div className="lyrics-container-simple">
        {(() => {
          // Always show lyrics if we have valid content, otherwise show vinyl
          const hasValidLyrics = currentLine && !isPause && (
            (currentLine.text && currentLine.text.trim()) || 
            (currentLine.words && currentLine.words.length > 0)
          );
          
          if (hasValidLyrics) {
            return (
              <div 
                key={currentIndex} 
                className="lyrics-line lyrics-line-active lyrics-line-enter" 
                ref={lineRef}
                onClick={() => handleLineClick(currentIndex)}
                style={{ cursor: 'pointer' }}
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
            );
          }
          
          // Default: always show vinyl
          return (
            <div className="lyrics-line lyrics-line-active lyrics-line-pause">
              <div className="lyrics-loading-container">
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
          );
        })()}
        {nextLine && (
          <div 
            className="lyrics-line lyrics-line-next"
            onClick={() => handleLineClick(currentIndex + 1)}
            style={{ cursor: 'pointer' }}
          >
            {nextLine.text}
          </div>
        )}
        {otherRemainingLines.map((line, index) => (
          <div 
            key={currentIndex + 2 + index} 
            className="lyrics-line lyrics-line-remaining"
            onClick={() => handleLineClick(currentIndex + 2 + index)}
            style={{ cursor: 'pointer' }}
          >
            {line.text}
          </div>
        ))}
      </div>
      <UpcomingConcerts track={track} />
    </div>
  );
};

