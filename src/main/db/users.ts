import { v4 as uuidv4 } from 'uuid';
import { getDb } from './sqlite.js';
import type { User, MigrationStatus } from '../../shared/types.js';

// Avatar color palette - bookshelf-inspired colors
export const AVATAR_COLORS = [
    '#8b6f5c',  // Worn leather
    '#6b7c6f',  // Sage green
    '#9a7b6a',  // Terra cotta
    '#5d6d7e',  // Slate blue
    '#8e7a5e',  // Parchment gold
    '#7a6b6b',  // Dusty rose
    '#5e7d7b',  // Teal patina
    '#7c6a54',  // Walnut
];

/**
 * List all user profiles.
 */
export function listUsers(): User[] {
    const db = getDb();
    return db.prepare(`
        SELECT id, name, avatar_color, created_at, last_active_at
        FROM users
        ORDER BY last_active_at DESC
    `).all() as User[];
}

/**
 * Get a user by ID.
 */
export function getUserById(id: string): User | null {
    const db = getDb();
    const user = db.prepare(`
        SELECT id, name, avatar_color, created_at, last_active_at
        FROM users
        WHERE id = ?
    `).get(id) as User | undefined;
    return user || null;
}

/**
 * Create a new user profile.
 */
export function createUser(name: string, avatarColor?: string): User {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Use provided color or pick one based on existing user count
    const existingCount = (db.prepare(`SELECT COUNT(*) as count FROM users`).get() as { count: number }).count;
    const color = avatarColor || AVATAR_COLORS[existingCount % AVATAR_COLORS.length];

    db.prepare(`
        INSERT INTO users (id, name, avatar_color, created_at, last_active_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(id, name, color, now, now);

    return {
        id,
        name,
        avatar_color: color,
        created_at: now,
        last_active_at: now,
    };
}

/**
 * Update a user's last active timestamp.
 */
export function updateUserLastActive(id: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
        UPDATE users SET last_active_at = ? WHERE id = ?
    `).run(now, id);
}

/**
 * Delete a user and all their data.
 * This includes conversations, profile data, and embeddings.
 * Returns true if user was deleted, false if user didn't exist.
 */
export function deleteUser(id: string): { success: boolean; error?: string } {
    const db = getDb();

    // Check if user exists
    const user = getUserById(id);
    if (!user) {
        return { success: false, error: 'User not found' };
    }

    // Collect message IDs for LanceDB cleanup (will be done async by caller)
    const messageIds = db.prepare(`
        SELECT m.id FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = ?
    `).all(id) as { id: string }[];

    // Delete all user data in a transaction
    db.transaction(() => {
        // Delete evidence linked to messages in user's conversations
        db.prepare(`
            DELETE FROM evidence
            WHERE message_id IN (
                SELECT m.id FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE c.user_id = ?
            )
        `).run(id);

        // Delete extractions linked to messages
        db.prepare(`
            DELETE FROM extractions
            WHERE message_id IN (
                SELECT m.id FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE c.user_id = ?
            )
        `).run(id);

        // Delete conversation summaries
        db.prepare(`
            DELETE FROM conversation_summaries
            WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)
        `).run(id);

        // Delete messages
        db.prepare(`
            DELETE FROM messages
            WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)
        `).run(id);

        // Delete conversations
        db.prepare(`DELETE FROM conversations WHERE user_id = ?`).run(id);

        // Delete profile data
        db.prepare(`DELETE FROM user_values WHERE user_id = ?`).run(id);
        db.prepare(`DELETE FROM challenges WHERE user_id = ?`).run(id);
        db.prepare(`DELETE FROM goals WHERE user_id = ?`).run(id);
        db.prepare(`DELETE FROM activities WHERE user_id = ?`).run(id);
        db.prepare(`DELETE FROM maslow_signals WHERE user_id = ?`).run(id);
        db.prepare(`DELETE FROM psychological_signals WHERE user_id = ?`).run(id);
        db.prepare(`DELETE FROM profile_summary WHERE user_id = ?`).run(id);

        // Delete the user
        db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    })();

    return {
        success: true,
        // Message IDs for LanceDB cleanup - caller should handle async
        ...(messageIds.length > 0 ? { _messageIdsForCleanup: messageIds.map(m => m.id) } : {}),
    } as { success: boolean; error?: string; _messageIdsForCleanup?: string[] };
}

/**
 * Check if there is pending migration data (orphan data without user_id).
 */
export function hasPendingMigrationData(): boolean {
    const db = getDb();
    const setting = db.prepare(`
        SELECT value FROM app_settings WHERE key = 'migration_pending'
    `).get() as { value: string } | undefined;
    return setting?.value === 'true';
}

/**
 * Get counts of orphan records that can be claimed.
 */
export function getPendingDataCounts(): MigrationStatus['counts'] {
    const db = getDb();

    const conversations = (db.prepare(`
        SELECT COUNT(*) as count FROM conversations WHERE user_id IS NULL
    `).get() as { count: number }).count;

    const values = (db.prepare(`
        SELECT COUNT(*) as count FROM user_values WHERE user_id IS NULL
    `).get() as { count: number }).count;

    const challenges = (db.prepare(`
        SELECT COUNT(*) as count FROM challenges WHERE user_id IS NULL
    `).get() as { count: number }).count;

    const goals = (db.prepare(`
        SELECT COUNT(*) as count FROM goals WHERE user_id IS NULL
    `).get() as { count: number }).count;

    return { conversations, values, challenges, goals };
}

/**
 * Get full migration status.
 */
export function getMigrationStatus(): MigrationStatus {
    return {
        pending: hasPendingMigrationData(),
        counts: getPendingDataCounts(),
    };
}

/**
 * Claim all orphan data (data without user_id) for the specified user.
 * Returns message IDs that need LanceDB embedding updates.
 */
export function claimLegacyData(userId: string): { messageIds: string[] } {
    const db = getDb();

    // 1. Get message IDs before updating (for LanceDB sync)
    const messageIds = db.prepare(`
        SELECT m.id FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id IS NULL
    `).all().map((r: unknown) => (r as { id: string }).id);

    // 2. Update SQLite tables in a transaction
    db.transaction(() => {
        db.prepare('UPDATE conversations SET user_id = ? WHERE user_id IS NULL').run(userId);
        db.prepare('UPDATE user_values SET user_id = ? WHERE user_id IS NULL').run(userId);
        db.prepare('UPDATE challenges SET user_id = ? WHERE user_id IS NULL').run(userId);
        db.prepare('UPDATE goals SET user_id = ? WHERE user_id IS NULL').run(userId);
        db.prepare('UPDATE activities SET user_id = ? WHERE user_id IS NULL').run(userId);
        db.prepare('UPDATE maslow_signals SET user_id = ? WHERE user_id IS NULL').run(userId);
        db.prepare('UPDATE psychological_signals SET user_id = ? WHERE user_id IS NULL').run(userId);

        // Handle orphan profile_summary if it exists
        const orphanProfile = db.prepare(`
            SELECT value FROM app_settings WHERE key = 'orphan_profile_summary'
        `).get() as { value: string } | undefined;

        if (orphanProfile) {
            const profileData = JSON.parse(orphanProfile.value) as {
                computed_json?: string;
                narrative_json?: string;
                computed_at?: string;
                narrative_generated_at?: string;
            };

            db.prepare(`
                INSERT OR REPLACE INTO profile_summary (user_id, computed_json, narrative_json, computed_at, narrative_generated_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                userId,
                profileData.computed_json || '{}',
                profileData.narrative_json || null,
                profileData.computed_at || new Date().toISOString(),
                profileData.narrative_generated_at || null
            );

            db.prepare(`DELETE FROM app_settings WHERE key = 'orphan_profile_summary'`).run();
        }

        // Clear migration_pending flag
        db.prepare(`DELETE FROM app_settings WHERE key = 'migration_pending'`).run();
    })();

    return { messageIds };
}

/**
 * Get the count of users.
 */
export function getUserCount(): number {
    const db = getDb();
    return (db.prepare(`SELECT COUNT(*) as count FROM users`).get() as { count: number }).count;
}
