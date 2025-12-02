/**
 * Calculates color saturation (0-1)
 */
function calculateSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const delta = max - min;
  return max === 0 ? 0 : delta / max;
}

/**
 * Extracts the most vivid (saturated) darkest color from an image
 * @param imageUrl - URL of the image to analyze
 * @returns Promise resolving to a hex color string (e.g., "#1A1A1A")
 */
export async function extractDarkestColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve('#121212'); // Fallback to dark default
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        let imageData;
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
          resolve('#121212');
          return;
        }
        const data = imageData.data;
        
        const sampleRate = 10;
        let maxVividness = -1;
        let mostVividR = 0;
        let mostVividG = 0;
        let mostVividB = 0;
        
        // Consider only dark colors (brightness < threshold)
        const darkThreshold = 128; // Consider colors darker than middle gray
        
        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a < 128) continue;
          
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Only consider dark colors
          if (brightness < darkThreshold) {
            const saturation = calculateSaturation(r, g, b);
            // Weight by both darkness and saturation - prefer vivid dark colors
            const vividness = saturation * (1 - brightness / darkThreshold);
            
            if (vividness > maxVividness) {
              maxVividness = vividness;
              mostVividR = r;
              mostVividG = g;
              mostVividB = b;
            }
          }
        }
        
        // If no vivid dark color found, fall back to darkest
        if (maxVividness < 0) {
          let minBrightness = Infinity;
          for (let i = 0; i < data.length; i += 4 * sampleRate) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a < 128) continue;
            
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            
            if (brightness < minBrightness) {
              minBrightness = brightness;
              mostVividR = r;
              mostVividG = g;
              mostVividB = b;
            }
          }
        }
        
        const hex = `#${mostVividR.toString(16).padStart(2, '0')}${mostVividG.toString(16).padStart(2, '0')}${mostVividB.toString(16).padStart(2, '0')}`;
        resolve(hex);
      } catch (error) {
        resolve('#121212');
      }
    };
    
    img.onerror = () => {
      resolve('#121212');
    };
    
    img.src = imageUrl;
  });
}

/**
 * Extracts the most vivid (saturated) brightest color from an image
 * @param imageUrl - URL of the image to analyze
 * @returns Promise resolving to a hex color string (e.g., "#FF5733")
 */
export async function extractBrightestColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create a canvas to analyze the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve('#1DB954'); // Fallback to default
          return;
        }
        
        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        // Get image data - handle CORS errors
        let imageData;
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
          // CORS error - return default color
          resolve('#1DB954');
          return;
        }
        const data = imageData.data;
        
        // Sample pixels (check every Nth pixel for performance)
        const sampleRate = 10;
        let maxVividness = -1;
        let mostVividR = 0;
        let mostVividG = 0;
        let mostVividB = 0;
        
        // Consider only bright colors (brightness > threshold)
        const brightThreshold = 128; // Consider colors brighter than middle gray
        
        // Calculate brightness for each sampled pixel
        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Skip transparent pixels
          if (a < 128) continue;
          
          // Calculate perceived brightness (weighted formula)
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Only consider bright colors
          if (brightness > brightThreshold) {
            const saturation = calculateSaturation(r, g, b);
            // Weight by both brightness and saturation - prefer vivid bright colors
            const vividness = saturation * (brightness / 255);
            
            if (vividness > maxVividness) {
              maxVividness = vividness;
              mostVividR = r;
              mostVividG = g;
              mostVividB = b;
            }
          }
        }
        
        // If no vivid bright color found, fall back to brightest
        if (maxVividness < 0) {
          let maxBrightness = 0;
          for (let i = 0; i < data.length; i += 4 * sampleRate) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a < 128) continue;
            
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            
            if (brightness > maxBrightness) {
              maxBrightness = brightness;
              mostVividR = r;
              mostVividG = g;
              mostVividB = b;
            }
          }
        }
        
        // Convert to hex
        const hex = `#${mostVividR.toString(16).padStart(2, '0')}${mostVividG.toString(16).padStart(2, '0')}${mostVividB.toString(16).padStart(2, '0')}`;
        resolve(hex);
      } catch (error) {
        // On any error, return default color instead of rejecting
        resolve('#1DB954');
      }
    };
    
    img.onerror = () => {
      resolve('#1DB954'); // Fallback to default color on error
    };
    
    img.src = imageUrl;
  });
}

/**
 * Extracts multiple vivid (saturated) light colors from an image
 * @param imageUrl - URL of the image to analyze
 * @param count - Number of colors to extract (default: 3)
 * @returns Promise resolving to an array of hex color strings
 */
export async function extractVividLightColors(imageUrl: string, count: number = 3): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          // Fallback to default colors
          resolve(Array(count).fill('#1DB954'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        let imageData;
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
          resolve(Array(count).fill('#1DB954'));
          return;
        }
        const data = imageData.data;
        
        const sampleRate = 10;
        const brightThreshold = 128; // Consider colors brighter than middle gray
        const colorCandidates: Array<{ r: number; g: number; b: number; vividness: number }> = [];
        
        // Collect all vivid bright colors
        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a < 128) continue;
          
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          if (brightness > brightThreshold) {
            const saturation = calculateSaturation(r, g, b);
            const vividness = saturation * (brightness / 255);
            
            colorCandidates.push({ r, g, b, vividness });
          }
        }
        
        // Sort by vividness and get top colors
        colorCandidates.sort((a, b) => b.vividness - a.vividness);
        
        // Remove similar colors and get distinct ones
        const distinctColors: Array<{ r: number; g: number; b: number }> = [];
        for (const candidate of colorCandidates) {
          if (distinctColors.length >= count) break;
          
          // Check if this color is too similar to existing ones
          const isSimilar = distinctColors.some(existing => {
            const rDiff = Math.abs(existing.r - candidate.r);
            const gDiff = Math.abs(existing.g - candidate.g);
            const bDiff = Math.abs(existing.b - candidate.b);
            return (rDiff + gDiff + bDiff) < 60; // Threshold for similarity
          });
          
          if (!isSimilar) {
            distinctColors.push({ r: candidate.r, g: candidate.g, b: candidate.b });
          }
        }
        
        // Convert to hex strings
        const colors = distinctColors.map(c => 
          `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`
        );
        
        // Fill remaining slots with the last color or default
        while (colors.length < count) {
          colors.push(colors.length > 0 ? colors[colors.length - 1] : '#1DB954');
        }
        
        resolve(colors.slice(0, count));
      } catch (error) {
        resolve(Array(count).fill('#1DB954'));
      }
    };
    
    img.onerror = () => {
      resolve(Array(count).fill('#1DB954'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Extracts the most vivid (saturated) midtone color from an image
 * Midtones are colors with brightness between 85-170 (mid-range)
 * @param imageUrl - URL of the image to analyze
 * @returns Promise resolving to a hex color string
 */
export async function extractVividMidtoneColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve('#B3B3B3'); // Fallback to default midtone gray
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        let imageData;
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
          resolve('#B3B3B3');
          return;
        }
        const data = imageData.data;
        
        const sampleRate = 10;
        const midtoneMin = 85; // Lower bound for midtones
        const midtoneMax = 170; // Upper bound for midtones
        let maxVividness = -1;
        let mostVividR = 0;
        let mostVividG = 0;
        let mostVividB = 0;
        
        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a < 128) continue;
          
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Only consider midtone colors
          if (brightness >= midtoneMin && brightness <= midtoneMax) {
            const saturation = calculateSaturation(r, g, b);
            // Weight by saturation - prefer vivid midtones
            const vividness = saturation;
            
            if (vividness > maxVividness) {
              maxVividness = vividness;
              mostVividR = r;
              mostVividG = g;
              mostVividB = b;
            }
          }
        }
        
        // If no vivid midtone found, fall back to a midtone gray
        if (maxVividness < 0) {
          mostVividR = 179;
          mostVividG = 179;
          mostVividB = 179;
        }
        
        const hex = `#${mostVividR.toString(16).padStart(2, '0')}${mostVividG.toString(16).padStart(2, '0')}${mostVividB.toString(16).padStart(2, '0')}`;
        resolve(hex);
      } catch (error) {
        resolve('#B3B3B3');
      }
    };
    
    img.onerror = () => {
      resolve('#B3B3B3');
    };
    
    img.src = imageUrl;
  });
}
