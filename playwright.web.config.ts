/**
 * Playwright config for web-based E2E tests.
 * These tests run against the web server (not Electron).
 *
 * Usage:
 *   1. Start the server with test data: DATA_DIR=./test-data npm start
 *   2. Run tests: npx playwright test --config=playwright.web.config.ts
 *
 * Or use START_SERVER=1 to auto-start the server:
 *   START_SERVER=1 npx playwright test --config=playwright.web.config.ts
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Use a separate data directory for tests to avoid polluting personal data
const TEST_DATA_DIR = path.resolve('./test-data');

export default defineConfig({
    testDir: './tests/web',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    outputDir: 'test-results/web',
    reporter: [
        ['html', { outputFolder: 'test-results/web-html' }],
        ['json', { outputFile: 'test-results/web-results.json' }],
    ],
    use: {
        baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Global setup to clean test data before tests
    globalSetup: './tests/web/global-setup.ts',
    // Optionally start the web server before tests with test data directory
    webServer: process.env.START_SERVER ? {
        command: `DATA_DIR=${TEST_DATA_DIR} MOCK_CLAUDE=true npm start`,
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
        env: {
            DATA_DIR: TEST_DATA_DIR,
            MOCK_CLAUDE: 'true',  // Use mock LLM responses for fast, reliable tests
        },
    } : undefined,
});
