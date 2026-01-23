/**
 * Global setup for Playwright web tests.
 * Cleans the test data directory before running tests to ensure isolation.
 */

import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.resolve('./test-data');

async function globalSetup() {
    console.log('[test-setup] Preparing test data directory:', TEST_DATA_DIR);

    // Remove old test database files if they exist
    const filesToClean = [
        'know-thyself.db',
        'know-thyself.db-wal',
        'know-thyself.db-shm',
        'know-thyself.db-journal',
    ];

    for (const file of filesToClean) {
        const filePath = path.join(TEST_DATA_DIR, file);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`[test-setup] Removed: ${file}`);
            } catch (err) {
                console.warn(`[test-setup] Could not remove ${file}:`, err);
            }
        }
    }

    // Remove LanceDB directory
    const lanceDir = path.join(TEST_DATA_DIR, 'lancedb');
    if (fs.existsSync(lanceDir)) {
        try {
            fs.rmSync(lanceDir, { recursive: true, force: true });
            console.log('[test-setup] Removed: lancedb/');
        } catch (err) {
            console.warn('[test-setup] Could not remove lancedb/:', err);
        }
    }

    // Ensure test data directory exists
    if (!fs.existsSync(TEST_DATA_DIR)) {
        fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
        console.log('[test-setup] Created test data directory');
    }

    console.log('[test-setup] Test data directory ready');
}

export default globalSetup;
