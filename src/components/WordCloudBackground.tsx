import { useEffect, useState, useMemo } from 'react';
import type { LyricsData } from '../types/lyrics';
import { extractLyricsText, areLyricsReady } from '../utils/generateWordCloud';

interface WordCloudBackgroundProps {
  lyrics: LyricsData | null;
  colors: string[];
  visible?: boolean;
  opacity?: number;
}

export const WordCloudBackground = ({ 
  lyrics, 
  colors, 
  visible = true,
  opacity = 0.5 
}: WordCloudBackgroundProps) => {
  const [wordCloudImage, setWordCloudImage] = useState<string | null>(null);
  const [_isGenerating, setIsGenerating] = useState(false);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const [lastLyricsHash, setLastLyricsHash] = useState<string>('');

  // Create a hash of lyrics content to detect changes
  const lyricsHash = useMemo(() => {
    if (!lyrics) return '';
    const lyricsText = extractLyricsText(lyrics);
    return `${lyricsText.substring(0, 100)}_${lyrics.lines.length}`;
  }, [lyrics]);

  useEffect(() => {
    console.log('🔍 WordCloud useEffect triggered', { hasLyrics: !!lyrics, visible, colorsCount: colors.length, lyricsHash });
    
    // If lyrics changed, clear the old word cloud to force regeneration
    if (lyricsHash && lyricsHash !== lastLyricsHash) {
      console.log('🔄 Lyrics changed, clearing old word cloud to force regeneration');
      setWordCloudImage(null);
      setLastLyricsHash(lyricsHash);
    }
    
    // Validate that lyrics are fully ready
    // For testing, allow even without colors (we use white anyway)
    if (!lyrics || !visible) {
      console.log('⏸️ Word cloud skipped: no lyrics or not visible');
      // Don't clear existing image - keep it if we have one
      return;
    }
    
    // Use white color if no colors provided (for testing)
    const colorsToUse = colors.length > 0 ? colors : ['#FFFFFF'];
    console.log('🎨 Using colors:', colorsToUse);

    // Check if lyrics are ready using the validation function
    if (!areLyricsReady(lyrics)) {
      // Lyrics are not ready yet - wait but don't clear existing image
      console.log('⏳ Lyrics not ready yet, waiting...');
      return;
    }
    
    console.log('✅ Lyrics are ready, proceeding with word cloud generation');

    // Reset server availability check only if it was previously unavailable
    // This allows us to retry when lyrics change
    if (serverAvailable === false) {
      setServerAvailable(null);
    }

    // Add a small delay to ensure lyrics are stable and fully loaded
    const lyricsTimeoutId = setTimeout(() => {
      // Double-check that lyrics are still valid and ready after delay
      if (!lyrics || !areLyricsReady(lyrics)) {
        // Don't clear existing image - keep it if we have one
        return;
      }

      const generateWordCloud = async () => {
        console.log('🚀 Starting word cloud generation...');
        setIsGenerating(true);
        
        try {
          const finalLyricsText = extractLyricsText(lyrics);
          console.log('📝 Extracted lyrics text length:', finalLyricsText?.length || 0);
          
          // Final validation - ensure we have substantial text
          if (!finalLyricsText || !finalLyricsText.trim() || finalLyricsText.trim().length < 10) {
            console.warn('⚠️ Lyrics text too short or empty:', finalLyricsText?.length || 0);
            setWordCloudImage(null);
            setIsGenerating(false);
            return;
          }

          // Check server health first (quick check with timeout)
          console.log('🏥 Checking word cloud server health...');
          try {
            const healthController = new AbortController();
            const healthTimeout = setTimeout(() => healthController.abort(), 2000); // 2 second timeout
            
            await fetch('http://localhost:5001/health', {
              method: 'GET',
              signal: healthController.signal,
            });
            
            clearTimeout(healthTimeout);
            setServerAvailable(true);
            console.log('✅ Word cloud server is healthy');
          } catch (healthError) {
            // Server is not available - keep existing image if we have one
            setServerAvailable(false);
            const errorMsg = healthError instanceof Error ? healthError.message : String(healthError);
            console.error('❌ Word cloud server health check failed:', errorMsg);
            console.warn('⚠️ Word cloud server not available at http://localhost:5001');
            console.warn('💡 Make sure the server is running: npm run wordcloud:server');
            setIsGenerating(false);
            return;
          }

          // Call Python backend API
          const apiController = new AbortController();
          const apiTimeout = setTimeout(() => apiController.abort(), 30000); // 30 second timeout
          
          const requestBody = {
            lyrics: finalLyricsText,
            colors: colorsToUse, // Use provided colors or white for testing
            width: Math.max(window.innerWidth, window.innerHeight) * 1.5, // 1.5x larger to prevent edge visibility
            height: Math.max(window.innerWidth, window.innerHeight) * 1.5,
            max_words: 3000, // Maximum words for tightest possible density
            relative_scaling: 0.01, // Near-zero scaling for absolute tightest packing
          };
          
          console.log('📤 Sending word cloud generation request:', {
            lyricsLength: finalLyricsText.length,
            colorsCount: colorsToUse.length,
            width: requestBody.width,
            height: requestBody.height,
          });
          
          const response = await fetch('http://localhost:5001/api/wordcloud', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: apiController.signal,
          });
          
          clearTimeout(apiTimeout);

          console.log('📥 Received response:', response.status, response.statusText);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Word cloud API error:', errorText);
            throw new Error(`Word cloud generation failed: ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          console.log('📦 Response data:', { success: data.success, hasImage: !!data.image });
          
          if (data.success && data.image) {
            console.log('✅ Word cloud generated successfully');
            console.log('📊 Word cloud image length:', data.image?.length || 0);
            // Server already returns full data URL - persist this!
            setWordCloudImage(data.image);
            console.log('💾 Word cloud image saved and should persist');
          } else {
            console.warn('⚠️ Word cloud generation returned no image:', data);
          }
          } catch (error) {
            // Log all errors for debugging
            console.error('❌ Word cloud generation error:', error);
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
              console.error('❌ Connection failed - Word cloud server not reachable');
              console.error('💡 Make sure the server is running: npm run wordcloud:server');
              console.error('💡 Check if port 5001 is accessible');
              setServerAvailable(false);
              // Don't clear existing image - keep showing what we have
            } else if (error instanceof Error && error.name === 'AbortError') {
              console.error('❌ Request timed out after 30 seconds - keeping existing image');
              setServerAvailable(false);
              // Don't clear existing image - keep showing what we have
            } else {
              console.error('❌ Unexpected error generating word cloud:', error);
              // Only clear image on unexpected errors, not on network/server issues
            }
          } finally {
          setIsGenerating(false);
        }
      };

      generateWordCloud();
    }, 500); // Wait 500ms for lyrics to be stable

    return () => {
      clearTimeout(lyricsTimeoutId);
    };
  }, [lyrics, colors, visible, lyricsHash, lastLyricsHash, wordCloudImage]);

  // Debug: Log when word cloud is ready
  useEffect(() => {
    if (wordCloudImage) {
      console.log('✅ Word cloud image set and ready to display');
      console.log('📊 Word cloud image preview:', wordCloudImage.substring(0, 100) + '...');
      console.log('🎨 Word cloud colors:', colors);
      console.log('👁️ Word cloud opacity:', opacity);
      console.log('👁️ Word cloud visible:', visible);
    } else {
      console.log('⏳ Word cloud image not yet available');
      console.log('🔍 Debug - lyrics:', lyrics ? 'present' : 'missing');
      console.log('🔍 Debug - colors:', colors.length);
      console.log('🔍 Debug - visible:', visible);
    }
  }, [wordCloudImage, colors, opacity, visible, lyrics]);

  if (!visible) {
    console.log('⏸️ Word cloud not visible');
    return null;
  }
  
  if (!wordCloudImage) {
    console.log('⏳ Word cloud image not loaded yet - will generate when lyrics are ready');
    // Don't return null - let the useEffect generate it
    // Return null only if we're not supposed to be visible
    return null;
  }

  return (
    <>
      <div
        className="wordcloud-background"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: '150vw', // Larger to prevent edges from showing
          height: '150vh', // Larger to prevent edges from showing
          zIndex: -1, // Behind masked background (z-index 0) but visible
          pointerEvents: 'none',
          opacity: opacity || 0.8, // Use prop or default to 80% opacity
          backgroundImage: wordCloudImage ? `url(${wordCloudImage})` : 'none',
          backgroundSize: 'cover', // Fill the space
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          overflow: 'hidden', // Hide any edges that might show
        }}
        aria-hidden="true"
      />
    </>
  );
};

