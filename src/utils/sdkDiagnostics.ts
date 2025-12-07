import { AuthService } from '../services/auth';
import { SpotifyService } from '../services/spotify';

export interface SDKDiagnostics {
  isSDKAvailable: boolean;
  hasValidToken: boolean;
  tokenHasStreamingScope: boolean | null; // null if we can't determine
  sdkInitializationError: string | null;
  recommendations: string[];
}

/**
 * Diagnose why SDK is not being used
 */
export async function diagnoseSDK(): Promise<SDKDiagnostics> {
  const diagnostics: SDKDiagnostics = {
    isSDKAvailable: SpotifyService.isSDKAvailable(),
    hasValidToken: false,
    tokenHasStreamingScope: null,
    sdkInitializationError: null,
    recommendations: [],
  };

  // Check if we have a valid token
  try {
    const token = await AuthService.getValidToken();
    diagnostics.hasValidToken = !!token;
    
    if (!token) {
      diagnostics.recommendations.push('No valid access token. Please log in again.');
      return diagnostics;
    }

    // Try to check if token has streaming scope by attempting SDK initialization
    // We can't directly check scopes, but we can see if SDK initialization fails
    if (!diagnostics.isSDKAvailable) {
      try {
        // Check if SDK can be initialized (this will fail if no streaming scope)
        await SpotifyService.initializePlayer();
        diagnostics.isSDKAvailable = SpotifyService.isSDKAvailable();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        diagnostics.sdkInitializationError = errorMessage;
        
        if (errorMessage.includes('Invalid token scopes') || errorMessage.includes('scope')) {
          diagnostics.tokenHasStreamingScope = false;
          diagnostics.recommendations.push(
            '❌ Token missing "streaming" scope required for Web Playback SDK'
          );
          diagnostics.recommendations.push(
            '📋 Steps to fix:'
          );
          diagnostics.recommendations.push(
            '1. Go to https://www.spotify.com/account/apps/'
          );
          diagnostics.recommendations.push(
            '2. Find "Spotify Lyrics" and click "Remove access"'
          );
          diagnostics.recommendations.push(
            '3. Come back here and click "Re-authenticate"'
          );
          diagnostics.recommendations.push(
            '4. Approve ALL permissions including "streaming"'
          );
        } else if (errorMessage.includes('timeout')) {
          diagnostics.recommendations.push('SDK initialization timed out. Check your network connection.');
        } else {
          diagnostics.recommendations.push(`SDK initialization failed: ${errorMessage}`);
        }
      }
    }

    // If SDK is available, we're good
    if (diagnostics.isSDKAvailable) {
      diagnostics.tokenHasStreamingScope = true;
      diagnostics.recommendations.push('✅ SDK is working correctly!');
    }

  } catch (error) {
    diagnostics.hasValidToken = false;
    diagnostics.recommendations.push('Failed to get access token. Please log in again.');
  }

  return diagnostics;
}

/**
 * Log detailed SDK diagnostics to console
 */
/**
 * Log detailed SDK diagnostics to console
 */
export async function logSDKDiagnostics(): Promise<SDKDiagnostics> {
  console.group('🔍 SDK Diagnostics');
  const diagnostics = await diagnoseSDK();
  
  console.log('SDK Available:', diagnostics.isSDKAvailable);
  console.log('Has Valid Token:', diagnostics.hasValidToken);
  console.log('Token Has Streaming Scope:', diagnostics.tokenHasStreamingScope);
  
  if (diagnostics.sdkInitializationError) {
    console.error('SDK Initialization Error:', diagnostics.sdkInitializationError);
  }
  
  if (diagnostics.recommendations.length > 0) {
    console.log('Recommendations:');
    diagnostics.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
  
  console.groupEnd();
  return diagnostics;
}

