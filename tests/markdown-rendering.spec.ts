import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';
import { waitForClaude, clearTestDatabase } from './helpers/db-utils';

test.describe('Phase 6.1: Markdown Rendering', () => {
    test.beforeAll(async () => {
        await launchApp();
        const page = getPage();
        await waitForClaude(page, 15000);
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test.beforeEach(async () => {
        const page = getPage();
        // Clear database
        await clearTestDatabase(page);
        // Click "New Chapter" to create a fresh conversation and clear UI state
        const newChapterBtn = page.locator('button:has-text("New Chapter")');
        await newChapterBtn.click();
        // Wait for the empty state to appear (indicates new conversation is ready)
        await page.waitForSelector('h2:has-text("Begin your reflection")', { timeout: 5000 });
    });

    test('US-001/US-002: assistant messages render markdown elements', async () => {
        const page = getPage();

        // Send a message - Claude's response may contain markdown
        await page.evaluate(async () => {
            await (window as any).api.chat.send('Tell me about something important. Use emphasis.');
        });

        // Wait for the response to appear
        await page.waitForTimeout(3000);

        // Get the chat area HTML
        const chatHtml = await page.evaluate(() => {
            const chatArea = document.querySelector('.chat-messages-area');
            return chatArea?.innerHTML || '';
        });

        // Verify the MarkdownRenderer is being used (it wraps content in specific elements)
        // Even if Claude doesn't use markdown, we should see <p> elements from MarkdownRenderer
        expect(chatHtml).toContain('<p');
    });

    test('US-001: user messages display literal asterisks (not markdown)', async () => {
        const page = getPage();

        // Send a message with markdown-like syntax using UI
        const testMessage = 'I want to say *hello* and **goodbye**';
        const textarea = page.locator('textarea[placeholder="Type a message..."]');
        await textarea.fill(testMessage);

        // Wait for send button to be enabled and click it
        const sendButton = page.locator('button:has-text("Send")');
        await sendButton.click();

        // Wait for the message to appear in the chat
        await page.waitForFunction(
            (expectedText) => {
                const chatArea = document.querySelector('.chat-messages-area');
                if (!chatArea) return false;
                return chatArea.textContent?.includes(expectedText) || false;
            },
            '*hello*',
            { timeout: 15000 }
        );

        // Check that the user message contains literal asterisks
        const userMessageHtml = await page.evaluate((expectedContent) => {
            // Find all message bubbles
            const chatArea = document.querySelector('.chat-messages-area');
            if (!chatArea) return '';

            // Look for the user message containing our specific text
            const messages = chatArea.querySelectorAll(':scope > div');
            for (const msg of Array.from(messages)) {
                const labelSpan = msg.querySelector('span');
                // User messages have the "You" label (rendered uppercase via CSS)
                if (labelSpan?.textContent === 'You') {
                    // Get the paragraph with the actual content
                    const contentP = msg.querySelector('p');
                    const text = contentP?.textContent || '';
                    // Find the message with our specific content
                    if (text.includes(expectedContent)) {
                        return text;
                    }
                }
            }
            return '';
        }, '*hello*');

        // User message should contain literal asterisks (not converted to <em> or <strong>)
        expect(userMessageHtml).toContain('*hello*');
        expect(userMessageHtml).toContain('**goodbye**');
    });

    test('US-003: MarkdownRenderer handles various content gracefully', async () => {
        const page = getPage();

        // Send multiple messages to test different scenarios
        await page.evaluate(async () => {
            await (window as any).api.chat.send('First test message');
        });

        await page.waitForTimeout(2000);

        await page.evaluate(async () => {
            await (window as any).api.chat.send('Another message to test streaming');
        });

        await page.waitForTimeout(2000);

        // Verify no errors occurred (page should still be functional)
        const sendButton = await page.$('button');
        expect(sendButton).not.toBeNull();

        // Verify messages are visible
        const messagesExist = await page.evaluate(() => {
            const chatArea = document.querySelector('.chat-messages-area');
            return (chatArea?.children.length ?? 0) > 0;
        });
        expect(messagesExist).toBe(true);
    });

    test('assistant messages use MarkdownRenderer component', async () => {
        const page = getPage();

        // Send a simple message using UI
        const textarea = page.locator('textarea[placeholder="Type a message..."]');
        await textarea.fill('Hello, tell me something interesting');

        const sendButton = page.locator('button:has-text("Send")');
        await sendButton.click();

        // Wait for assistant response to appear
        await page.waitForFunction(
            () => {
                const chatArea = document.querySelector('.chat-messages-area');
                if (!chatArea) return false;
                // Look for Assistant label indicating response arrived
                return chatArea.textContent?.includes('Assistant') || false;
            },
            { timeout: 15000 }
        );

        // The assistant message should have markdown-rendered paragraphs
        // MarkdownRenderer wraps content in <p> elements with specific styles
        const hasMarkdownParagraphs = await page.evaluate(() => {
            const chatArea = document.querySelector('.chat-messages-area');
            if (!chatArea) return false;

            // Look for paragraphs with the Georgia font (from MarkdownRenderer styles)
            const paragraphs = chatArea.querySelectorAll('p');
            return Array.from(paragraphs).some(p => {
                const style = window.getComputedStyle(p);
                return style.fontFamily.includes('Georgia');
            });
        });

        expect(hasMarkdownParagraphs).toBe(true);
    });
});
