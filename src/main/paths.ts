import path from 'path';
import fs from 'fs';

// Determine if we're running in Electron or standalone Node
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;

let dataDir: string | null = null;

function getDataDir(): string {
    if (dataDir) return dataDir;

    // Environment variable takes precedence
    if (process.env.DATA_DIR) {
        dataDir = process.env.DATA_DIR;
    } else if (isElectron) {
        // In Electron, use userData - dynamic import to avoid issues in non-Electron context
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { app } = require('electron');
        dataDir = app.getPath('userData');
    } else {
        // Standalone server: use ./data or /data (Docker)
        dataDir = path.join(process.cwd(), 'data');
    }

    return dataDir as string;
}

export function initPaths(): void {
    const dir = getDataDir();

    // Ensure directories exist
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const modelsDir = path.join(dir, 'models');
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
    }

    const lanceDir = path.join(dir, 'lancedb');
    if (!fs.existsSync(lanceDir)) {
        fs.mkdirSync(lanceDir, { recursive: true });
    }

    console.log('[paths] Data directory:', dir);
}

export const paths = {
    get dataDir() {
        return getDataDir();
    },
    get sqlite() {
        return path.join(getDataDir(), 'know-thyself.db');
    },
    get lancedb() {
        return path.join(getDataDir(), 'lancedb');
    },
    get models() {
        return path.join(getDataDir(), 'models');
    },
};
