#!/usr/bin/env python3
"""
Create Spotify-style icons for Chrome extension
Generates icons in 16x16, 48x48, and 128x128 sizes
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
except ImportError:
    print("PIL (Pillow) not installed. Installing...")
    import subprocess
    subprocess.check_call(["pip3", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont
    import os

# Spotify brand colors
SPOTIFY_GREEN = "#1DB954"
SPOTIFY_BLACK = "#121212"
SPOTIFY_WHITE = "#FFFFFF"

def create_spotify_icon(size):
    """Create a Spotify-style icon with three curved lines (Spotify logo style)"""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw circular background with Spotify green
    margin = max(1, size // 32)  # Very small margin
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=SPOTIFY_GREEN,
        outline=None
    )
    
    # Draw three curved lines (simplified Spotify logo style)
    # Scale based on icon size
    center_x = size / 2
    center_y = size / 2
    line_width = max(2, size // 16)
    
    # For smaller icons, use simpler design
    if size <= 16:
        # Simple music note for very small sizes
        note_size = size * 0.4
        # Note head
        draw.ellipse(
            [
                center_x - note_size * 0.3,
                center_y - note_size * 0.15,
                center_x + note_size * 0.3,
                center_y + note_size * 0.15
            ],
            fill=SPOTIFY_WHITE,
            outline=None
        )
        # Stem
        draw.rectangle(
            [
                center_x + note_size * 0.2,
                center_y - note_size * 0.15,
                center_x + note_size * 0.2 + line_width,
                center_y + note_size * 0.4
            ],
            fill=SPOTIFY_WHITE,
            outline=None
        )
    else:
        # Three curved lines for larger icons (Spotify logo style)
        spacing = size * 0.12
        line_height = size * 0.15
        
        # Top curve (smallest)
        draw.arc(
            [
                center_x - spacing * 1.5,
                center_y - spacing - line_height * 0.5,
                center_x - spacing * 0.5,
                center_y - spacing + line_height * 0.5
            ],
            start=0,
            end=180,
            fill=SPOTIFY_WHITE,
            width=line_width
        )
        
        # Middle curve (medium)
        draw.arc(
            [
                center_x - spacing * 0.5,
                center_y - line_height * 0.5,
                center_x + spacing * 0.5,
                center_y + line_height * 0.5
            ],
            start=0,
            end=180,
            fill=SPOTIFY_WHITE,
            width=line_width
        )
        
        # Bottom curve (largest)
        draw.arc(
            [
                center_x + spacing * 0.5,
                center_y + spacing - line_height * 0.5,
                center_x + spacing * 1.5,
                center_y + spacing + line_height * 0.5
            ],
            start=0,
            end=180,
            fill=SPOTIFY_WHITE,
            width=line_width
        )
    
    return img

def main():
    sizes = [16, 48, 128]
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("Creating Spotify-style icons...")
    
    for size in sizes:
        icon = create_spotify_icon(size)
        filename = os.path.join(output_dir, f"icon{size}.png")
        icon.save(filename, "PNG", optimize=True)
        print(f"✓ Created {filename} ({size}x{size})")
    
    print("\n✓ All icons created successfully!")
    print(f"Icons saved in: {output_dir}")

if __name__ == "__main__":
    main()

