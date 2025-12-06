# Quick Start: Get It Running on Your Apple TV

## ✅ Step 1: Configure Spotify (2 minutes)

1. Go to: https://developer.spotify.com/dashboard
2. Click your app (or create one)
3. Click **"Edit Settings"**
4. Under **"Redirect URIs"**, click **"Add URI"**
5. Enter: `spotifylyricstv://callback`
6. Click **"Add"** then **"Save"**

✅ Done! Your Spotify app is ready.

---

## ✅ Step 2: Open in Xcode (1 minute)

Run this command:
```bash
cd "/Users/pre/Spotify Lyrics Player/tvOS"
open SpotifyLyricsTV.xcodeproj
```

Or manually:
- Open Xcode
- File → Open
- Navigate to `tvOS` folder
- Open `SpotifyLyricsTV.xcodeproj`

---

## ✅ Step 3: Sign the App (2 minutes)

1. In Xcode, click **"SpotifyLyricsTV"** (blue icon, top of left sidebar)
2. Select the **"SpotifyLyricsTV"** target (under TARGETS)
3. Click **"Signing & Capabilities"** tab
4. Check ✅ **"Automatically manage signing"**
5. Select your **Team** (or "Add Account..." to create free Apple ID)
6. Bundle Identifier should be: `com.spotifylyrics.tv`

✅ Done! App is signed.

---

## ✅ Step 4: Connect Apple TV (1 minute)

1. **Make sure your Apple TV is ON and on the same Wi-Fi as your Mac**

2. **In Xcode**, at the top next to the Play button, click the device selector
   - You should see your Apple TV (e.g., "Living Room" or "Apple TV")
   - Select it

3. **If you don't see it**:
   - On Apple TV: Settings → Remotes and Devices → Remote App and Devices
   - Make sure it's enabled
   - In Xcode: Window → Devices and Simulators → Add device

---

## ✅ Step 5: Build & Run (3 minutes)

1. **Press `⌘B`** (Command + B) to build
   - First time takes 2-3 minutes
   - Watch for errors in the bottom panel

2. **If you see "Config.plist not found"**:
   - The file should already exist at `tvOS/SpotifyLyricsTV/Config.plist`
   - If missing, Xcode will show an error - just add it to the project

3. **Press `⌘R`** (Command + R) to run
   - Xcode will install the app on your Apple TV
   - The app will launch automatically

✅ **The app is now on your Apple TV!**

---

## ✅ Step 6: Authenticate (5 minutes)

1. **On your Apple TV**, you'll see the login screen

2. **Click "Connect with Spotify"**

3. **A long URL will appear on screen** - this is your authentication URL

4. **On your iPhone/iPad**:
   - Open Safari
   - Type or paste the URL from your TV
   - Log in with your Spotify account
   - Approve the permissions
   - You'll be redirected (the redirect won't work, that's OK)

5. **Copy the callback URL** from the address bar:
   - It will look like: `spotifylyricstv://callback?code=...&state=...`
   - Copy the ENTIRE URL

6. **Back on your Apple TV**:
   - The app should automatically detect the callback
   - If not, you may need to manually enter it (we can add this feature if needed)

7. **You're authenticated!** 🎉

---

## ✅ Step 7: Enjoy!

1. **Start playing music** on Spotify (any device - phone, computer, etc.)

2. **The app will automatically**:
   - Detect the current track
   - Fetch synchronized lyrics
   - Display them on your TV with word-level highlighting

3. **Use the remote** to:
   - Play/Pause
   - Skip tracks
   - See upcoming tracks

---

## 🆘 Troubleshooting

### "No devices found"
- ✅ Apple TV and Mac on same Wi-Fi?
- ✅ Developer mode enabled on Apple TV?
- ✅ Try restarting both devices

### "Code signing error"
- ✅ Did you select a Team in Signing & Capabilities?
- ✅ Try: Product → Clean Build Folder (⇧⌘K)

### "Config.plist not found"
- ✅ File should be at: `tvOS/SpotifyLyricsTV/Config.plist`
- ✅ Right-click folder in Xcode → Add Files → Select Config.plist

### "Authentication fails"
- ✅ Redirect URI in Spotify dashboard: `spotifylyricstv://callback` (exact match!)
- ✅ Check the URL on TV matches what's in Spotify dashboard

### App crashes
- ✅ Check Xcode console (bottom panel) for error messages
- ✅ Make sure Config.plist has your Client ID

---

## 🎯 You're All Set!

The app is now running on your Apple TV. Start playing music and enjoy synchronized lyrics on the big screen! 🎵📺




