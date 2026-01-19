import { Page } from 'playwright';

export async function clearTestDatabase(page: Page): Promise<void> {
    await page.evaluate(async () => {
        await (window as any).api.debug.clearDatabase();
    });
}

export async function waitForExtraction(page: Page, messageId: string, timeout = 10000): Promise<any> {
    return page.evaluate(async ({ messageId, timeout }) => {
        return await (window as any).api.debug.waitForExtraction(messageId, timeout);
    }, { messageId, timeout });
}

export async function getExtractions(page: Page, messageId?: string): Promise<any[]> {
    return page.evaluate(async (msgId) => {
        return await (window as any).api.debug.getExtractions(msgId);
    }, messageId);
}

export async function getMessages(page: Page): Promise<any[]> {
    return page.evaluate(async () => {
        return await (window as any).api.debug.getMessages();
    });
}

export async function waitForEmbeddings(page: Page, timeout = 30000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const isReady = await page.evaluate(async () => {
            return await (window as any).api.embeddings.isReady();
        });
        if (isReady) return true;
        await page.waitForTimeout(500);
    }
    return false;
}

export async function waitForClaude(page: Page, timeout = 10000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const status = await page.evaluate(async () => {
            return await (window as any).api.app.getStatus();
        });
        if (status.claudeReady) return true;
        await page.waitForTimeout(200);
    }
    return false;
}
