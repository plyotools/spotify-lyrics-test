#!/bin/bash

# One-Command Setup - Does Everything Automatically!

set -e

cd "$(dirname "$0")"

echo "🚀 Spotify Lyrics TV - One-Command Setup"
echo "========================================"
echo ""

# Auto-detect Client ID
CLIENT_ID=""
if [ -f "../.env" ]; then
    CLIENT_ID=$(grep -i "SPOTIFY_CLIENT_ID" ../.env | cut -d '=' -f2 | tr -d ' ' | tr -d '"' | head -1)
fi

# Update Config.plist automatically
if [ ! -z "$CLIENT_ID" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        /usr/libexec/PlistBuddy -c "Set :SpotifyClientID ${CLIENT_ID}" "SpotifyLyricsTV/Config.plist" 2>/dev/null || \
        /usr/libexec/PlistBuddy -c "Add :SpotifyClientID string ${CLIENT_ID}" "SpotifyLyricsTV/Config.plist" 2>/dev/null || \
        echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <key>SpotifyClientID</key>
    <string>${CLIENT_ID}</string>
</dict>
</plist>" > "SpotifyLyricsTV/Config.plist"
        echo "✅ Config.plist ready"
    fi
fi

# Open Xcode
echo "📂 Opening Xcode..."
open "SpotifyLyricsTV.xcodeproj"

echo ""
echo "✅ Done! Xcode is opening..."
echo ""
echo "📋 In Xcode (just 2 clicks):"
echo "   1. Select your Apple TV (device menu at top)"
echo "   2. Click Play (▶️)"
echo ""
echo "That's it! The app will build and install automatically."




