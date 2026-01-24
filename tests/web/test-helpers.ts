/**
 * Test helpers for web E2E tests.
 * Provides utilities for common test setup operations.
 */

import type { Page, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * Ensures a test user exists and is selected.
 * Creates a user via API if none exist.
 * This is needed because the multi-user update shows CreateUserModal on fresh install.
 */
export async function ensureTestUser(request: APIRequestContext): Promise<void> {
    try {
        // Check if users exist
        const usersResponse = await request.get(`${BASE_URL}/api/users`);
        if (!usersResponse.ok()) {
            console.log('[test-helpers] API not responding, skipping user setup');
            return;
        }

        const users = await usersResponse.json();

        if (Array.isArray(users) && users.length === 0) {
            // Create a test user
            console.log('[test-helpers] Creating test user...');
            const createResponse = await request.post(`${BASE_URL}/api/users`, {
                data: {
                    name: 'Test User',
                    avatarColor: '#8b6f5c',
                },
            });

            if (createResponse.ok()) {
                const newUser = await createResponse.json();
                console.log(`[test-helpers] Created test user: ${newUser.id}`);

                // Select the new user
                await request.post(`${BASE_URL}/api/users/${newUser.id}/select`);
                console.log('[test-helpers] Test user selected');
            }
        } else if (Array.isArray(users) && users.length > 0) {
            // Ensure a user is selected
            const currentResponse = await request.get(`${BASE_URL}/api/users/current`);
            if (!currentResponse.ok()) {
                // Select the first user
                await request.post(`${BASE_URL}/api/users/${users[0].id}/select`);
                console.log('[test-helpers] Selected existing user');
            }
        }
    } catch (err) {
        console.log('[test-helpers] Error ensuring test user:', err);
    }
}

/**
 * Helper to navigate to the app and wait for it to load.
 * Handles both the main app view and the create user screen.
 */
export async function navigateToApp(page: Page): Promise<void> {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
}

/**
 * Helper to create a user via the UI if on the CreateUserModal screen.
 */
export async function createUserViaUI(page: Page, name: string = 'Test User'): Promise<void> {
    // Check if we're on the create user screen
    const nameInput = page.locator('input[placeholder*="name" i]');
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill(name);

        // Click a color swatch if visible
        const colorSwatch = page.locator('[style*="border-radius: 50%"][style*="background"]').first();
        if (await colorSwatch.isVisible()) {
            await colorSwatch.click();
        }

        // Submit the form
        const submitButton = page.locator('button:has-text("Begin"), button:has-text("Create"), button[type="submit"]').first();
        if (await submitButton.isVisible()) {
            await submitButton.click();
            // Wait for navigation to complete
            await page.waitForLoadState('networkidle');
        }
    }
}

/**
 * Wait for the chat interface to be ready (The Mirror heading visible).
 */
export async function waitForChatReady(page: Page): Promise<void> {
    await page.waitForSelector('h1:has-text("The Mirror")', { timeout: 10000 });
}
