import { test, expect } from '@playwright/test';

test('Form Persistence', async ({ page }) => {
    test.slow();

    // 1. Sign Up
    console.log('Navigating to /signup...');
    await page.goto('/signup');

    const timestamp = Date.now();
    const testEmail = `test.persist.${timestamp}@example.com`;
    const testPassword = 'Password123!';
    const testName = 'Persistence Test User';

    console.log(`Signing up with ${testEmail}...`);
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    await page.click('button[type="submit"]');

    // Wait for redirect to verify-email or dashboard, or at least for the URL to change
    // This confirms auth state is likely established
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 });
    console.log('Signup complete. Current URL:', page.url());

    // Allow time for AuthContext to sync session cookie (onIdTokenChanged -> server action)
    // This is critical because navigation to protected route /apply requires the cookie
    await page.waitForTimeout(5000);

    // 2. Navigate to /apply
    console.log('Navigating to /apply...');
    await page.goto('/apply');
    console.log('Navigated. Current URL:', page.url());


    // Wait for the form to be interactive
    await expect(page.locator('h1')).toContainText(/A.C.E. Application/, { timeout: 10000 });

    const formName = 'Persistence Test User';
    const formPronouns = 'they/them';

    console.log('Filling form fields...');
    // Use locators based on the IDs we saw in the file read
    await page.locator('#name').fill(formName);
    await page.locator('#pronouns').fill(formPronouns);
    await page.locator('#email').fill(testEmail);

    // Verify values are set
    await expect(page.locator('#name')).toHaveValue(formName);

    console.log('Reloading page...');
    await page.reload();

    // Verify values persist after reload
    console.log('Verifying persistence...');
    // We need to wait for the form to rehydrate from localStorage
    await expect(page.locator('#name')).toHaveValue(formName, { timeout: 10000 });
    await expect(page.locator('#pronouns')).toHaveValue(formPronouns);
    await expect(page.locator('#email')).toHaveValue(testEmail);

    console.log('SUCCESS: Form data persisted after reload');
});
