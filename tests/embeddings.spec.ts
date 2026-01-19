import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';
import { waitForEmbeddings } from './helpers/db-utils';

test.describe('US-004: Embedding Generation', () => {
    test.beforeAll(async () => {
        await launchApp();
        // Wait for embeddings model to load
        const page = getPage();
        await waitForEmbeddings(page, 60000);
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('embeddings.embed returns 2048-dimension vector', async () => {
        const page = getPage();
        const vector = await page.evaluate(async () => {
            return await (window as any).api.embeddings.embed('test message');
        });
        expect(Array.isArray(vector)).toBe(true);
        // voyage-4-nano outputs 2048 dimensions
        expect(vector.length).toBe(2048);
        expect(typeof vector[0]).toBe('number');
    });

    test('embeddings.embed throws on empty string', async () => {
        const page = getPage();
        const error = await page.evaluate(async () => {
            try {
                await (window as any).api.embeddings.embed('');
                return null;
            } catch (e: any) {
                return e.message;
            }
        });
        expect(error).toContain('Cannot embed empty text');
    });

    test('embeddings.isReady returns true after load', async () => {
        const page = getPage();
        const isReady = await page.evaluate(async () => {
            return await (window as any).api.embeddings.isReady();
        });
        expect(isReady).toBe(true);
    });
});
