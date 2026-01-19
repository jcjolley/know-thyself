import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication | null = null;
let page: Page | null = null;

export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
    // Build before launching
    electronApp = await electron.launch({
        args: [path.join(process.cwd(), 'dist/main/main/index.js')],
        env: {
            ...process.env,
            NODE_ENV: 'test',
            MOCK_CLAUDE: 'true', // Use mock Claude responses in tests
        },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    return { app: electronApp, page };
}

export async function closeApp(): Promise<void> {
    if (electronApp) {
        await electronApp.close();
        electronApp = null;
        page = null;
    }
}

export function getApp(): ElectronApplication {
    if (!electronApp) throw new Error('App not launched');
    return electronApp;
}

export function getPage(): Page {
    if (!page) throw new Error('Page not available');
    return page;
}
