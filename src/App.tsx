import { useEffect } from 'react'
import { useSpotify } from './context/SpotifyContext'
import { Login } from './components/Login'
import { LyricsDisplay } from './components/LyricsDisplay'
import './App.css'

function App() {
  const {
    isAuthenticated,
    isLoading,
    currentTrack,
    lyrics,
    currentPosition,
    playbackState,
    error,
    togglePlayback,
    skipToNext,
    skipToPrevious,
    skipToNextLyricLine,
    skipToPreviousLyricLine,
    seekToLine,
    logout,
  } = useSpotify()

  // Keyboard shortcuts
  useEffect(() => {
    if (!isAuthenticated) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Space: Pause/Play
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        togglePlayback()
      }
      
      // Right Arrow: Next track
      if (e.code === 'ArrowRight' && !e.repeat) {
        e.preventDefault()
        skipToNext()
      }
      
      // Left Arrow: Previous track
      if (e.code === 'ArrowLeft' && !e.repeat) {
        e.preventDefault()
        skipToPrevious()
      }
      
      // Down Arrow: Next lyric line
      if (e.code === 'ArrowDown' && !e.repeat) {
        e.preventDefault()
        skipToNextLyricLine()
      }
      
      // Up Arrow: Previous lyric line
      if (e.code === 'ArrowUp' && !e.repeat) {
        e.preventDefault()
        skipToPreviousLyricLine()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAuthenticated, togglePlayback, skipToNext, skipToPrevious, skipToNextLyricLine, skipToPreviousLyricLine])

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('[APP] User not authenticated, showing Login component');
    return <Login />
  }
  
  console.log('[APP] User authenticated, showing main app');

  return (
    <div className="app">
      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      <main className="app-main">
        <LyricsDisplay 
          lyrics={lyrics} 
          currentPosition={currentPosition} 
          track={currentTrack}
          playbackState={playbackState}
          isPlaying={playbackState?.is_playing || false}
          onTogglePlayback={togglePlayback}
          onSkipToNext={skipToNext}
          onSeekToLine={seekToLine}
        />
      </main>
      
      <button 
        className="invisible-logout-button"
        onClick={logout}
        aria-label="Logout"
        title="Logout"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  )
}

export default App
