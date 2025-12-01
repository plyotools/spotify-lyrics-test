import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SpotifyProvider } from './context/SpotifyContext'
import App from './App.tsx'
import { Callback } from './components/Callback'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SpotifyProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/callback" element={<Callback />} />
        </Routes>
      </SpotifyProvider>
    </BrowserRouter>
  </StrictMode>,
)
