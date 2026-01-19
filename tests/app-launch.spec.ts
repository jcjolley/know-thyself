import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('US-001: Application Launch', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('window displays with "Know Thyself" heading', async () => {
        const page = getPage();
        const heading = await page.locator('h1');
        await expect(heading).toHaveText('Know Thyself');
    });

    test('React UI renders successfully', async () => {
        const page = getPage();
        const root = await page.locator('#root');
        await expect(root).toBeVisible();
    });

    test('window has expected title', async () => {
        const page = getPage();
        const title = await page.title();
        expect(title).toBe('Know Thyself');
    });
});
