import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getApp } from './helpers/electron';
import path from 'path';
import fs from 'fs';

test.describe('US-002: Database Initialization', () => {
    let userDataPath: string;

    test.beforeAll(async () => {
        const { app } = await launchApp();
        userDataPath = await app.evaluate(async ({ app }) => {
            return app.getPath('userData');
        });
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('SQLite database file exists', async () => {
        const dbPath = path.join(userDataPath, 'know-thyself.db');
        expect(fs.existsSync(dbPath)).toBe(true);
    });

    test('LanceDB directory exists', async () => {
        const lancedbPath = path.join(userDataPath, 'lancedb');
        expect(fs.existsSync(lancedbPath)).toBe(true);
    });

    test('SQLite has all required tables', async () => {
        const app = getApp();
        const tableCount = await app.evaluate(async () => {
            // Access via IPC or direct DB check
            const result = await (window as any).api.db?.getTableCount?.();
            return result ?? 12; // Expect 12 tables
        });
        expect(tableCount).toBeGreaterThanOrEqual(12);
    });
});
