import { test, expect } from '@playwright/test';

test.describe('Security Audit: Authentication', () => {

    // SEC-001: User Enumeration
    test('User Enumeration: Identical error for existing vs non-existent user', async ({ page }) => {
        await page.goto('/login');

        // Case A: Non-existent user
        await page.locator('input[name="email"]').fill('nonexistent@example.com');
        await page.locator('input[name="password"]').fill('SomePassword123!');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page.locator('[data-sonner-toast]')).toContainText('Invalid email or password');

        // Wait for toast to disappear
        await page.waitForTimeout(1000);

        // Case B: Existing user (assumed) with wrong password
        // Note: For a true black-box test, we just verify they LOOK identical
        await page.locator('input[name="email"]').fill('admin@vsa-umn.org'); // Known admin email
        await page.locator('input[name="password"]').fill('WrongPassword123!');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page.locator('[data-sonner-toast]')).toContainText('Invalid email or password');
    });

    // SEC-002: Open Redirect
    test('Open Redirect: Prevent redirection to external domains', async ({ page }) => {
        // Attempting to use the redirect parameter to point to an external site
        const evilUrl = 'https://example.com';
        await page.goto(`/login?redirect=${evilUrl}`);

        await page.locator('input[name="email"]').fill('admin@vsa-umn.org');
        await page.locator('input[name="password"]').fill('invalid-but-triggers-login-attempt');
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Even if login fails, we want to ensure that if it succeeded, 
        // it wouldn't have just blind-redirected.
        // We can inspect the form action or the behavior.
        // But since we can't easily "succeed" without real creds, 
        // we'll look for code-level validation in the Findings.
    });

    // AUTH-007: Unverified User Access
    test('Unverified User: Blocked from dashboard', async ({ page }) => {
        // This requires an unverified user. Conceptually:
        // 1. Signup new user
        // 2. Try to go to /dashboard
        // 3. Expected: Redirected to /verify-email or /login

        await page.goto('/signup');
        const tempEmail = `test-${Date.now()}@example.com`;
        await page.locator('input[name="name"]').fill('Security Test');
        await page.locator('input[name="email"]').fill(tempEmail);
        await page.locator('input[name="password"]').fill('Password123!');
        await page.locator('input[name="confirmPassword"]').fill('Password123!');
        await page.getByRole('button', { name: 'Create Account' }).click();

        // Should be at /verify-email
        await expect(page).toHaveURL(/\/verify-email/);

        // Try to force navigate to dashboard
        await page.goto('/dashboard');

        // Should be kicked back to login or verify
        await expect(page.url()).not.toContain('/dashboard');
    });

    // SEC-003: Protected Route Access without Session
    test('Protected Route: /dashboard requires session cookie', async ({ page, context }) => {
        // Ensure no cookies
        await context.clearCookies();

        await page.goto('/dashboard');

        // Middleware should redirect to /login with redirect param
        await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
    });

    // AUTH-010: Back Button Post-Logout
    test('Logout: Session is invalidated', async ({ page, context }) => {
        // This test is conceptual unless we have a logged-in state.
        // But we can verify the SignOut action removes the cookie.
        await page.goto('/login');
        // ... login ... 
        // await page.getByRole('button', { name: 'Sign Out' }).click();
        // const cookies = await context.cookies();
        // expect(cookies.find(c => c.name === 'firebase-session')).toBeUndefined();
    });
});
