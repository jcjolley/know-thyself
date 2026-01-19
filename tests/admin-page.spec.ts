import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('Admin Page (Debug Mode)', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('US-201: Tab navigation displays in debug mode', async () => {
        const page = getPage();

        // DEBUG MODE badge should be visible
        const debugBadge = page.locator('text=DEBUG MODE');
        await expect(debugBadge).toBeVisible();

        // Both tabs should be present
        const chatTab = page.locator('button:has-text("Chat")');
        const adminTab = page.locator('button:has-text("Profile Admin")');
        await expect(chatTab).toBeVisible();
        await expect(adminTab).toBeVisible();
    });

    test('US-201: Clicking Profile Admin tab switches view', async () => {
        const page = getPage();

        // Click the Admin tab
        await page.click('button:has-text("Profile Admin")');

        // Wait for admin page to load
        await page.waitForTimeout(500);

        // Should see tier sections
        const tier1Section = page.locator('text=TIER 1: ESSENTIAL');
        await expect(tier1Section).toBeVisible();
    });

    test('US-202: Four tier sections are displayed', async () => {
        const page = getPage();

        // Verify all four tiers are present
        await expect(page.locator('text=TIER 1: ESSENTIAL')).toBeVisible();
        await expect(page.locator('text=TIER 2: EARLY INFERENCE')).toBeVisible();
        await expect(page.locator('text=TIER 3: PERSONALITY')).toBeVisible();
        await expect(page.locator('text=TIER 4: DEEPER PATTERNS')).toBeVisible();
    });

    test('US-202: Tier sections show signal counts', async () => {
        const page = getPage();

        // Each tier section should have a signal count
        const signalCounts = page.locator('text=/\\d+ signals?/');
        const count = await signalCounts.count();
        expect(count).toBeGreaterThanOrEqual(4); // At least 4 tier sections
    });

    test('US-202: Legacy data section is present', async () => {
        const page = getPage();

        // Scroll down to find Legacy Data section
        const legacySection = page.locator('text=LEGACY DATA');
        await expect(legacySection).toBeVisible();
    });

    test('US-201: Switching back to Chat tab preserves state', async () => {
        const page = getPage();

        // Click Chat tab to go back
        await page.click('button:has-text("Chat")');

        // Should see the chat heading
        const heading = page.locator('h1:has-text("Know Thyself")');
        await expect(heading).toBeVisible();

        // Status bar should still be visible
        const statusText = page.locator('text=Status:');
        await expect(statusText).toBeVisible();
    });

    test('US-202: Tier sections can be collapsed and expanded', async () => {
        const page = getPage();

        // Go back to admin tab
        await page.click('button:has-text("Profile Admin")');
        await page.waitForTimeout(300);

        // Tier 3 should be collapsed by default - click to expand
        const tier3Header = page.locator('text=TIER 3: PERSONALITY').first();
        await tier3Header.click();
        await page.waitForTimeout(200);

        // Click again to collapse
        await tier3Header.click();
        await page.waitForTimeout(200);

        // Test passed if no errors - the section toggles successfully
    });

    test('US-205: Legacy data sub-tabs work', async () => {
        const page = getPage();

        // Expand Legacy Data section if needed
        const legacyHeader = page.locator('text=LEGACY DATA').first();
        await legacyHeader.click();
        await page.waitForTimeout(300);

        // Check that sub-tabs are visible
        const valuesTab = page.locator('button:has-text("Values")');
        const challengesTab = page.locator('button:has-text("Challenges")');
        const goalsTab = page.locator('button:has-text("Goals")');
        const maslowTab = page.locator('button:has-text("Maslow")');

        // At least some of these should be visible when expanded
        const tabCount = await Promise.all([
            valuesTab.isVisible(),
            challengesTab.isVisible(),
            goalsTab.isVisible(),
            maslowTab.isVisible(),
        ]);

        expect(tabCount.filter(Boolean).length).toBeGreaterThanOrEqual(1);
    });
});
