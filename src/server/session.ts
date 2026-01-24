/**
 * Server-side session management for multi-user support.
 * Tracks the currently active user and persists the selection.
 */

import { getDb } from '../main/db/sqlite.js';
import { getUserById, listUsers, updateUserLastActive } from '../main/db/users.js';
import type { User } from '../shared/types.js';

let currentUserId: string | null = null;

/**
 * Set the current active user.
 * Persists the selection to app_settings and updates last_active_at.
 */
export function setCurrentUser(userId: string): void {
    const user = getUserById(userId);
    if (!user) {
        throw new Error(`User not found: ${userId}`);
    }

    currentUserId = userId;

    // Persist to app_settings
    const db = getDb();
    db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value) VALUES ('last_user_id', ?)
    `).run(userId);

    // Update user's last active timestamp
    updateUserLastActive(userId);
}

/**
 * Get the current active user ID.
 * Returns null if no user is selected.
 */
export function getCurrentUser(): string | null {
    return currentUserId;
}

/**
 * Get the current user or throw an error if none is selected.
 * Use this when a user context is required.
 */
export function requireCurrentUser(): string {
    if (!currentUserId) {
        throw new Error('No user selected. Please select or create a user profile.');
    }
    return currentUserId;
}

/**
 * Get the current user's full profile.
 */
export function getCurrentUserProfile(): User | null {
    if (!currentUserId) return null;
    return getUserById(currentUserId);
}

/**
 * Load the last active user from app_settings on server startup.
 * Returns true if a user was restored, false otherwise.
 */
export function loadLastUser(): boolean {
    const db = getDb();

    // Get the last selected user ID
    const setting = db.prepare(`
        SELECT value FROM app_settings WHERE key = 'last_user_id'
    `).get() as { value: string } | undefined;

    if (setting?.value) {
        // Verify the user still exists
        const user = getUserById(setting.value);
        if (user) {
            currentUserId = setting.value;
            console.log(`[session] Restored last user: ${user.name}`);
            return true;
        } else {
            // Clear invalid user ID
            db.prepare(`DELETE FROM app_settings WHERE key = 'last_user_id'`).run();
        }
    }

    // No valid last user, check if there are any users at all
    const users = listUsers();
    if (users.length === 1) {
        // Single user, auto-select them
        currentUserId = users[0].id;
        db.prepare(`
            INSERT OR REPLACE INTO app_settings (key, value) VALUES ('last_user_id', ?)
        `).run(currentUserId);
        console.log(`[session] Auto-selected single user: ${users[0].name}`);
        return true;
    }

    console.log('[session] No user selected');
    return false;
}

/**
 * Clear the current user session.
 * Called when the last user is deleted.
 */
export function clearCurrentUser(): void {
    currentUserId = null;
    const db = getDb();
    db.prepare(`DELETE FROM app_settings WHERE key = 'last_user_id'`).run();
}

/**
 * Check if any users exist in the system.
 */
export function hasUsers(): boolean {
    const users = listUsers();
    return users.length > 0;
}
