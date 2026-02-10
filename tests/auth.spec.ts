import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('Signup page renders and validates inputs', async ({ page }) => {
        await page.goto('/signup');

        // Verify title
        await expect(page).toHaveTitle(/Sign Up/);

        // Verify form elements
        await expect(page.locator('input[name="name"]')).toBeVisible();
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();

        // Test password mismatch
        await page.locator('input[name="name"]').fill('Test User');
        await page.locator('input[name="email"]').fill('test@example.com');
        await page.locator('input[name="password"]').fill('Password123!');
        await page.locator('input[name="confirmPassword"]').fill('WrongPassword');

        await page.getByRole('button', { name: 'Create Account' }).click();

        // We expect a toast error (sonner). sonner uses [data-sonner-toast]
        await expect(page.locator('[data-sonner-toast]')).toContainText('Passwords do not match');
    });

    test('Login page renders and links to forgot password', async ({ page }) => {
        await page.goto('/login');

        await expect(page).toHaveTitle(/Sign In/);
        await expect(page.getByText('Forgot Password?')).toBeVisible();

        await page.getByText('Forgot Password?').click();
        await expect(page).toHaveURL(/\/forgot-password/);
        await expect(page.getByText('Reset Password')).toBeVisible();
    });

    test('Forgot Password page handles invalid codes gracefully', async ({ page }) => {
        // Navigating with a fake oobCode to trigger the error logic
        await page.goto('/forgot-password?oobCode=fake-code');

        await expect(page.locator('[data-sonner-toast]')).toContainText('This password reset link is invalid or has expired.');
    });
});
