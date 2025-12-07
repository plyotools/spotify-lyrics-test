import { test, expect } from '@playwright/test';

test.describe('Complete Callback Flow Test', () => {
  test('should handle Spotify callback redirect correctly', async ({ page }) => {
    // Step 1: Navigate to app
    await page.goto('/');
    await expect(page.getByText('Spotify Lyrics')).toBeVisible();
    
    // Step 2: Simulate what happens when Spotify redirects back
    // This is the actual URL Spotify will redirect to after login
    const callbackUrl = 'http://127.0.0.1:5173/spotify-lyrics-test/callback?code=AQDCff1a61rx0hczP_9c9jC2LRNcKpD3kkv8GRMBW8e08qSG1Z1UH2xoJvpDAkh8Z-yGXIlWjKlSC5okLBSCzjQ_7ZqTxxnovbuzJYPvM7LVx-fHtFfBaM1EtLfWutOQMt5p_zADovne9jklT8d61O5YqkfteCh4oZ6lBxXRBpYBBV7qECLW_mHu_9M6wKBfP_R9xxUYkSO5onlX_VYu9HFZjjSCy6UvJlkAyRtxpekvfBK2ClQH9TOyXKrV-loM8yQvGLHwZ1uWZIxNS5QjDzYwtlMCmNOs58Pj9VdW2lX7ekHP_4PSwA4vHwrdC-xMGqS4Ga4BYexwuTRbVmmpXT2vrBDlSefUrqSR4LpVd_k8s_d9nCapEbM4gNpYk0N-WkjVDw1TySzSI3Zc8MBPhk2I2mLZqfjA_KiUf92ZgXZ20gOkWS4b98Jn5GVIrniBdgvT3denEqbunQ&state=eyJ2ZXJpZmllciI6IlFBYmduaGI1UXhtSUtWWmhNYUREclZTSkIwSUpEU1kyall3UEliQXljQjIzaG1ldEhxWkpiY0NDM2ttSWtBazZ4dkgyUmJlR2dIUUF0TXdGM25ZTU8wcTlVZXREa0ZDZVBrS0RpZHhtNDJJcjVMODVNcUZzVHN2bXZuQ1FNYllFIiwidGltZXN0YW1wIjoxNzY1MTIyMTEwMDI5fQ%3D%3D';
    
    console.log('Navigating to callback URL:', callbackUrl);
    
    // Step 3: Navigate to callback URL (as Spotify would)
    await page.goto(callbackUrl);
    
    // Step 4: Wait for redirect to hash route
    await page.waitForTimeout(2000);
    
    // Step 5: Wait for page to load and check final URL
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log('Final URL after redirect:', finalUrl);
    
    // Should be redirected to hash route
    expect(finalUrl).toContain('/spotify-lyrics-test');
    expect(finalUrl).toContain('#/callback');
    expect(finalUrl).toContain('code=');
    
    // Step 6: Check console logs
    const allLogs: string[] = [];
    page.on('console', msg => {
      allLogs.push(msg.text());
    });
    
    // Reload to capture initial logs
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('All console logs:', allLogs);
    
    // Check if we have any relevant logs
    const hasMainLog = allLogs.some(log => log.includes('[MAIN]'));
    const hasCallbackLog = allLogs.some(log => log.includes('[CALLBACK]'));
    
    console.log('Has MAIN log:', hasMainLog);
    console.log('Has CALLBACK log:', hasCallbackLog);
    
    // At minimum, URL should be correct
    expect(finalUrl).toMatch(/spotify-lyrics-test.*#\/callback.*code=/);
  });
});

