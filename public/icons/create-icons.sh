#!/bin/bash
# Create simple placeholder icons using sips

# Create a 128x128 green square as base
sips -s format png -z 128 128 --setProperty formatOptions normal /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns --out icon128.png 2>/dev/null || echo "Creating placeholder..."

# If sips doesn't work, create simple colored squares
if [ ! -f icon128.png ]; then
  # Use ImageMagick if available, or create via Python
  python3 << PYTHON
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    img = Image.new('RGB', (size, size), color='#1DB954')
    draw = ImageDraw.Draw(img)
    # Draw a simple music note or circle
    draw.ellipse([size*0.1, size*0.1, size*0.9, size*0.9], fill='#1DB954', outline='#FFFFFF', width=2)
    img.save(filename)

try:
    create_icon(128, 'icon128.png')
    create_icon(48, 'icon48.png')
    create_icon(16, 'icon16.png')
    print("Icons created successfully")
except ImportError:
    print("PIL not available. Please install: pip install Pillow")
    print("Or manually create icons: 16x16, 48x48, 128x128 PNG files")
PYTHON
fi

# Resize if base icon was created
if [ -f icon128.png ]; then
  sips -z 48 48 icon128.png --out icon48.png
  sips -z 16 16 icon128.png --out icon16.png
  echo "Icons created: icon16.png, icon48.png, icon128.png"
fi
