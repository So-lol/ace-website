import { test, expect } from '@playwright/test';

test('apply route requires authentication and preserves the return path', async ({ page }) => {
    console.log('Navigating to /apply while signed out...');
    await page.goto('/apply');

    console.log('Verifying auth gate...');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fapply|\/login\?redirect=\/apply/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('button', { name: 'Sign In' })).toBeVisible();
});
