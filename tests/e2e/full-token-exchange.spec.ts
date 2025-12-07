import { test, expect } from '@playwright/test';

test.describe('Full Token Exchange Test', () => {
  test('should complete token exchange after callback', async ({ page }) => {
    // Mock token exchange endpoint
    let tokenExchangeCalled = false;
    await page.route('https://accounts.spotify.com/api/token', route => {
      tokenExchangeCalled = true;
      const requestBody = route.request().postData();
      console.log('Token exchange request body:', requestBody);
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test_access_token_123',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'test_refresh_token_456',
          scope: 'user-read-currently-playing user-read-playback-state user-modify-playback-state streaming'
        })
      });
    });
    
    // Set up code verifier in storage (as login would)
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('spotify_code_verifier', 'test_code_verifier_123456789012345678901234567890123456789012345678901234567890');
    });
    
    // Navigate to callback URL (as Spotify would redirect)
    const testCode = 'test_auth_code_from_spotify';
    const testState = btoa(JSON.stringify({ 
      verifier: 'test_code_verifier_123456789012345678901234567890123456789012345678901234567890',
      timestamp: Date.now()
    }));
    
    await page.goto(`/spotify-lyrics-test/callback?code=${testCode}&state=${testState}`);
    
    // Wait for redirect to hash route
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log('URL after redirect:', url);
    
    // Should be on hash route
    expect(url).toContain('#/callback');
    expect(url).toContain('code=');
    
    // Capture console logs
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('CALLBACK') || text.includes('code') || text.includes('token')) {
        console.log('Relevant log:', text);
      }
    });
    
    // Wait for callback processing
    await page.waitForTimeout(5000);
    
    // Check if Callback component is rendered
    const callbackRendered = await page.evaluate(() => {
      // Check if "Authenticating..." text is visible (from Callback component)
      return document.body.textContent?.includes('Authenticating') || false;
    });
    
    console.log('Callback component rendered:', callbackRendered);
    console.log('All logs:', logs.filter(l => l.includes('CALLBACK') || l.includes('code')));
    
    // Check if token exchange was called
    if (!tokenExchangeCalled) {
      console.log('Token exchange not called. Checking why...');
      const pageInfo = await page.evaluate(() => {
        return {
          hash: window.location.hash,
          pathname: window.location.pathname,
          search: window.location.search,
          href: window.location.href,
          bodyText: document.body.textContent?.substring(0, 200)
        };
      });
      console.log('Page info:', pageInfo);
    }
    
    // For now, just verify redirect worked
    expect(url).toContain('#/callback');
    expect(url).toContain('code=');
    
    // Check if token was stored
    const token = await page.evaluate(() => {
      return localStorage.getItem('spotify_token');
    });
    
    console.log('Token stored:', !!token);
    
    // Token should be stored
    expect(token).toBeTruthy();
  });
});

