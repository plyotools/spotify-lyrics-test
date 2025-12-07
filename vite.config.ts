import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read port from .cursor/ports.json if available
let webPort = 5175; // default
try {
  const portsPath = join(process.cwd(), '.cursor', 'ports.json');
  const portsData = JSON.parse(readFileSync(portsPath, 'utf-8'));
  if (portsData?.services?.web?.port) {
    webPort = portsData.services.web.port;
  }
} catch {
  // Use default if ports.json doesn't exist or can't be read
}

// https://vite.dev/config/
export default defineConfig({
  base: '/spotify-lyrics-test/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: webPort,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
})
