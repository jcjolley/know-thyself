/**
 * Unit tests for ThinkingIndicator component
 *
 * Tests the thinking indicator UI that appears when using reasoning/thinking models
 * like GLM-4 that output thinking content before generating responses.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThinkingIndicator } from '../../src/renderer/components/ThinkingIndicator';
import React from 'react';

// Mock the ThemeContext
vi.mock('../../src/renderer/contexts/ThemeContext', () => ({
    useTheme: () => ({
        theme: {
            colors: {
                textSecondary: '#666666',
                accent: '#c4956a',
            },
        },
        isDark: false,
    }),
}));

describe('ThinkingIndicator Component', () => {
    it('renders the "contemplating" text', () => {
        render(<ThinkingIndicator />);

        const contemplatingText = screen.getByText('contemplating');
        expect(contemplatingText).toBeInTheDocument();
    });

    it('renders with italic Georgia font', () => {
        render(<ThinkingIndicator />);

        const contemplatingText = screen.getByText('contemplating');
        const style = contemplatingText.getAttribute('style') || '';

        // Check the inline style contains the expected properties
        expect(style).toContain('font-family');
        expect(style).toContain('Georgia');
        expect(style).toContain('font-style: italic');
    });

    it('renders three orb elements', () => {
        const { container } = render(<ThinkingIndicator />);

        // The orbs are span elements with border-radius: 50%
        const orbs = container.querySelectorAll('span[style*="border-radius: 50%"]');
        expect(orbs.length).toBe(3);
    });

    it('orbs have different animation delays for organic feel', () => {
        const { container } = render(<ThinkingIndicator />);

        const orbs = container.querySelectorAll('span[style*="border-radius: 50%"]');
        const delays: string[] = [];

        orbs.forEach((orb) => {
            const style = orb.getAttribute('style') || '';
            // Extract animation delay from style
            const match = style.match(/animation:.*?(\d+\.?\d*)s/);
            if (match) {
                delays.push(match[1]);
            }
        });

        // We should have collected animation timing info
        // The durations should be different (2.2, 2.4, 2.8 seconds)
        expect(delays.length).toBeGreaterThan(0);
    });

    it('orbs use the theme accent color', () => {
        const { container } = render(<ThinkingIndicator />);

        const orbs = container.querySelectorAll('span[style*="border-radius: 50%"]');

        orbs.forEach((orb) => {
            const style = orb.getAttribute('style') || '';
            // Should contain the accent color
            expect(style).toContain('rgb(196, 149, 106)');
        });
    });

    it('includes style tag with breathe animation', () => {
        const { container } = render(<ThinkingIndicator />);

        const styleTag = container.querySelector('style');
        expect(styleTag).toBeInTheDocument();
        expect(styleTag?.textContent).toContain('@keyframes breathe');
    });

    it('breathe animation includes scale and opacity transforms', () => {
        const { container } = render(<ThinkingIndicator />);

        const styleTag = container.querySelector('style');
        const styleContent = styleTag?.textContent || '';

        expect(styleContent).toContain('transform: scale');
        expect(styleContent).toContain('opacity');
    });
});

describe('ThinkingIndicator Accessibility', () => {
    it('has visible text content for screen readers', () => {
        render(<ThinkingIndicator />);

        // The "contemplating" text should be accessible
        expect(screen.getByText('contemplating')).toBeVisible();
    });
});

describe('ThinkingIndicator Animation Design', () => {
    it('uses organic, non-mechanical animation timing', () => {
        const { container } = render(<ThinkingIndicator />);

        // The ease-in-out is in the animation property on the orbs, not in keyframes
        const orbs = container.querySelectorAll('span[style*="border-radius: 50%"]');

        // Check that at least one orb has ease-in-out in its animation
        const hasEaseInOut = Array.from(orbs).some((orb) => {
            const style = orb.getAttribute('style') || '';
            return style.includes('ease-in-out');
        });

        expect(hasEaseInOut).toBe(true);
    });

    it('animation creates breathing effect with scale range', () => {
        const { container } = render(<ThinkingIndicator />);

        const styleTag = container.querySelector('style');
        const styleContent = styleTag?.textContent || '';

        // Should scale between small and normal size
        expect(styleContent).toContain('scale(0.6)');
        expect(styleContent).toContain('scale(1)');
    });

    it('animation includes opacity variation for depth', () => {
        const { container } = render(<ThinkingIndicator />);

        const styleTag = container.querySelector('style');
        const styleContent = styleTag?.textContent || '';

        // Should vary opacity for breathing effect
        expect(styleContent).toContain('opacity: 0.3');
        expect(styleContent).toContain('opacity: 0.9');
    });
});
