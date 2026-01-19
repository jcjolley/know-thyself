import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('US-005: Claude API Integration', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('chat input field exists', async () => {
        const page = getPage();
        const input = await page.locator('input[type="text"], textarea');
        await expect(input.first()).toBeVisible();
    });

    test('send button exists and is clickable', async () => {
        const page = getPage();
        const button = await page.locator('button:has-text("Send")');
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();
    });

    test('typing message and sending shows response', async () => {
        const page = getPage();

        // Type a message
        const input = await page.locator('input[type="text"], textarea').first();
        await input.fill('Hello, this is a test');

        // Click send
        const button = await page.locator('button:has-text("Send")');
        await button.click();

        // Wait for response (gray box appears)
        const response = await page.locator('[style*="background"]').last();
        await expect(response).toBeVisible({ timeout: 30000 });
    });

    test('API status shows ready when key is configured', async () => {
        const page = getPage();
        const status = await page.evaluate(async () => {
            const appStatus = await (window as any).api.app.getStatus();
            return appStatus.claudeReady;
        });
        // If ANTHROPIC_API_KEY is set, should be ready
        if (process.env.ANTHROPIC_API_KEY) {
            expect(status).toBe(true);
        }
    });
});
