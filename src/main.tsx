import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { SpotifyProvider } from './context/SpotifyContext'
import App from './App.tsx'
import { Callback } from './components/Callback'
import './index.css'

// Handle callback redirect before HashRouter loads
// If Spotify redirects to /callback, redirect to hash route
const pathname = window.location.pathname
const search = window.location.search
if (pathname === '/callback' && search && search.includes('code=')) {
  console.log('[MAIN] Detected callback URL, redirecting to hash route');
  window.location.hash = '/callback' + search;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <SpotifyProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/index.html" element={<App />} />
        </Routes>
      </SpotifyProvider>
    </HashRouter>
  </StrictMode>,
)
