# Spotify Lyrics Player

A web application that displays synchronized lyrics for the currently playing Spotify song in real-time.

## Features

- Real-time synchronized lyrics display
- Automatic highlighting of the current lyric line
- Smooth scrolling to keep the active line visible
- Track information display (artist, title, album art)
- Spotify OAuth authentication with PKCE

## Prerequisites

- Node.js 18+ and npm
- A Spotify Premium account (required for Web Playback SDK)
- Spotify Developer account
- Musixmatch API key

## Setup Instructions

### 1. Spotify App Configuration

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an app"
3. Fill in the app details and accept the terms
4. **IMPORTANT**: In your app settings, add the following Redirect URI:
   - For development: `http://127.0.0.1:5173/callback` (Note: Spotify requires `127.0.0.1` instead of `localhost`)
   - For production: `https://yourdomain.com/callback` (HTTPS required)
5. Copy your **Client ID**

### 2. Lyrics API (Optional)

**Good News**: The app now uses **LRCLIB** as the primary lyrics source - it's **free and requires no API key**! The app will automatically fetch synchronized lyrics from LRCLIB.

**Optional - Musixmatch API Key** (Fallback):
If you want to use Musixmatch as a fallback when LRCLIB doesn't have lyrics:
1. Go to [Musixmatch Developer Portal](https://developer.musixmatch.com/)
2. Review their [API pricing plans](https://developer.musixmatch.com/) or send an enquiry
3. Complete the application process
4. Once approved, add your API key to the `.env` file

**Note**: The app works perfectly without Musixmatch - LRCLIB provides synchronized lyrics for free!

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
VITE_MUSIXMATCH_API_KEY=your_musixmatch_api_key_here
```

**Note**: `VITE_MUSIXMATCH_API_KEY` is optional. The app uses LRCLIB (free) as the primary source and only falls back to Musixmatch if you provide an API key.

**Important Notes**:
- The `VITE_SPOTIFY_REDIRECT_URI` must exactly match the Redirect URI you added in your Spotify app settings
- Spotify requires `127.0.0.1` instead of `localhost` for local development (for security reasons)
- If you're running on a different port, update both the environment variable and the Spotify app settings
- For production, you must use HTTPS (e.g., `https://yourdomain.com/callback`)

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

## Usage

1. Click "Connect with Spotify" to authenticate
2. Make sure you have a song playing on Spotify (on any device)
3. The app will automatically fetch and display synchronized lyrics
4. Lyrics will highlight in real-time as the song plays

## Important Notes

- **Spotify Premium Required**: The Web Playback SDK requires a Spotify Premium account
- **Redirect URI Must Match**: The redirect URI in your `.env` file must exactly match what you configured in the Spotify app dashboard
- **CORS**: If you encounter CORS issues with the Musixmatch API in production, you may need to set up a proxy server

## Production Deployment

For production:

1. Update `VITE_SPOTIFY_REDIRECT_URI` to your production URL
2. Add the production redirect URI to your Spotify app settings
3. Build the app: `npm run build`
4. Deploy the `dist` folder to your hosting service

## Project Structure

```
src/
  components/       # React components
  services/         # API services (Spotify, Musixmatch, Auth)
  context/          # React context for state management
  hooks/            # Custom React hooks
  types/            # TypeScript type definitions
```

## Technologies Used

- React 19
- TypeScript
- Vite
- React Router
- Spotify Web API
- Spotify Web Playback SDK
- Musixmatch API
