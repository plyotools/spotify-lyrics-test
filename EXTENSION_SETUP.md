# Chrome Extension Setup

## Icons

You need to add Spotify icons to `public/icons/`:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

### Getting Icons

1. Visit [Spotify Brand Guidelines](https://developer.spotify.com/branding-guidelines/)
2. Download the Spotify logo/icon
3. Resize to the required dimensions
4. Place in `public/icons/` folder

Alternatively, you can use a simple green music note icon as a placeholder.

## Building the Extension

1. Build the project:
   ```bash
   npm run build
   ```

2. The `dist` folder will contain the extension files

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Environment Variables

For the extension, you'll need to set environment variables in the build. You can:
1. Create a `.env.production` file with your keys
2. Or modify the code to use Chrome extension storage for configuration

## Notes

- The extension will open as a popup when clicking the icon
- Make sure your redirect URI in Spotify app settings matches the extension's origin
- You may need to adjust the OAuth redirect flow for extension context






