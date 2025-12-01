import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { SpotifyProvider } from './context/SpotifyContext'
import App from './App.tsx'
import { Callback } from './components/Callback'
import './index.css'

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
