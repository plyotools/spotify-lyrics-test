# Simple Guide: Get Spotify Lyrics on Your Apple TV

**No coding required!** Just follow these steps.

---

## What You'll Need

- A Mac computer (with macOS)
- An Apple TV (4th generation or newer)
- Both devices on the same Wi-Fi network
- A free Apple ID (your iCloud account works)
- A Spotify Premium account
- About 15 minutes

---

## Step 1: Install Xcode (10 minutes)

1. **Open the App Store** on your Mac (click the App Store icon in your dock)

2. **Search for "Xcode"** in the search bar

3. **Click "Get" or "Install"** (it's free, but large - about 12GB, so it may take 10-30 minutes to download)

4. **Wait for it to download and install** (you'll see a progress bar)

5. **Open Xcode** from your Applications folder

6. **First time setup**: Xcode will ask you to install additional components - click "Install" and wait (this takes a few minutes)

✅ **Done!** Xcode is now installed.

---

## Step 2: Configure Spotify (2 minutes)

1. **Open a web browser** on your Mac

2. **Go to**: https://developer.spotify.com/dashboard

3. **Log in** with your Spotify account

4. **Click "Create an app"** (or use an existing app if you have one)

5. **Fill in**:
   - App name: `Spotify Lyrics TV` (or any name you want)
   - Description: `Personal lyrics app`
   - Check the boxes to agree to terms
   - Click "Save"

6. **Click "Edit Settings"** (or the settings icon)

7. **Scroll down** to "Redirect URIs"

8. **Click "Add URI"**

9. **Type exactly**: `spotifylyricstv://callback`

10. **Click "Add"**

11. **Click "Save"** at the bottom

12. **Copy your Client ID** (it's at the top of the page - a long string of letters and numbers)

✅ **Done!** Spotify is configured. Keep that Client ID handy.

---

## Step 3: Open the Project (1 minute)

1. **On your Mac**, open Finder (the blue face icon in your dock)

2. **Navigate to**: 
   - Go to your home folder
   - Find "Spotify Lyrics" folder
   - Open it
   - Open the "tvOS" folder inside

3. **Double-click** the file called `SpotifyLyricsTV.xcodeproj`
   - It has a blue icon with a white "X"
   - This will open Xcode

4. **Wait** for Xcode to load (may take 30 seconds the first time)

✅ **Done!** The project is open in Xcode.

---

## Step 4: Add Your Spotify Client ID (2 minutes)

1. **In Xcode**, look at the left sidebar (the file list)

2. **Find and click** on the folder called `SpotifyLyricsTV` (blue folder icon)

3. **Look for** a file called `Config.plist` in that list
   - If you don't see it, scroll down or look in the main area

4. **Click once** on `Config.plist` to select it

5. **In the main area**, you'll see something like:
   ```
   SpotifyClientID
   YOUR_SPOTIFY_CLIENT_ID_HERE
   ```

6. **Click on** `YOUR_SPOTIFY_CLIENT_ID_HERE`

7. **Paste your Client ID** (the one you copied from Spotify earlier)
   - Press ⌘V (Command + V) to paste

8. **Save the file**: Press ⌘S (Command + S)

✅ **Done!** Your Client ID is saved.

---

## Step 5: Connect Your Apple TV (2 minutes)

1. **Turn on your Apple TV** and make sure it's on the same Wi-Fi as your Mac

2. **On your Apple TV**:
   - Go to: Settings → Remotes and Devices → Remote App and Devices
   - Make sure it's enabled (should say "On")

3. **Back in Xcode**, look at the top toolbar
   - You'll see a device selector (it might say "Any Apple TV" or "Apple TV Simulator")

4. **Click on the device selector** (the dropdown menu)

5. **You should see your Apple TV** listed (it might say "Living Room" or "Apple TV" or your device name)

6. **Click on your Apple TV** to select it

7. **If you don't see your Apple TV**:
   - Make sure both devices are on the same Wi-Fi
   - Try restarting your Apple TV
   - In Xcode: Window → Devices and Simulators
   - Click the "+" button
   - Try adding your Apple TV manually

✅ **Done!** Your Apple TV is connected.

---

## Step 6: Sign the App (2 minutes)

1. **In Xcode**, click on **"SpotifyLyricsTV"** at the very top of the left sidebar (blue icon)

2. **In the main area**, you'll see tabs at the top - click **"Signing & Capabilities"**

3. **Check the box** that says **"Automatically manage signing"** (put a checkmark in it)

4. **Under "Team"**, click the dropdown menu

5. **Select your Apple ID** (or click "Add Account..." if you need to sign in)
   - Use the same Apple ID you use for iCloud
   - You may need to enter your password

6. **Xcode will automatically sign the app** (you'll see a checkmark appear)

✅ **Done!** The app is signed and ready.

---

## Step 7: Build and Install (3 minutes)

1. **In Xcode**, look at the top left
   - You'll see a Play button (▶️) and a Stop button

2. **Click the Play button** (▶️) or press ⌘R (Command + R)

3. **Xcode will start building** (you'll see progress in the top center)

4. **First time takes 2-3 minutes** - be patient!

5. **If you see errors**:
   - Look at the bottom panel for red error messages
   - Common fix: Make sure Config.plist has your Client ID
   - Try: Product → Clean Build Folder (⇧⌘K), then build again

6. **When it's done**, the app will automatically install on your Apple TV and launch!

✅ **Done!** The app is now on your Apple TV!

---

## Step 8: Connect to Spotify (5 minutes)

1. **On your Apple TV**, you'll see the login screen

2. **Click "Connect with Spotify"** (use your Apple TV remote)

3. **A long URL will appear on screen** - this is your authentication link

4. **On your iPhone or iPad**:
   - Open Safari
   - Type or paste the URL from your TV
   - Press Go

5. **Log in** with your Spotify account

6. **Approve the permissions** (click "Agree" or "Authorize")

7. **You'll be redirected** - the redirect won't work on your phone, that's OK!

8. **Copy the full URL** from your phone's address bar
   - It will look like: `spotifylyricstv://callback?code=...&state=...`
   - Copy the ENTIRE URL

9. **Back on your Apple TV**:
   - The app should automatically detect the callback
   - If not, you may need to manually enter it (we can add this feature if needed)

10. **You're connected!** 🎉

---

## Step 9: Enjoy!

1. **Start playing music** on Spotify (on any device - phone, computer, etc.)

2. **The app will automatically**:
   - Detect the current track
   - Show synchronized lyrics
   - Highlight words as they're sung

3. **Use your Apple TV remote** to:
   - Play/Pause
   - Skip tracks
   - See track info

---

## Troubleshooting

### "Xcode won't open"
- Make sure you downloaded it from the App Store
- Try restarting your Mac

### "Can't find my Apple TV"
- Make sure both are on the same Wi-Fi
- Restart both devices
- Check Apple TV settings: Settings → Remotes and Devices

### "Signing error"
- Make sure you selected a Team in Signing & Capabilities
- Try clicking "Automatically manage signing" again
- Make sure you're signed in with your Apple ID

### "Config.plist not found"
- The file should be in the `SpotifyLyricsTV` folder
- In Xcode, right-click the folder → Add Files → Select Config.plist

### "App won't launch on Apple TV"
- Check Xcode console (bottom panel) for errors
- Try uninstalling and reinstalling
- Make sure your Apple TV has enough storage

### "Can't authenticate"
- Make sure the redirect URI in Spotify dashboard is exactly: `spotifylyricstv://callback`
- Check that your Client ID is correct in Config.plist
- Try the authentication process again

---

## Need Help?

If you get stuck:
1. Check the error messages in Xcode (bottom panel)
2. Make sure you followed each step exactly
3. Try restarting Xcode and your Apple TV
4. The app will need to be re-signed every 7 days (for free Apple IDs) - just rebuild it

---

## That's It!

You now have synchronized Spotify lyrics on your Apple TV! 🎵📺

Enjoy your music with beautiful, real-time lyrics on the big screen!




