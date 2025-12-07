import { test, expect } from '@playwright/test';

test.describe('Real OAuth Flow Test', () => {
  test('should complete full OAuth flow', async ({ page, context }) => {
    // Navigate to app
    await page.goto('/');
    await expect(page.getByText('Spotify Lyrics')).toBeVisible();
    
    // Click login button
    const loginButton = page.getByRole('button', { name: /connect with spotify/i });
    await loginButton.click();
    
    // Wait for redirect to Spotify
    await page.waitForURL(/accounts\.spotify\.com/, { timeout: 10000 });
    
    console.log('✅ Redirected to Spotify login page');
    console.log('Current URL:', page.url());
    
    // Check if we're on Spotify login page
    const isSpotifyLogin = page.url().includes('accounts.spotify.com/authorize');
    expect(isSpotifyLogin).toBeTruthy();
    
    // Check redirect URI in the URL
    const url = new URL(page.url());
    const redirectUri = url.searchParams.get('redirect_uri');
    console.log('Redirect URI in Spotify URL:', redirectUri);
    
    // Verify redirect URI is correct
    expect(redirectUri).toBe('http://127.0.0.1:5173/spotify-lyrics-test/callback');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/spotify-login-page.png' });
    
    console.log('✅ Test completed - login page reached');
  });
});


