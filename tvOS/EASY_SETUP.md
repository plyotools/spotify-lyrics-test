# Easy Setup - Just 3 Steps!

This automated setup does most of the work for you.

---

## Step 1: Run the Setup Script (2 minutes)

1. **Open Terminal** on your Mac
   - Press ⌘Space (Command + Space)
   - Type "Terminal"
   - Press Enter

2. **Copy and paste this command**, then press Enter:
   ```bash
   cd "/Users/pre/Spotify Lyrics Player/tvOS" && ./setup.sh
   ```

3. **Enter your Spotify Client ID** when asked
   - Get it from: https://developer.spotify.com/dashboard
   - Create an app → Add redirect URI: `spotifylyricstv://callback`
   - Copy the Client ID

4. **The script will**:
   - ✅ Set up Config.plist automatically
   - ✅ Check if Xcode is installed
   - ✅ Open the project in Xcode

---

## Step 2: Build in Xcode (3 minutes)

The script opened Xcode for you. Now:

1. **Wait** for Xcode to finish loading (30 seconds)

2. **Select your Apple TV**:
   - Click the device menu at the top (next to ▶️)
   - Choose your Apple TV

3. **Sign the app** (one click):
   - Click "SpotifyLyricsTV" (blue icon, top of sidebar)
   - Click "Signing & Capabilities" tab
   - ✅ Check "Automatically manage signing"
   - Select your Apple ID from the Team dropdown

4. **Click the Play button** (▶️) or press ⌘R
   - Wait 2-3 minutes for it to build
   - App installs automatically on your Apple TV!

---

## Step 3: Connect Spotify (2 minutes)

1. **On your Apple TV**: Click "Connect with Spotify"

2. **Copy the URL** shown on screen

3. **On your iPhone/iPad**: 
   - Open Safari
   - Paste the URL
   - Log in and approve

4. **Done!** 🎉

---

## That's It!

**Total time: ~7 minutes**

The app is now on your Apple TV. Just start playing music on Spotify (any device) and lyrics will appear automatically!

---

## Need Help?

**"Xcode not found"**
- Install from App Store (search "Xcode")
- It's free but large (~12GB)

**"Can't find Apple TV"**
- Make sure both devices are on same Wi-Fi
- Restart Apple TV

**"Signing error"**
- Make sure you selected a Team in Signing & Capabilities
- Use your Apple ID (iCloud account)

---

**Enjoy your lyrics!** 🎵📺




