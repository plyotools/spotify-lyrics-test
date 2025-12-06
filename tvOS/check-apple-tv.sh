#!/bin/bash

echo "🔍 Checking for Apple TV connection..."
echo ""

# Check if Xcode command line tools can see devices
if command -v xcrun &> /dev/null; then
    echo "Checking connected devices..."
    xcrun xctrace list devices 2>/dev/null | grep -i "apple tv" || echo "No Apple TV found via xctrace"
    echo ""
fi

# Check via simctl
if command -v xcrun &> /dev/null; then
    echo "Checking via simctl..."
    xcrun simctl list devices available 2>/dev/null | grep -i "apple tv" || echo "No Apple TV found via simctl"
    echo ""
fi

echo "📋 To connect your Apple TV in Xcode:"
echo ""
echo "1. Make sure your Apple TV is ON and on the same Wi-Fi as your Mac"
echo ""
echo "2. In Xcode:"
echo "   - Look at the top toolbar (next to the Play button)"
echo "   - Click the device selector dropdown"
echo "   - You should see your Apple TV listed"
echo ""
echo "3. If you don't see it:"
echo "   - In Xcode: Window → Devices and Simulators"
echo "   - Click the '+' button"
echo "   - Try to add your Apple TV manually"
echo ""
echo "4. On your Apple TV:"
echo "   - Settings → Remotes and Devices → Remote App and Devices"
echo "   - Make sure it's enabled"
echo ""



