#!/bin/bash

# Automated Setup Script for Spotify Lyrics TV
# This script does most of the setup work for you!

set -e

echo "🎵 Spotify Lyrics TV - Automated Setup"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "SpotifyLyricsTV.xcodeproj/project.pbxproj" ]; then
    echo "❌ Error: Please run this script from the tvOS folder"
    exit 1
fi

# Step 1: Get Spotify Client ID (try to auto-detect first)
echo "📝 Step 1: Spotify Configuration"
echo "--------------------------------"
echo ""

# Try to auto-detect from .env file
CLIENT_ID=""
if [ -f "../.env" ]; then
    CLIENT_ID=$(grep -i "SPOTIFY_CLIENT_ID" ../.env | cut -d '=' -f2 | tr -d ' ' | tr -d '"' | head -1)
    if [ ! -z "$CLIENT_ID" ]; then
        echo "${GREEN}✅ Found Client ID in .env file!${NC}"
        echo "   Using: ${CLIENT_ID:0:10}..."
    fi
fi

# If not found, ask user
if [ -z "$CLIENT_ID" ]; then
    echo "We need your Spotify Client ID."
    echo ""
    echo "Quick setup:"
    echo "1. Go to: https://developer.spotify.com/dashboard"
    echo "2. Create an app → Add redirect URI: spotifylyricstv://callback"
    echo "3. Copy your Client ID"
    echo ""
    read -p "Enter your Spotify Client ID (or press Enter to use existing): " CLIENT_ID
fi

if [ -z "$CLIENT_ID" ]; then
    echo "⚠️  Skipping Client ID setup. You'll need to add it manually in Config.plist"
else
    # Create or update Config.plist
    if [ ! -f "SpotifyLyricsTV/Config.plist" ]; then
        echo "Creating Config.plist..."
        cat > "SpotifyLyricsTV/Config.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>SpotifyClientID</key>
    <string>${CLIENT_ID}</string>
</dict>
</plist>
EOF
        echo "${GREEN}✅ Config.plist created with your Client ID${NC}"
    else
        # Update existing Config.plist
        echo "Updating Config.plist..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS - use PlistBuddy
            /usr/libexec/PlistBuddy -c "Set :SpotifyClientID ${CLIENT_ID}" "SpotifyLyricsTV/Config.plist" 2>/dev/null || \
            /usr/libexec/PlistBuddy -c "Add :SpotifyClientID string ${CLIENT_ID}" "SpotifyLyricsTV/Config.plist"
            echo "${GREEN}✅ Config.plist updated with your Client ID${NC}"
        else
            echo "⚠️  Please manually update Config.plist with your Client ID"
        fi
    fi
fi

echo ""
echo ""

# Step 2: Check Xcode
echo "🔧 Step 2: Checking Xcode"
echo "-------------------------"
if command -v xcodebuild &> /dev/null; then
    XCODE_VERSION=$(xcodebuild -version | head -n 1)
    echo "${GREEN}✅ Xcode found: ${XCODE_VERSION}${NC}"
else
    echo "${YELLOW}⚠️  Xcode not found. Please install it from the App Store.${NC}"
    echo "   Opening App Store..."
    open "macappstore://apps.apple.com/app/xcode/id497799835" 2>/dev/null || echo "   Please search for 'Xcode' in the App Store"
fi

echo ""
echo ""

# Step 3: Open Xcode project
echo "📂 Step 3: Opening Project"
echo "---------------------------"
echo "Opening Xcode project..."
open "SpotifyLyricsTV.xcodeproj"
echo "${GREEN}✅ Xcode should open with the project${NC}"

echo ""
echo ""

# Step 4: Instructions
echo "📋 Next Steps (in Xcode):"
echo "-------------------------"
echo ""
echo "1. Wait for Xcode to finish loading"
echo ""
echo "2. Select your Apple TV:"
echo "   - Click the device menu at the top (next to Play button)"
echo "   - Choose your Apple TV"
echo ""
echo "3. Sign the app:"
echo "   - Click 'SpotifyLyricsTV' (blue icon, top of sidebar)"
echo "   - Click 'Signing & Capabilities' tab"
echo "   - Check 'Automatically manage signing'"
echo "   - Select your Team (your Apple ID)"
echo ""
echo "4. Build & Run:"
echo "   - Click the Play button (▶️) or press ⌘R"
echo "   - Wait for it to build and install on your Apple TV"
echo ""
echo "5. Authenticate:"
echo "   - On Apple TV, click 'Connect with Spotify'"
echo "   - Copy the URL shown"
echo "   - Open it on your iPhone/iPad Safari"
echo "   - Log in and approve"
echo ""
echo "${GREEN}✅ Setup complete! Follow the steps above in Xcode.${NC}"
echo ""

