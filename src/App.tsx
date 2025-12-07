import { useEffect, useState } from 'react'
import { useSpotify } from './context/SpotifyContext'
import { Login } from './components/Login'
import { LyricsDisplay } from './components/LyricsDisplay'
import { AppStatus } from './components/AppStatus'
import { WordCloudBackground } from './components/WordCloudBackground'
import { extractDarkestColors } from './utils/colorExtractor'
import { logSDKDiagnostics } from './utils/sdkDiagnostics'
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
    clearError,
  } = useSpotify()

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [wordCloudColors, setWordCloudColors] = useState<string[]>([])

  // Extract darkest colors from album art for word cloud
  useEffect(() => {
    if (!currentTrack?.album.images[0]?.url) {
      setWordCloudColors([])
      return
    }

    extractDarkestColors(currentTrack.album.images[0].url, 5)
      .then(colors => setWordCloudColors(colors))
      .catch(() => setWordCloudColors([]))
  }, [currentTrack?.album.images[0]?.url])

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch((err) => {
        console.error('Error entering fullscreen:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch((err) => {
        console.error('Error exiting fullscreen:', err)
      })
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Expose diagnostic function to window for debugging
  useEffect(() => {
    if (isAuthenticated) {
      (window as any).checkSDK = async () => {
        await logSDKDiagnostics();
      };
      console.log('💡 Run checkSDK() in console to diagnose SDK issues');
    }
  }, [isAuthenticated])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isAuthenticated) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // F key: Toggle fullscreen
      if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
        e.preventDefault()
        toggleFullscreen()
        return
      }

      // ESC: Exit fullscreen
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen()
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
        <div className="loading" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '1rem'
        }}>
          <div style={{
            width: '200px',
            height: '200px',
            position: 'relative',
            animation: 'spin 3s linear infinite'
          }}>
            <img 
              src="/spotify-lyrics-test/lp.png" 
              alt="Vinyl record" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
          <p style={{
            fontSize: '1.25rem',
            color: '#ffffff',
            fontWeight: '500'
          }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('[APP] User not authenticated, showing Login component');
    return <Login />
  }
  
  console.log('[APP] User authenticated, showing main app');

;

  return (
    <div className="app">
      {/* Word cloud background - behind everything including moving animations */}
      {lyrics && currentTrack && (
        <WordCloudBackground 
          lyrics={lyrics}
          colors={wordCloudColors.length > 0 ? wordCloudColors : ['#FFFFFF']}
          visible={true}
          opacity={0.8}
        />
      )}
      {error && (
        <div className="error-banner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <p style={{ margin: 0, flex: 1 }}>{error}</p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {error.includes('Rate limited') && (
                <button
                  onClick={() => {
                    clearError();
                    // Reload page to retry after rate limit
                    window.location.reload();
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  Retry
                </button>
              )}
              <button
                onClick={clearError}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.7,
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                aria-label="Dismiss error"
                title="Dismiss"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
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
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
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
      
      {isAuthenticated && <AppStatus />}
    </div>
  )
}

export default App
