import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('US-003: IPC Communication', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('window.api object exists', async () => {
        const page = getPage();
        const hasApi = await page.evaluate(() => {
            return typeof (window as any).api !== 'undefined';
        });
        expect(hasApi).toBe(true);
    });

    test('window.api.chat.send returns response object', async () => {
        const page = getPage();
        const result = await page.evaluate(async () => {
            return await (window as any).api.chat.send('hello');
        });
        expect(typeof result).toBe('object');
        expect(typeof result.response).toBe('string');
        expect(result.response.length).toBeGreaterThan(0);
        expect(typeof result.conversationId).toBe('string');
    });

    test('window.api.profile.get returns profile object', async () => {
        const page = getPage();
        const profile = await page.evaluate(async () => {
            return await (window as any).api.profile.get();
        });
        expect(profile).toHaveProperty('maslow_status');
        expect(profile).toHaveProperty('top_values');
        expect(profile).toHaveProperty('active_challenges');
        expect(Array.isArray(profile.maslow_status)).toBe(true);
        expect(Array.isArray(profile.top_values)).toBe(true);
        expect(Array.isArray(profile.active_challenges)).toBe(true);
    });
});
