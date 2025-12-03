#!/usr/bin/env python3
"""
Generate a word cloud from lyrics using colors from album cover art.
Uses the wordcloud library: https://github.com/amueller/word_cloud
"""

import sys
import os
import json
import argparse
from typing import List, Optional
from io import BytesIO
import base64

try:
    from wordcloud import WordCloud
    import numpy as np
    from PIL import Image, ImageDraw
except ImportError as e:
    print(f"Error: Required packages not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "wordcloud", "pillow", "numpy"])
    from wordcloud import WordCloud
    import numpy as np
    from PIL import Image, ImageDraw

def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_color_func(colors: List[str]):
    """Create a color function that randomly selects from the provided colors"""
    import random
    
    # Convert hex colors to RGB tuples
    rgb_colors = [hex_to_rgb(color) for color in colors]
    
    def color_func(word, font_size, position, orientation, random_state=None, **kwargs):
        # Randomly select a color from the album cover colors
        return random.choice(rgb_colors)
    
    return color_func

def find_system_font():
    """Try to find or download Roboto Bold font"""
    import platform
    import os
    import urllib.request
    
    system = platform.system()
    
    # Check for local fonts directory in project
    script_dir = os.path.dirname(os.path.abspath(__file__))
    fonts_dir = os.path.join(os.path.dirname(script_dir), 'fonts')
    local_roboto_bold = os.path.join(fonts_dir, 'Roboto-Bold.ttf')
    
    # Create fonts directory if it doesn't exist
    if not os.path.exists(fonts_dir):
        os.makedirs(fonts_dir, exist_ok=True)
    
    # If local font exists, use it
    if os.path.exists(local_roboto_bold):
        print(f"✅ Using local Roboto Bold: {local_roboto_bold}")
        return local_roboto_bold
    
    # Roboto font paths - prefer Bold
    roboto_paths = [
        local_roboto_bold,  # Check local first
        # macOS - check common locations for Roboto Bold
        '/System/Library/Fonts/Supplemental/Roboto-Bold.ttf',
        '/Library/Fonts/Roboto-Bold.ttf',
        os.path.expanduser('~/Library/Fonts/Roboto-Bold.ttf'),
        '/System/Library/Fonts/Supplemental/Roboto-Regular.ttf',
        '/Library/Fonts/Roboto-Regular.ttf',
        # Linux - Google Fonts location
        os.path.expanduser('~/.local/share/fonts/Roboto-Bold.ttf'),
        '/usr/share/fonts/truetype/roboto/Roboto-Bold.ttf',
        '/usr/share/fonts/TTF/Roboto-Bold.ttf',
        '/usr/share/fonts/truetype/roboto/Roboto-Regular.ttf',
        # Windows - Google Fonts location
        'C:/Windows/Fonts/roboto-bold.ttf',
        'C:/Windows/Fonts/roboto-regular.ttf',
    ]
    
    # Expand user home directory
    roboto_paths = [os.path.expanduser(path) if '~' in str(path) else path for path in roboto_paths]
    
    # Try to find Roboto Bold (prioritizing Bold)
    for path in roboto_paths:
        if os.path.exists(path):
            print(f"✅ Found Roboto font: {path}")
            return path
    
    # If not found, try to download Roboto Bold from Google Fonts
    try:
        print("📥 Roboto Bold not found locally. Downloading from Google Fonts...")
        roboto_bold_url = "https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf"
        urllib.request.urlretrieve(roboto_bold_url, local_roboto_bold)
        print(f"✅ Downloaded Roboto Bold to {local_roboto_bold}")
        if os.path.exists(local_roboto_bold):
            return local_roboto_bold
    except Exception as e:
        print(f"⚠️ Could not download Roboto Bold: {e}")
        # Fall through to system font fallback
    
    # Fallback to system fonts with medium/bold weights
    if system == 'Darwin':
        font_paths = [
            '/System/Library/Fonts/Supplemental/SF-Pro-Display-Medium.otf',
            '/System/Library/Fonts/HelveticaNeue-Medium.ttc',
        ]
    elif system == 'Linux':
        font_paths = [
            '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        ]
    elif system == 'Windows':
        font_paths = [
            'C:/Windows/Fonts/arialbd.ttf',
            'C:/Windows/Fonts/segoeuib.ttf',
        ]
    else:
        font_paths = []
    
    for path in font_paths:
        if os.path.exists(path):
            return path
    
    return None  # Will use default font


def generate_wordcloud(
    lyrics_text: str,
    colors: List[str],
    width: int = 1920,
    height: int = 1080,
    background_color: str = 'rgba(0,0,0,0)',  # Transparent background
    max_words: int = 200,
    relative_scaling: float = 0.5,
    colormap: Optional[str] = None,
    output_path: Optional[str] = None,
    return_base64: bool = False
) -> Optional[str]:
    """
    Generate a word cloud from lyrics text using specified colors.
    
    Args:
        lyrics_text: The lyrics text to generate word cloud from
        colors: List of hex color strings from album cover art
        width: Image width in pixels
        height: Image height in pixels
        background_color: Background color (default transparent)
        max_words: Maximum number of words in the cloud
        relative_scaling: Relative scaling between words
        colormap: Optional colormap name (overrides custom colors if provided)
        output_path: Optional path to save the image file
        return_base64: If True, return base64 encoded image string
        
    Returns:
        Base64 encoded image string if return_base64=True, else None
    """
    if not lyrics_text or not colors:
        print("Error: lyrics_text and colors are required")
        return None
    
    # Clean and prepare text
    text = lyrics_text.strip()
    
    # Set background - handle transparent or solid
    if background_color.startswith('rgba') and '0,0,0,0' in background_color:
        bg_color = 'black'  # WordCloud doesn't support transparent, we'll use black and make transparent in post
        make_transparent = True
    else:
        bg_color = background_color.replace('rgba(', '').replace(')', '').split(',')[0] if 'rgba' in background_color else background_color
        make_transparent = False
    
    # Create color function from darkest colors
    color_func = create_color_func(colors)
    
    # Try to find system font
    font_path = find_system_font()
    
    # Generate word cloud with darkest colors
    wordcloud_params = {
        'width': width,
        'height': height,
        'background_color': bg_color,
        'max_words': max_words,
        'relative_scaling': relative_scaling,
        'color_func': color_func,  # Use darkest colors from album cover
        'prefer_horizontal': 0.6,  # More horizontal words (60% horizontal, 40% vertical) to ensure horizontal words appear
        'min_font_size': 40,  # Larger minimum font size
        'max_font_size': 300,  # Larger maximum font size
        'font_step': 4,  # More size variation
        'margin': 0,  # Zero margin - tightest possible packing
        'collocations': False,  # Don't treat collocations as single words
        'normalize_plurals': True,
        'repeat': True,  # Allow word repetition to fill space
    }
    
    # Add font path if found
    if font_path:
        wordcloud_params['font_path'] = font_path
        print(f"🔤 Using font: {font_path}")
    else:
        print("⚠️ No Roboto font found, using default font. Font may not match app design.")
    
    # Log the prefer_horizontal setting for debugging
    print(f"🔤 Word cloud generation: prefer_horizontal = {wordcloud_params['prefer_horizontal']} (0.6 = 60% horizontal, 40% vertical)")
    
    wordcloud = WordCloud(**wordcloud_params).generate(text)
    
    # Convert to PIL Image
    image = wordcloud.to_image()
    
    # Make background transparent if requested
    if make_transparent:
        # Convert black background to transparent
        img_array = np.array(image)
        # Create mask where black pixels are (background)
        # Check if pixel is black (all RGB values close to 0)
        mask = (img_array[:, :, 0] < 10) & (img_array[:, :, 1] < 10) & (img_array[:, :, 2] < 10)
        # Add alpha channel - transparent for black background, opaque for white text
        img_with_alpha = np.dstack((img_array, np.where(mask, 0, 255)))
        image = Image.fromarray(img_with_alpha.astype('uint8'), 'RGBA')
    
    # Save or return
    if output_path:
        image.save(output_path, 'PNG', optimize=True)
        print(f"✓ Word cloud saved to: {output_path}")
    
    if return_base64:
        # Convert to base64
        buffer = BytesIO()
        image.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return img_str
    
    return None

def main():
    parser = argparse.ArgumentParser(description='Generate word cloud from lyrics using album cover colors')
    parser.add_argument('--lyrics', '-l', type=str, help='Lyrics text or path to lyrics file')
    parser.add_argument('--colors', '-c', type=str, nargs='+', help='Hex color codes from album cover (space-separated)')
    parser.add_argument('--colors-json', type=str, help='Path to JSON file with colors array')
    parser.add_argument('--output', '-o', type=str, default='wordcloud.png', help='Output image path')
    parser.add_argument('--width', type=int, default=1920, help='Image width in pixels')
    parser.add_argument('--height', type=int, default=1080, help='Image height in pixels')
    parser.add_argument('--max-words', type=int, default=200, help='Maximum number of words')
    parser.add_argument('--background', type=str, default='rgba(0,0,0,0)', help='Background color (default: transparent)')
    parser.add_argument('--base64', action='store_true', help='Output base64 encoded image instead of saving file')
    
    args = parser.parse_args()
    
    # Get lyrics text
    if args.lyrics:
        if os.path.isfile(args.lyrics):
            with open(args.lyrics, 'r', encoding='utf-8') as f:
                lyrics_text = f.read()
        else:
            lyrics_text = args.lyrics
    else:
        # Read from stdin
        lyrics_text = sys.stdin.read()
    
    # Get colors
    colors = []
    if args.colors:
        colors = args.colors
    elif args.colors_json:
        with open(args.colors_json, 'r') as f:
            color_data = json.load(f)
            colors = color_data.get('colors', [])
    else:
        # Default colors if none provided
        colors = ['#1DB954', '#FFFFFF', '#B3B3B3', '#000000']
        print("Warning: No colors provided, using default Spotify colors")
    
    if not colors:
        print("Error: No colors provided")
        sys.exit(1)
    
    # Generate word cloud
    result = generate_wordcloud(
        lyrics_text=lyrics_text,
        colors=colors,
        width=args.width,
        height=args.height,
        background_color=args.background,
        max_words=args.max_words,
        output_path=args.output if not args.base64 else None,
        return_base64=args.base64
    )
    
    if args.base64 and result:
        print(result)
    elif not args.base64:
        print(f"✓ Word cloud generated successfully!")

if __name__ == '__main__':
    main()

