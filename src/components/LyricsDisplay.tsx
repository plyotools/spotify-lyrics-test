import { useLyrics } from '../hooks/useLyrics';
import type { LyricsData } from '../types/lyrics';
import type { Track } from '../types/spotify';
import { useRef, useEffect, useState } from 'react';

interface LyricsDisplayProps {
  lyrics: LyricsData | null;
  currentPosition: number;
  track: Track | null;
  isPlaying: boolean;
  onLogout: () => void;
  onTogglePlayback: () => void;
}

export const LyricsDisplay = ({ lyrics, currentPosition, track, isPlaying, onLogout, onTogglePlayback }: LyricsDisplayProps) => {
  const { currentLine, currentIndex, currentWordIndex } = useLyrics(lyrics, currentPosition);
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const lineRef = useRef<HTMLDivElement>(null);
  const [ballPosition, setBallPosition] = useState({ left: 0, top: 0, visible: false, isMoving: false });
  const prevLeftRef = useRef<number>(0);

  const albumArt = track?.album.images[0]?.url || '';
  const artistName = track?.artists.map((artist) => artist.name).join(', ') || '';
  const trackName = track?.name || '';
  const albumName = track?.album.name || '';

  // Update ball position when current word changes
  useEffect(() => {
    const updateBallPosition = () => {
      if (currentWordIndex >= 0 && currentLine?.words && wordRefs.current.has(currentWordIndex)) {
        const wordElement = wordRefs.current.get(currentWordIndex);
        const lineElement = lineRef.current;
        
        if (wordElement && lineElement) {
          const wordRect = wordElement.getBoundingClientRect();
          const lineRect = lineElement.getBoundingClientRect();
          
          // Position ball below the word, centered horizontally
          const left = wordRect.left - lineRect.left + (wordRect.width / 2);
          const top = wordRect.height + 8 + 12; // Position below the text + 12px down
          
          // Check if ball is moving (position changed)
          const isMoving = Math.abs(left - prevLeftRef.current) > 1;
          prevLeftRef.current = left;
          
          setBallPosition({ left, top, visible: true, isMoving });
          
          // After movement stops, trigger squeeze effect
          if (isMoving) {
            setTimeout(() => {
              setBallPosition(prev => ({ ...prev, isMoving: false }));
            }, 350); // Match transition duration
          }
          
          return;
        }
      }
      // Hide ball if no valid word
      if (currentWordIndex < 0 || !currentLine?.words) {
        setBallPosition(prev => ({ ...prev, visible: false, isMoving: false }));
      }
    };

    // Use double requestAnimationFrame for smoother updates
    const rafId1 = requestAnimationFrame(() => {
      const rafId2 = requestAnimationFrame(() => {
        updateBallPosition();
      });
      return () => cancelAnimationFrame(rafId2);
    });

    return () => cancelAnimationFrame(rafId1);
  }, [currentWordIndex, currentLine]);

  if (!lyrics) {
    return (
      <div className="lyrics-display">
        <div className="lyrics-empty">
          <p>No lyrics available for this track</p>
        </div>
      </div>
    );
  }

  if (!lyrics.synced) {
    // For unsynced lyrics, show first few lines
    return (
      <div className="lyrics-display">
        {track && (
          <div className="lyrics-track-header">
            {albumArt && (
              <img src={albumArt} alt={`${trackName} album art`} className="lyrics-track-artwork" />
            )}
            <div className="lyrics-track-info">
              <span className="lyrics-track-name">{trackName}</span>
              <span className="lyrics-track-meta">{artistName} • {albumName}</span>
            </div>
            <div className="lyrics-controls">
              <button onClick={onTogglePlayback} className="play-pause-button" title={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              <button onClick={onLogout} className="logout-button" title="Log out">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
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
      </div>
    );
  }

  // Get previous line
  const previousLine = currentIndex > 0 ? lyrics.lines[currentIndex - 1] : null;
  
  // Get all remaining lines after current
  const remainingLines = currentIndex >= 0 && currentIndex < lyrics.lines.length - 1
    ? lyrics.lines.slice(currentIndex + 1)
    : [];

  return (
    <div className="lyrics-display">
      {track && (
        <div className="lyrics-track-header">
          {albumArt && (
            <img src={albumArt} alt={`${trackName} album art`} className="lyrics-track-artwork" />
          )}
          <div className="lyrics-track-info">
            <span className="lyrics-track-name">{trackName}</span>
            <span className="lyrics-track-meta">{artistName} • {albumName}</span>
          </div>
          <div className="lyrics-controls">
            <button onClick={onTogglePlayback} className="play-pause-button" title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            <button onClick={onLogout} className="logout-button" title="Log out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="lyrics-container-simple">
        {previousLine && (
          <div className="lyrics-line lyrics-line-previous">
            {previousLine.text}
          </div>
        )}
        {currentLine && (
          <div className="lyrics-line lyrics-line-active" ref={lineRef}>
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
                {/* Karaoke ball indicator */}
                {ballPosition.visible && (
                  <span
                    className={`karaoke-ball ${ballPosition.isMoving ? 'karaoke-ball-moving' : 'karaoke-ball-stopped'}`}
                    style={{
                      left: `${ballPosition.left}px`,
                      top: `${ballPosition.top}px`,
                    }}
                  >
                    ●
                  </span>
                )}
              </>
            ) : (
              // Fallback: render as plain text if no word timestamps
              currentLine.text
            )}
          </div>
        )}
        {remainingLines.map((line, index) => (
          <div key={currentIndex + 1 + index} className="lyrics-line lyrics-line-remaining">
            {line.text}
          </div>
        ))}
        {!previousLine && !currentLine && remainingLines.length === 0 && (
          <div className="lyrics-line">Waiting for lyrics to start...</div>
        )}
      </div>
    </div>
  );
};

