import { test, expect } from '@playwright/test';

test('ACE Application Form Flow', async ({ page }) => {
    test.slow();
    console.log('Navigating to /apply...');
    await page.goto('/apply');

    console.log('Verifying title...');
    await expect(page).toHaveTitle(/VSAM ACE/, { timeout: 10000 });

    page.on('console', msg => console.log(`BROWSER LOC: ${msg.text()}`));

    console.log('Filling Step 1...');
    try {
        await page.locator('#name').waitFor({ state: 'visible', timeout: 5000 });
        await page.locator('#name').fill('Playwright Test User');
        console.log('Filled Name');

        await page.locator('#pronouns').fill('they/them');
        console.log('Filled Pronouns');

        await page.locator('#email').fill('test@example.com');
        console.log('Filled Email');

        await page.locator('#phone').fill('555-0123');
        console.log('Filled Phone');

        await page.locator('#instagram').fill('@playwright_test');
        console.log('Filled Instagram');
    } catch (e) {
        console.log('ERROR during form fill');
        console.log('Page Title:', await page.title());
        const bodyText = await page.locator('body').innerText();
        console.log('Body Text Preview:', bodyText.slice(0, 500));
        await page.screenshot({ path: 'failure.png' });
        throw e;
    }

    console.log('Submitting Step 1...');
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await nextButton.click();

    console.log('Verifying Step 2...');
    await expect(page.getByText('Step 2 of 6')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Academic Questions')).toBeVisible();

    console.log('SUCCESS: Navigated to Step 2');
});
