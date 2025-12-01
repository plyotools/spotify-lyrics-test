import { useLyrics } from '../hooks/useLyrics';
import type { LyricsData } from '../types/lyrics';
import type { Track, PlaybackState } from '../types/spotify';
import { useRef } from 'react';
// import { useRef, useEffect, useState } from 'react'; // Commented out: karaoke ball disabled

interface LyricsDisplayProps {
  lyrics: LyricsData | null;
  currentPosition: number;
  track: Track | null;
  playbackState: PlaybackState | null;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onSkipToNext: () => void;
}

export const LyricsDisplay = ({ lyrics, currentPosition, track, playbackState, isPlaying, onTogglePlayback, onSkipToNext }: LyricsDisplayProps) => {
  const { currentLine, currentIndex, currentWordIndex, isPause } = useLyrics(lyrics, currentPosition);
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const lineRef = useRef<HTMLDivElement>(null);
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
            <div className="music-animation">
              <div className="sound-wave sound-wave-1"></div>
              <div className="sound-wave sound-wave-2"></div>
              <div className="sound-wave sound-wave-3"></div>
              <div className="sound-wave sound-wave-4"></div>
              <div className="sound-wave sound-wave-5"></div>
            </div>
          </div>
        </div>
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
        {isPause ? (
          <div className="lyrics-line lyrics-line-active lyrics-line-pause">
            <div className="music-animation">
              <div className="sound-wave sound-wave-1"></div>
              <div className="sound-wave sound-wave-2"></div>
              <div className="sound-wave sound-wave-3"></div>
              <div className="sound-wave sound-wave-4"></div>
              <div className="sound-wave sound-wave-5"></div>
            </div>
          </div>
        ) : currentLine && (
          <div 
            key={currentIndex} 
            className="lyrics-line lyrics-line-active lyrics-line-enter" 
            ref={lineRef}
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
                {/* Karaoke ball indicator - COMMENTED OUT */}
                {/* {ballPosition.visible && (
                  <span
                    className={`karaoke-ball ${ballPosition.isMoving ? 'karaoke-ball-moving' : 'karaoke-ball-stopped'}`}
                    style={{
                      left: `${ballPosition.left}px`,
                      top: `${ballPosition.top}px`,
                    }}
                  >
                    ●
                  </span>
                )} */}
              </>
            ) : (
              // Fallback: render as plain text if no word timestamps
              currentLine.text
            )}
          </div>
        )}
        {nextLine && (
          <div className="lyrics-line lyrics-line-next">
            {nextLine.text}
          </div>
        )}
        {otherRemainingLines.map((line, index) => (
          <div key={currentIndex + 2 + index} className="lyrics-line lyrics-line-remaining">
            {line.text}
          </div>
        ))}
        {!currentLine && remainingLines.length === 0 && (
          <div className="lyrics-line lyrics-waiting">
            <div className="music-animation">
              <div className="sound-wave sound-wave-1"></div>
              <div className="sound-wave sound-wave-2"></div>
              <div className="sound-wave sound-wave-3"></div>
              <div className="sound-wave sound-wave-4"></div>
              <div className="sound-wave sound-wave-5"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

