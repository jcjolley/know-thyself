import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';
import { clearTestDatabase, waitForClaude } from './helpers/db-utils';

test.describe('Phase 4.6: Conversation Management', () => {
    test.beforeAll(async () => {
        await launchApp();
        const page = getPage();
        await waitForClaude(page, 15000);
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test.describe('US-461: View Conversation List', () => {
        test('conversation sidebar is visible on chat page', async () => {
            const page = getPage();
            // Sidebar should be visible
            const sidebar = page.locator('aside[aria-label="Conversations"]');
            await expect(sidebar).toBeVisible();
        });

        test('sidebar shows "Chapters" heading', async () => {
            const page = getPage();
            const heading = page.locator('text=Chapters');
            await expect(heading).toBeVisible();
        });

        test('new conversation button is visible', async () => {
            const page = getPage();
            const newButton = page.locator('button[aria-label="New conversation"]');
            await expect(newButton).toBeVisible();
        });
    });

    test.describe('US-462: Start New Conversation', () => {
        test.beforeEach(async () => {
            const page = getPage();
            await clearTestDatabase(page);
        });

        test('clicking new conversation button creates conversation', async () => {
            const page = getPage();

            // Get initial conversation count
            const initialCount = await page.evaluate(async () => {
                const list = await (window as any).api.conversations.list();
                return list.length;
            });

            // Click new conversation button
            const newButton = page.locator('button[aria-label="New conversation"]');
            await newButton.click();

            // Wait for conversation to be created
            await page.waitForTimeout(500);

            // Check conversation count increased
            const newCount = await page.evaluate(async () => {
                const list = await (window as any).api.conversations.list();
                return list.length;
            });

            expect(newCount).toBe(initialCount + 1);
        });

        test('new conversation shows empty chat state', async () => {
            const page = getPage();

            // Create a new conversation
            const newButton = page.locator('button[aria-label="New conversation"]');
            await newButton.click();
            await page.waitForTimeout(500);

            // Should show empty state message
            const emptyState = page.locator('text=Begin your reflection');
            await expect(emptyState).toBeVisible();
        });
    });

    test.describe('US-463: Resume Old Conversation', () => {
        test('selecting conversation via API loads its messages', async () => {
            const page = getPage();

            // Clear and create a conversation with a message
            await clearTestDatabase(page);

            // Send a message to create conversation
            const result = await page.evaluate(async () => {
                return await (window as any).api.chat.send('Test message for conversation resume');
            });

            // Wait for message to be saved
            await page.waitForTimeout(1000);

            // Create another conversation
            await page.evaluate(async () => {
                return await (window as any).api.conversations.create();
            });

            // Now we should have 2 conversations
            const conversations = await page.evaluate(async () => {
                return await (window as any).api.conversations.list();
            });
            expect(conversations.length).toBeGreaterThanOrEqual(2);

            // Get the original conversation via API
            const conv = await page.evaluate(async (id) => {
                return await (window as any).api.conversations.get(id);
            }, result.conversationId);

            // Verify conversation has the message
            expect(conv).not.toBeNull();
            expect(conv.messages.length).toBeGreaterThanOrEqual(2);
            expect(conv.messages.some((m: any) => m.content.includes('Test message for conversation resume'))).toBe(true);
        });
    });

    test.describe('US-464: Auto-Generate Conversation Title', () => {
        test.beforeEach(async () => {
            const page = getPage();
            await clearTestDatabase(page);
        });

        test('title auto-generates from first message', async () => {
            const page = getPage();

            // Send a message with recognizable content
            const result = await page.evaluate(async () => {
                return await (window as any).api.chat.send('My thoughts on personal growth and development');
            });

            // Check that title was generated
            expect(result.title).toBeDefined();
            expect(result.title).toContain('thoughts');
        });

        test('short messages get date-based titles', async () => {
            const page = getPage();

            // Send a very short message
            const result = await page.evaluate(async () => {
                return await (window as any).api.chat.send('Hi');
            });

            // Should have a date-based title
            expect(result.title).toContain('Conversation -');
        });
    });

    test.describe('US-465: Edit Conversation Title', () => {
        test('conversation title can be updated via API', async () => {
            const page = getPage();
            await clearTestDatabase(page);

            // Create a conversation
            const result = await page.evaluate(async () => {
                return await (window as any).api.chat.send('Test for title editing');
            });

            // Update the title
            const newTitle = 'My Custom Title';
            const updated = await page.evaluate(async (data) => {
                return await (window as any).api.conversations.updateTitle(data.id, data.title);
            }, { id: result.conversationId, title: newTitle });

            expect(updated).toBe(true);

            // Verify the title was updated
            const conversation = await page.evaluate(async (id) => {
                return await (window as any).api.conversations.get(id);
            }, result.conversationId);

            expect(conversation.title).toBe(newTitle);
        });
    });

    test.describe('US-466: Delete Conversation', () => {
        test('conversation can be deleted', async () => {
            const page = getPage();
            await clearTestDatabase(page);

            // Create a conversation
            const result = await page.evaluate(async () => {
                return await (window as any).api.chat.send('Test for deletion');
            });

            // Delete the conversation
            const deleted = await page.evaluate(async (id) => {
                return await (window as any).api.conversations.delete(id);
            }, result.conversationId);

            expect(deleted).toBe(true);

            // Verify conversation no longer exists
            const conversation = await page.evaluate(async (id) => {
                return await (window as any).api.conversations.get(id);
            }, result.conversationId);

            expect(conversation).toBeNull();
        });

        test('deleting conversation removes its messages', async () => {
            const page = getPage();
            await clearTestDatabase(page);

            // Create a conversation with messages
            const result = await page.evaluate(async () => {
                return await (window as any).api.chat.send('Message to be deleted');
            });

            // Delete the conversation
            await page.evaluate(async (id) => {
                return await (window as any).api.conversations.delete(id);
            }, result.conversationId);

            // Check that messages are also gone
            const messages = await page.evaluate(async () => {
                return await (window as any).api.debug.getMessages();
            });

            const messagesForConv = messages.filter((m: any) => m.conversation_id === result.conversationId);
            expect(messagesForConv.length).toBe(0);
        });
    });

    test.describe('US-467: Search Conversations', () => {
        test('search finds conversations by title', async () => {
            const page = getPage();
            await clearTestDatabase(page);

            // Create conversations with different titles
            const result1 = await page.evaluate(async () => {
                return await (window as any).api.chat.send('Thoughts about meditation and mindfulness');
            });

            await page.evaluate(async (id) => {
                return await (window as any).api.conversations.updateTitle(id, 'Meditation Journey');
            }, result1.conversationId);

            // Search for the conversation
            const searchResults = await page.evaluate(async () => {
                return await (window as any).api.conversations.search('Meditation');
            });

            expect(searchResults.length).toBeGreaterThan(0);
            expect(searchResults.some((r: any) => r.title.includes('Meditation'))).toBe(true);
        });

        test('search finds conversations by message content', async () => {
            const page = getPage();
            await clearTestDatabase(page);

            // Create a conversation with specific content
            await page.evaluate(async () => {
                return await (window as any).api.chat.send('I really enjoy hiking in the mountains every weekend');
            });

            // Search for content in messages
            const searchResults = await page.evaluate(async () => {
                return await (window as any).api.conversations.search('hiking');
            });

            expect(searchResults.length).toBeGreaterThan(0);
        });
    });

    test.describe('US-469: Toggle Sidebar Visibility', () => {
        test('sidebar can be collapsed and expanded', async () => {
            const page = getPage();

            // Find the toggle button (works for both collapsed and expanded states)
            const toggleButton = page.locator('button[aria-label*="sidebar"]').first();
            await expect(toggleButton).toBeVisible();

            // Get initial sidebar width
            const sidebar = page.locator('aside[aria-label="Conversations"]');
            const initialWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);

            // Click toggle to collapse
            await toggleButton.click();
            await page.waitForTimeout(300); // Wait for animation

            // Sidebar should be narrower
            const collapsedWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
            expect(collapsedWidth).toBeLessThan(initialWidth);

            // Click toggle again to expand
            await toggleButton.click();
            await page.waitForTimeout(300);

            // Sidebar should be back to original width
            const expandedWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
            expect(expandedWidth).toBeGreaterThan(collapsedWidth);
        });
    });

    test.describe('US-468: Conversation List API', () => {
        test('conversations.list returns array with metadata', async () => {
            const page = getPage();
            await clearTestDatabase(page);

            // Create a conversation
            await page.evaluate(async () => {
                return await (window as any).api.chat.send('Test message for list');
            });

            // Get the list
            const list = await page.evaluate(async () => {
                return await (window as any).api.conversations.list();
            });

            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);

            // Check conversation has expected properties
            const conv = list[0];
            expect(conv).toHaveProperty('id');
            expect(conv).toHaveProperty('title');
            expect(conv).toHaveProperty('created_at');
            expect(conv).toHaveProperty('updated_at');
            expect(conv).toHaveProperty('message_count');
            expect(conv.message_count).toBeGreaterThanOrEqual(2); // user + assistant
        });

        test('conversations.getCurrent returns most recent', async () => {
            const page = getPage();
            await clearTestDatabase(page);

            // Create a conversation
            const result = await page.evaluate(async () => {
                return await (window as any).api.chat.send('Current conversation test');
            });

            // Get current
            const current = await page.evaluate(async () => {
                return await (window as any).api.conversations.getCurrent();
            });

            expect(current).not.toBeNull();
            expect(current.id).toBe(result.conversationId);
        });
    });
});
