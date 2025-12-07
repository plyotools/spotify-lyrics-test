import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { SpotifyProvider } from './context/SpotifyContext'
import App from './App.tsx'
import { Callback } from './components/Callback'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

// Handle callback redirect before HashRouter loads
// If Spotify redirects to /callback or /spotify-lyrics-test/callback, redirect to hash route
const pathname = window.location.pathname
const search = window.location.search

// Check if we're on a callback path (with or without base path)
const isCallbackPath = pathname === '/callback' || pathname.endsWith('/callback')
const hasCode = search.includes('code=')

if (isCallbackPath && hasCode) {
  console.log('[MAIN] Detected callback URL, pathname:', pathname);
  console.log('[MAIN] Search params:', search);
  
  // Get base path (everything before /callback)
  let basePath = pathname.replace('/callback', '')
  
  // If pathname is exactly /callback (no base path), we need to determine the base
  if (!basePath || basePath === '/') {
    // Always use /spotify-lyrics-test as base path (from vite config)
    // This ensures redirect works even when accessing /callback directly
    basePath = '/spotify-lyrics-test'
  }
  
  // Ensure basePath starts with /
  if (!basePath.startsWith('/')) {
    basePath = '/' + basePath
  }
  
  // Redirect to hash route for HashRouter
  const redirectUrl = window.location.origin + basePath + '#/callback' + search
  console.log('[MAIN] Detected callback, redirecting to hash route:', redirectUrl);
  window.location.replace(redirectUrl);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <SpotifyProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/callback" element={<Callback />} />
            <Route path="/index.html" element={<App />} />
          </Routes>
        </SpotifyProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
