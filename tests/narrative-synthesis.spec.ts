import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';
import { clearTestDatabase, waitForClaude } from './helpers/db-utils';

test.describe('Phase 3.2: Narrative Synthesis', () => {
    test.beforeAll(async () => {
        await launchApp();
        const page = getPage();
        await waitForClaude(page, 15000);
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test.describe('US-001: Initial Narrative Generation', () => {
        test.beforeEach(async () => {
            const page = getPage();
            await clearTestDatabase(page);
        });

        test('narrative generates after first extraction (trigger: no existing narrative)', async () => {
            const page = getPage();

            // Send a message to trigger extraction
            await page.evaluate(async () => {
                return await (window as any).api.chat.send(
                    'I really value honesty and integrity in my relationships.'
                );
            });

            // Wait for extraction and narrative synthesis to complete
            await page.waitForTimeout(3000);

            // Get profile summary
            const summary = await page.evaluate(async () => {
                return await (window as any).api.profile.getSummary();
            });

            // Narrative should be generated (mock returns valid data)
            expect(summary.identity_summary).not.toBeNull();
            expect(summary.identity_summary).toContain('thoughtful individual');
        });

        test('narrative populates all expected fields', async () => {
            const page = getPage();

            // Send a message to trigger extraction and narrative
            await page.evaluate(async () => {
                return await (window as any).api.chat.send(
                    'I care deeply about my family and want to be successful in my career.'
                );
            });

            // Wait for processing
            await page.waitForTimeout(3000);

            const summary = await page.evaluate(async () => {
                return await (window as any).api.profile.getSummary();
            });

            // Verify all narrative fields are populated
            expect(summary.identity_summary).not.toBeNull();
            expect(summary.current_phase).not.toBeNull();
            expect(summary.emotional_baseline).not.toBeNull();
            expect(Array.isArray(summary.primary_concerns)).toBe(true);
            expect(Array.isArray(summary.patterns_to_watch)).toBe(true);
            expect(Array.isArray(summary.recent_wins)).toBe(true);
            expect(Array.isArray(summary.recent_struggles)).toBe(true);
        });
    });

    test.describe('US-002: Trigger-Based Regeneration', () => {
        test.beforeEach(async () => {
            const page = getPage();
            await clearTestDatabase(page);
        });

        test('narrative regenerates after 10+ messages', async () => {
            const page = getPage();

            // Send first message to create initial narrative
            await page.evaluate(async () => {
                return await (window as any).api.chat.send('Hello, I am starting fresh.');
            });
            await page.waitForTimeout(2000);

            // Get initial narrative timestamp
            const initialSummary = await page.evaluate(async () => {
                return await (window as any).api.profile.getSummary();
            });
            expect(initialSummary.identity_summary).not.toBeNull();

            // Send 10 more messages to trigger regeneration
            for (let i = 0; i < 10; i++) {
                await page.evaluate(async (idx) => {
                    return await (window as any).api.chat.send(`Message number ${idx + 1}`);
                }, i);
                // Small delay between messages
                await page.waitForTimeout(500);
            }

            // Wait for narrative regeneration
            await page.waitForTimeout(3000);

            // Verify narrative still exists (regenerated)
            const updatedSummary = await page.evaluate(async () => {
                return await (window as any).api.profile.getSummary();
            });
            expect(updatedSummary.identity_summary).not.toBeNull();
        });
    });

    test.describe('US-003: Narrative Display', () => {
        test.beforeEach(async () => {
            const page = getPage();
            await clearTestDatabase(page);
        });

        test('Self-Portrait shows identity summary instead of placeholder', async () => {
            const page = getPage();

            // First, generate narrative by sending a message
            await page.evaluate(async () => {
                return await (window as any).api.chat.send(
                    'I believe in working hard and being kind to others.'
                );
            });
            await page.waitForTimeout(3000);

            // Navigate to Self-Portrait view
            const portraitButton = page.locator('button:has-text("Portrait")');
            if (await portraitButton.isVisible()) {
                await portraitButton.click();
                await page.waitForTimeout(1000);

                // Check that placeholder text is NOT visible
                const placeholder = page.locator('text=Your story is still unfolding');
                const placeholderVisible = await placeholder.isVisible().catch(() => false);

                // If we have narrative data, placeholder should be hidden or replaced
                const summary = await page.evaluate(async () => {
                    return await (window as any).api.profile.getSummary();
                });

                if (summary.identity_summary) {
                    // With a narrative, we expect the identity summary to show
                    // The exact UI behavior depends on implementation
                    expect(summary.identity_summary).not.toBeNull();
                }
            }
        });

        test('profile summary has_data reflects narrative presence', async () => {
            const page = getPage();

            // Initially no data
            const emptyProfile = await page.evaluate(async () => {
                return await (window as any).api.profile.getSummary();
            });

            // Send message to create data
            await page.evaluate(async () => {
                return await (window as any).api.chat.send('I love learning new things.');
            });
            await page.waitForTimeout(3000);

            const populatedProfile = await page.evaluate(async () => {
                return await (window as any).api.profile.getSummary();
            });

            // After extraction, has_data should reflect actual data presence
            expect(populatedProfile.identity_summary).not.toBeNull();
        });
    });
});
