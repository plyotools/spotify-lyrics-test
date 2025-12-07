import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login screen initially', async ({ page }) => {
    await expect(page.getByText('Spotify Lyrics')).toBeVisible();
    await expect(page.getByRole('button', { name: /connect with spotify/i })).toBeVisible();
  });

  test('should have accessible login button', async ({ page }) => {
    // Use AxeBuilder directly to get results without throwing
    const results = await new AxeBuilder({ page }).analyze();
    
    // Only fail on critical or serious violations (allow moderate/minor)
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    
    expect(criticalViolations).toEqual([]);
  });

  test('should navigate through auth flow', async ({ page }) => {
    // Mock the auth redirect
    await page.route('https://accounts.spotify.com/authorize**', route => {
      route.fulfill({
        status: 200,
        body: 'Mock Spotify Auth Page',
      });
    });

    const loginButton = page.getByRole('button', { name: /connect with spotify/i });
    await loginButton.click();

    // Wait for redirect or mock callback
    await page.waitForTimeout(500);
  });
});

