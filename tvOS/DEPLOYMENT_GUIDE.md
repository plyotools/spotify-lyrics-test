# Step-by-Step: Deploying to Your Apple TV

Follow these steps to get the app running on your Apple TV.

## Step 1: Configure Spotify App (5 minutes)

1. **Go to Spotify Developer Dashboard**:
   - Visit: https://developer.spotify.com/dashboard
   - Log in with your Spotify account

2. **Select or Create an App**:
   - If you already have an app, click on it
   - If not, click "Create an app" and fill in:
     - App name: "Spotify Lyrics TV" (or any name)
     - App description: "Personal lyrics display app"
     - Accept the terms

3. **Add Redirect URI**:
   - Click "Edit Settings"
   - Scroll to "Redirect URIs"
   - Click "Add URI"
   - Enter exactly: `spotifylyricstv://callback`
   - Click "Add"
   - Click "Save" at the bottom

4. **Note your Client ID** (you already have it: `6cb43ac21aad478494638f5a449aee41`)

✅ **Step 1 Complete!** Your Spotify app is configured.

---

## Step 2: Prepare Your Mac (2 minutes)

1. **Make sure Xcode is installed**:
   ```bash
   xcode-select --version
   ```
   - If you see a version, you're good!
   - If not, install Xcode from the App Store

2. **Connect your Apple TV to your Mac**:
   - Make sure your Apple TV and Mac are on the same Wi-Fi network
   - On Apple TV: Settings → Remotes and Devices → Remote App and Devices
   - Make sure "Enable Developer Mode" is ON (if available)

---

## Step 3: Open Project in Xcode (1 minute)

1. **Open the Xcode project**:
   ```bash
   cd "/Users/pre/Spotify Lyrics Player/tvOS"
   open SpotifyLyricsTV.xcodeproj
   ```

   Or manually:
   - Open Xcode
   - File → Open
   - Navigate to: `/Users/pre/Spotify Lyrics Player/tvOS/`
   - Select `SpotifyLyricsTV.xcodeproj`
   - Click Open

2. **Wait for Xcode to index** (may take a minute)

---

## Step 4: Configure Signing (2 minutes)

1. **Select the project** in the left sidebar (top item: "SpotifyLyricsTV")

2. **Select the target** "SpotifyLyricsTV" (under TARGETS)

3. **Go to "Signing & Capabilities" tab**

4. **Check "Automatically manage signing"**

5. **Select your Team**:
   - If you have a free Apple Developer account, select it
   - If you don't have one, you can create a free account:
     - Click "Add Account..."
     - Sign in with your Apple ID
     - Accept the terms

6. **Bundle Identifier** should be: `com.spotifylyrics.tv`
   - If it's different, change it to this

✅ **Step 4 Complete!** Your app is signed.

---

## Step 5: Connect Your Apple TV (1 minute)

1. **Make sure your Apple TV is on and connected to Wi-Fi**

2. **In Xcode, select your Apple TV as the target**:
   - At the top of Xcode, next to the play button
   - Click the device selector (probably says "Apple TV" or "Any Apple TV")
   - You should see your Apple TV listed (e.g., "Living Room" or "Apple TV")
   - Select it

3. **If you don't see your Apple TV**:
   - Make sure it's on the same Wi-Fi network
   - On Apple TV: Settings → Remotes and Devices → Remote App and Devices
   - Make sure "Enable Developer Mode" is ON
   - In Xcode: Window → Devices and Simulators
   - Click the "+" button and add your Apple TV manually

---

## Step 6: Build and Deploy (3 minutes)

1. **Build the project**:
   - Press `⌘B` (Command + B) or Product → Build
   - Wait for it to compile (first time may take 2-3 minutes)

2. **If you see errors**:
   - Common issue: "Config.plist not found"
     - Make sure `Config.plist` is in the `SpotifyLyricsTV` folder
     - In Xcode, right-click the `SpotifyLyricsTV` folder → Add Files to "SpotifyLyricsTV"
     - Select `Config.plist` and make sure "Copy items if needed" is checked

3. **Run on Apple TV**:
   - Press `⌘R` (Command + R) or click the Play button
   - Xcode will build and install the app on your Apple TV
   - The app should launch automatically

✅ **Step 6 Complete!** The app is now on your Apple TV!

---

## Step 7: Authenticate with Spotify (5 minutes)

1. **On your Apple TV**, you should see the login screen

2. **The app will display a URL** (or you'll need to check the console)

3. **For now, let's improve the auth flow** - I'll update the app to show the URL on screen

4. **Open the URL on your iPhone/iPad**:
   - The URL will look like: `https://accounts.spotify.com/authorize?...`
   - Copy it or type it in Safari on your phone
   - Log in with your Spotify account
   - Approve the permissions
   - You'll be redirected to `spotifylyricstv://callback`

5. **The app should automatically authenticate**

---

## Troubleshooting

### "No devices found"
- Make sure Apple TV and Mac are on same Wi-Fi
- Enable Developer Mode on Apple TV
- Try restarting both devices

### "Code signing error"
- Make sure you selected a Team in Signing & Capabilities
- Try cleaning the build: Product → Clean Build Folder (⇧⌘K)

### "Config.plist not found"
- Make sure the file exists in `tvOS/SpotifyLyricsTV/Config.plist`
- Add it to Xcode project if missing

### App crashes on launch
- Check Xcode console for errors
- Make sure Config.plist has the correct Client ID

### Can't authenticate
- Verify redirect URI in Spotify dashboard: `spotifylyricstv://callback`
- Check that it matches exactly (case-sensitive)

---

## Next Steps

Once authenticated:
1. Start playing music on Spotify (any device)
2. The app will automatically detect the current track
3. Lyrics will appear and sync in real-time!

Enjoy your lyrics on the big screen! 🎵📺




