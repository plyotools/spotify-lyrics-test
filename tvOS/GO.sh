#!/bin/bash

# ONE COMMAND - Does Everything!

cd "$(dirname "$0")"

echo "🚀 Setting up..."

# Auto-configure
CLIENT_ID=""
if [ -f "../.env" ]; then
    CLIENT_ID=$(grep -i "SPOTIFY_CLIENT_ID" ../.env | cut -d '=' -f2 | tr -d ' ' | tr -d '"' | head -1)
fi

if [ ! -z "$CLIENT_ID" ] && [[ "$OSTYPE" == "darwin"* ]]; then
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
fi

# Try to find connected Apple TV
DEVICE=$(xcrun simctl list devices available 2>/dev/null | grep -i "apple tv" | head -1 | sed 's/.*(\(.*\))/\1/' | tr -d ' ')

# Open Xcode
open "SpotifyLyricsTV.xcodeproj"

echo ""
echo "✅ Xcode is opening..."
echo ""
echo "📺 When Xcode opens:"
echo "   Just click the Play button (▶️) at the top"
echo ""
echo "   (If it asks to sign, click 'Automatically manage signing' and select your Apple ID)"
echo ""

# Try to build from command line if xcodebuild is available
if command -v xcodebuild &> /dev/null; then
    echo "⚡ Attempting automatic build..."
    sleep 3  # Wait for Xcode to open
    
    # Try to build (this will fail if not signed, but worth trying)
    xcodebuild -project SpotifyLyricsTV.xcodeproj \
               -scheme SpotifyLyricsTV \
               -destination 'platform=tvOS,name=Any Apple TV' \
               build 2>&1 | grep -E "(BUILD|error|succeeded|failed)" | head -5 || true
    
    echo ""
    echo "💡 If build failed, just click Play (▶️) in Xcode - it's easier!"
fi

echo "🎉 Done! Check Xcode."




