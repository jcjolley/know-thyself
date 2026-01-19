// Load environment variables FIRST, before any other imports that might use them
import dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSQLite, closeDb } from './db/sqlite.js';
import { initLanceDB } from './db/lancedb.js';
import { initEmbeddings } from './embeddings.js';
import { initClaude } from './claude.js';
import { registerIPCHandlers, setInitError } from './ipc.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, '../../preload/preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // Required for better-sqlite3
        },
    });

    // Load the renderer
    if (isDev) {
        console.log('Development mode: loading from localhost:5173');
        await mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        console.log('Production mode: loading from file');
        await mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function initialize(): Promise<void> {
    try {
        console.log('='.repeat(50));
        console.log('Know Thyself - Initializing...');
        console.log(`Mode: ${isDev ? 'development' : 'production'}`);
        console.log('='.repeat(50));

        console.log('\n[1/4] Initializing databases...');
        initSQLite();
        await initLanceDB();

        console.log('\n[2/4] Initializing Claude client...');
        try {
            initClaude();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('Claude initialization failed:', message);
            setInitError(message);
            // Continue without Claude - app can still show the error in UI
        }

        console.log('\n[3/4] Registering IPC handlers...');
        registerIPCHandlers();

        console.log('\n[4/4] Loading embedding model (this may take a moment on first run)...');
        // Don't await - let it load in background so app opens faster
        initEmbeddings().catch(err => {
            console.error('Failed to load embeddings:', err);
            setInitError(`Embedding model failed to load: ${err.message}`);
        });

        console.log('\n' + '='.repeat(50));
        console.log('Initialization complete!');
        console.log('='.repeat(50) + '\n');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Initialization failed:', message);
        setInitError(message);
    }
}

app.whenReady().then(async () => {
    await initialize();
    await createWindow();

    app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            await createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    closeDb();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    closeDb();
});
