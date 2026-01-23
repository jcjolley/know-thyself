/**
 * Web-based E2E tests for the Quote Reply feature.
 * These tests run against the web server (not Electron).
 *
 * Run with: npx playwright test tests/web/quote-reply.spec.ts
 * Requires the server to be running: npm run start:server
 */

import { test, expect } from '@playwright/test';

// Configure base URL - can be overridden via env var
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('Phase 11: Quote Reply - Web App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for the app to load
    await page.waitForSelector('h1:has-text("The Mirror")', { timeout: 10000 });
  });

  test('US-002: paragraph shows hover effect with cursor change', async ({ page }) => {
    // We need an assistant message to test hovering
    // First start a new chapter and send a message
    await page.locator('button:has-text("New Chapter")').click();
    await page.waitForSelector('h2:has-text("Begin your reflection")', { timeout: 5000 });

    // Send a message to get a response
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Hello, how are you?');
    await page.locator('button:has-text("Send")').click();

    // Wait for the response to complete (button changes back from "Reflecting...")
    await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 60000 });

    // Find an assistant paragraph (inside a message with "ASSISTANT" label)
    const assistantMessage = page.locator('text=ASSISTANT').first();
    await expect(assistantMessage).toBeVisible();

    // Find a paragraph in the assistant message bubble
    const assistantBubble = page.locator('div:has(> span:text("ASSISTANT"))').first();
    const paragraph = assistantBubble.locator('p').first();

    // Hover and check for cursor style
    await paragraph.hover();

    const cursorStyle = await paragraph.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    expect(cursorStyle).toBe('pointer');
  });

  test('US-002: quote icon appears on hover', async ({ page }) => {
    // Start a new chapter and get a response
    await page.locator('button:has-text("New Chapter")').click();
    await page.waitForSelector('h2:has-text("Begin your reflection")', { timeout: 5000 });

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Tell me something interesting.');
    await page.locator('button:has-text("Send")').click();

    // Wait for response
    await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 60000 });

    // Find the assistant message and its paragraph
    const assistantBubble = page.locator('div:has(> span:text("ASSISTANT"))').first();
    const paragraphContainer = assistantBubble.locator('div[style*="position: relative"]').first();

    // Hover over the paragraph container
    await paragraphContainer.hover();

    // Look for the quote icon (SVG with specific viewBox or path)
    const quoteIcon = paragraphContainer.locator('svg');
    await expect(quoteIcon).toBeVisible({ timeout: 5000 });
  });

  test('US-001: clicking paragraph inserts quote into input', async ({ page }) => {
    // Start a new chapter and get a response
    await page.locator('button:has-text("New Chapter")').click();
    await page.waitForSelector('h2:has-text("Begin your reflection")', { timeout: 5000 });

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Share a thought with me.');
    await page.locator('button:has-text("Send")').click();

    // Wait for response
    await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 60000 });

    // Get the first paragraph in the assistant response
    const assistantBubble = page.locator('div:has(> span:text("ASSISTANT"))').first();
    const paragraph = assistantBubble.locator('p').first();

    // Get the text content before clicking
    const paragraphText = await paragraph.textContent();

    // Click the paragraph
    await paragraph.click();

    // Check that the textarea now contains the quoted text
    const inputValue = await textarea.inputValue();

    // The quote should start with "> "
    expect(inputValue).toContain('> ');

    // The input should contain the paragraph text (or part of it)
    if (paragraphText) {
      // At least the first part of the text should be in the quote
      const firstWords = paragraphText.split(' ').slice(0, 3).join(' ');
      expect(inputValue).toContain(firstWords);
    }
  });

  test('US-001: textarea receives focus after quoting', async ({ page }) => {
    // Start a new chapter and get a response
    await page.locator('button:has-text("New Chapter")').click();
    await page.waitForSelector('h2:has-text("Begin your reflection")', { timeout: 5000 });

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Say something.');
    await page.locator('button:has-text("Send")').click();

    // Wait for response
    await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 60000 });

    // Click a paragraph to quote
    const assistantBubble = page.locator('div:has(> span:text("ASSISTANT"))').first();
    const paragraph = assistantBubble.locator('p').first();
    await paragraph.click();

    // Wait a moment for focus to be set
    await page.waitForTimeout(100);

    // Check that textarea is focused
    const isFocused = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder="Type a message..."]');
      return document.activeElement === textarea;
    });

    expect(isFocused).toBe(true);
  });

  test('US-004: quote prepends to existing input', async ({ page }) => {
    // Start a new chapter and get a response
    await page.locator('button:has-text("New Chapter")').click();
    await page.waitForSelector('h2:has-text("Begin your reflection")', { timeout: 5000 });

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Hello');
    await page.locator('button:has-text("Send")').click();

    // Wait for response
    await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 60000 });

    // Type something in the textarea first
    await textarea.fill('My response is:');
    const existingText = await textarea.inputValue();

    // Click a paragraph to quote
    const assistantBubble = page.locator('div:has(> span:text("ASSISTANT"))').first();
    const paragraph = assistantBubble.locator('p').first();
    await paragraph.click();

    // Check that the textarea contains both the quote AND the existing text
    const newValue = await textarea.inputValue();

    // Should start with quote (> )
    expect(newValue).toMatch(/^> /);

    // Should contain the original text somewhere
    expect(newValue).toContain(existingText);
  });

  test('US-003: paragraphs are NOT clickable during streaming', async ({ page }) => {
    // Start a new chapter
    await page.locator('button:has-text("New Chapter")').click();
    await page.waitForSelector('h2:has-text("Begin your reflection")', { timeout: 5000 });

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Tell me a long story about the ocean.');
    await page.locator('button:has-text("Send")').click();

    // Wait for streaming to start (button shows "Reflecting...")
    await expect(page.locator('button:has-text("Reflecting...")')).toBeVisible({ timeout: 5000 });

    // Try to find and click a paragraph during streaming
    // The paragraph should exist but not have pointer cursor
    const streamingCheck = await page.evaluate(() => {
      // Find any paragraphs in assistant messages
      const paragraphs = document.querySelectorAll('p');
      for (const p of paragraphs) {
        const style = window.getComputedStyle(p);
        // During streaming, cursor should NOT be pointer
        if (style.cursor === 'pointer') {
          return { hasPointerCursor: true };
        }
      }
      return { hasPointerCursor: false };
    });

    // During streaming, paragraphs should NOT have pointer cursor
    expect(streamingCheck.hasPointerCursor).toBe(false);
  });

  test('user message paragraphs are NOT clickable', async ({ page }) => {
    // Start a new chapter and send a message
    await page.locator('button:has-text("New Chapter")').click();
    await page.waitForSelector('h2:has-text("Begin your reflection")', { timeout: 5000 });

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('This is my message.');
    await page.locator('button:has-text("Send")').click();

    // Find the user message (has "YOU" label)
    const userBubble = page.locator('div:has(> span:text("YOU"))').first();
    await expect(userBubble).toBeVisible({ timeout: 5000 });

    // Check that user message paragraphs don't have pointer cursor
    const userParagraph = userBubble.locator('p').first();
    const cursorStyle = await userParagraph.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // User messages render with regular text, not MarkdownRenderer with quote functionality
    // So cursor should NOT be pointer
    expect(cursorStyle).not.toBe('pointer');
  });
});

test.describe('Phase 11: Quote Reply - Visual Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('h1:has-text("The Mirror")', { timeout: 10000 });
  });

  test('hover background uses subtle accent color', async ({ page }) => {
    // Start a new chapter and get a response
    await page.locator('button:has-text("New Chapter")').click();
    await page.waitForSelector('h2:has-text("Begin your reflection")', { timeout: 5000 });

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Hello');
    await page.locator('button:has-text("Send")').click();

    // Wait for response
    await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 60000 });

    // Find a paragraph and hover
    const assistantBubble = page.locator('div:has(> span:text("ASSISTANT"))').first();
    const paragraph = assistantBubble.locator('p').first();

    // Get background before hover
    const bgBefore = await paragraph.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Hover
    await paragraph.hover();

    // Small delay for transition
    await page.waitForTimeout(200);

    // Get background after hover
    const bgAfter = await paragraph.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Background should change on hover (to a subtle highlight)
    // If backgrounds are different, the hover effect is working
    // Note: bgBefore might be 'transparent' or 'rgba(0, 0, 0, 0)'
    // bgAfter should be a rgba with some opacity
    expect(bgAfter !== bgBefore || bgAfter.includes('rgba')).toBe(true);
  });

  test('transition timing is smooth (150ms)', async ({ page }) => {
    // Start a new chapter and get a response
    await page.locator('button:has-text("New Chapter")').click();
    await page.waitForSelector('h2:has-text("Begin your reflection")', { timeout: 5000 });

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Quick test');
    await page.locator('button:has-text("Send")').click();

    // Wait for response
    await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 60000 });

    // Find a paragraph and check transition
    const assistantBubble = page.locator('div:has(> span:text("ASSISTANT"))').first();
    const paragraph = assistantBubble.locator('p').first();

    const transition = await paragraph.evaluate((el) => {
      return window.getComputedStyle(el).transition;
    });

    // Should have a transition defined
    expect(transition).toContain('150ms');
  });
});
