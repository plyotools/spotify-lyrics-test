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
    logout,
    togglePlayback,
  } = useSpotify()

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
    return <Login />
  }

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
          isPlaying={playbackState?.is_playing || false}
          onLogout={logout}
          onTogglePlayback={togglePlayback}
        />
      </main>
    </div>
  )
}

export default App
