# Quick Setup Guide

## 1. Create Config.plist

Copy the example file and add your Spotify Client ID:

```bash
cd tvOS
cp Config.plist.example SpotifyLyricsTV/Config.plist
```

Then edit `SpotifyLyricsTV/Config.plist` and replace `YOUR_SPOTIFY_CLIENT_ID_HERE` with your actual Client ID.

## 2. Configure Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Select your app (or create a new one)
3. Click "Edit Settings"
4. Under "Redirect URIs", add: `spotifylyricstv://callback`
5. Save

## 3. Open in Xcode

```bash
open SpotifyLyricsTV.xcodeproj
```

## 4. Build and Run

1. Select your Apple TV as the target device (or Apple TV Simulator)
2. Press ⌘R to build and run

## Authentication Note

Since tvOS doesn't support web authentication directly, you have a few options:

### Option A: Companion Device (Easiest)
1. When you tap "Connect with Spotify", the app will display a URL
2. Open that URL on your iPhone/iPad Safari
3. Complete authentication there
4. The callback will be handled by the app

### Option B: Manual Token (For Development)
You can modify the app to accept a token manually. This is useful for testing.

### Option C: Web Server Proxy (Advanced)
Set up a simple web server that handles OAuth and redirects to the app.

## Troubleshooting

- **"Spotify Client ID not found"**: Make sure `Config.plist` exists in the `SpotifyLyricsTV` folder and contains your Client ID
- **Build errors**: Make sure you're using Xcode 14+ and targeting tvOS 16.0+
- **Authentication fails**: Verify the redirect URI matches exactly: `spotifylyricstv://callback`




