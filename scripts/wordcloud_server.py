#!/usr/bin/env python3
"""
Simple Flask server to generate word clouds on demand
Run with: python3 scripts/wordcloud_server.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from generate_wordcloud import generate_wordcloud

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/wordcloud', methods=['POST'])
def create_wordcloud():
    """Generate word cloud from lyrics and colors"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        lyrics = data.get('lyrics', '')
        colors = data.get('colors', [])
        width = data.get('width', 1920)
        height = data.get('height', 1080)
        max_words = data.get('max_words', 200)
        
        if not lyrics:
            return jsonify({'error': 'Lyrics text is required'}), 400
        
        if not colors:
            return jsonify({'error': 'Colors array is required'}), 400
        
        # Generate word cloud as base64
        image_base64 = generate_wordcloud(
            lyrics_text=lyrics,
            colors=colors,
            width=width,
            height=height,
            max_words=max_words,
            return_base64=True
        )
        
        if not image_base64:
            return jsonify({'error': 'Failed to generate word cloud'}), 500
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{image_base64}'
        })
    
    except Exception as e:
        print(f"Error generating word cloud: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'wordcloud'})

if __name__ == '__main__':
    PORT = 5001  # Use 5001 to avoid macOS AirPlay Receiver on 5000
    print("Starting Word Cloud Server...")
    print(f"Server running at http://localhost:{PORT}")
    print(f"API endpoint: http://localhost:{PORT}/api/wordcloud")
    app.run(port=PORT, debug=True, host='127.0.0.1')

