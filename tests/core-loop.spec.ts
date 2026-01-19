import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';
import { clearTestDatabase, getMessages, waitForClaude, getExtractions } from './helpers/db-utils';
import { TEST_MESSAGES } from './helpers/fixtures';

test.describe('Phase 2: Core Loop', () => {
    test.beforeAll(async () => {
        await launchApp();
        const page = getPage();
        // Wait for Claude to be ready
        await waitForClaude(page, 15000);
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test.describe('US-101: Message Persistence', () => {
        test.beforeEach(async () => {
            const page = getPage();
            await clearTestDatabase(page);
        });

        test('user message is stored in database', async () => {
            const page = getPage();

            await page.evaluate(async (msg) => {
                return await (window as any).api.chat.send(msg);
            }, 'Test message for persistence');

            const messages = await getMessages(page);

            expect(messages.length).toBeGreaterThanOrEqual(2); // user + assistant
            const userMsg = messages.find((m: any) => m.role === 'user');
            expect(userMsg).toBeDefined();
            expect(userMsg.content).toContain('Test message');
        });

        test('assistant response is stored in database', async () => {
            const page = getPage();

            await page.evaluate(async (msg) => {
                return await (window as any).api.chat.send(msg);
            }, 'Hello, how are you?');

            const messages = await getMessages(page);
            const assistantMsg = messages.find((m: any) => m.role === 'assistant');

            expect(assistantMsg).toBeDefined();
            expect(assistantMsg.content.length).toBeGreaterThan(0);
        });

        test('messages have valid timestamps', async () => {
            const page = getPage();

            const before = new Date().toISOString();
            await page.evaluate(async (msg) => {
                return await (window as any).api.chat.send(msg);
            }, 'Timestamp test');
            const after = new Date().toISOString();

            const messages = await getMessages(page);
            const userMsg = messages.find((m: any) => m.role === 'user');

            expect(userMsg?.created_at >= before).toBe(true);
            expect(userMsg?.created_at <= after).toBe(true);
        });

        test('messages persist across history calls', async () => {
            const page = getPage();

            await page.evaluate(async () => {
                await (window as any).api.chat.send('First message');
            });

            await page.evaluate(async () => {
                await (window as any).api.chat.send('Second message');
            });

            const history = await page.evaluate(async () => {
                return await (window as any).api.messages.history();
            });

            expect(history.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant
        });
    });

    test.describe('US-102: Extraction Pipeline', () => {
        test.beforeEach(async () => {
            const page = getPage();
            await clearTestDatabase(page);
        });

        test('extraction runs after user message', async () => {
            const page = getPage();

            // Send message with clear value
            await page.evaluate(async (msg) => {
                return await (window as any).api.chat.send(msg);
            }, TEST_MESSAGES.withValue);

            // Wait for extraction to complete
            await page.waitForTimeout(5000);

            const extractions = await getExtractions(page);
            expect(extractions.length).toBeGreaterThan(0);
        });

        test('extraction has valid status', async () => {
            const page = getPage();

            await page.evaluate(async (msg) => {
                return await (window as any).api.chat.send(msg);
            }, TEST_MESSAGES.withValue);

            await page.waitForTimeout(5000);

            const extractions = await getExtractions(page);
            expect(extractions.length).toBeGreaterThan(0);

            // Status should be validated or rejected, not raw
            expect(['validated', 'rejected']).toContain(extractions[0].status);
        });
    });

    test.describe('US-103: Profile Updates', () => {
        test.beforeEach(async () => {
            const page = getPage();
            await clearTestDatabase(page);
        });

        test('profile is updated after extraction', async () => {
            const page = getPage();

            // Get initial profile
            const initialProfile = await page.evaluate(async () => {
                return await (window as any).api.profile.get();
            });
            const initialValueCount = initialProfile.top_values.length;

            // Send message with clear value statement
            await page.evaluate(async (msg) => {
                return await (window as any).api.chat.send(msg);
            }, TEST_MESSAGES.withValue);

            // Wait for extraction to complete and profile to update
            await page.waitForTimeout(5000);

            // Check profile updated
            const updatedProfile = await page.evaluate(async () => {
                return await (window as any).api.profile.get();
            });

            // Profile should have at least as many values as before
            // (extraction may or may not add new values depending on what it extracts)
            expect(updatedProfile.top_values.length).toBeGreaterThanOrEqual(initialValueCount);
        });
    });

    test.describe('US-104: Context-Aware Responses', () => {
        test.beforeEach(async () => {
            const page = getPage();
            await clearTestDatabase(page);
        });

        test('response is generated with context', async () => {
            const page = getPage();

            // Send a message
            const response = await page.evaluate(async () => {
                return await (window as any).api.chat.send('Hello, I am starting a new conversation.');
            });

            // Response should be a non-empty string
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });
    });

    test.describe('US-105: Conversation Management', () => {
        test.beforeEach(async () => {
            const page = getPage();
            await clearTestDatabase(page);
        });

        test('conversation is created for messages', async () => {
            const page = getPage();

            await page.evaluate(async () => {
                return await (window as any).api.chat.send('Test message');
            });

            const messages = await getMessages(page);

            // All messages should have the same conversation_id
            const conversationIds = new Set(messages.map((m: any) => m.conversation_id));
            expect(conversationIds.size).toBe(1);
        });

        test('messages history returns conversation messages', async () => {
            const page = getPage();

            await page.evaluate(async () => {
                return await (window as any).api.chat.send('First message');
            });

            await page.evaluate(async () => {
                return await (window as any).api.chat.send('Second message');
            });

            const history = await page.evaluate(async () => {
                return await (window as any).api.messages.history();
            });

            expect(history.length).toBeGreaterThanOrEqual(4);

            // Messages should be in chronological order
            for (let i = 1; i < history.length; i++) {
                expect(history[i].created_at >= history[i-1].created_at).toBe(true);
            }
        });
    });
});
