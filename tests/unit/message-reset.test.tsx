import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageActions } from '../../src/renderer/components/MessageActions';
import { ResetConfirmDialog } from '../../src/renderer/components/ResetConfirmDialog';
import { MessageActionSheet } from '../../src/renderer/components/MessageActionSheet';
import { ThemeProvider } from '../../src/renderer/contexts/ThemeContext';

// Helper to render with ThemeProvider
function renderWithTheme(component: React.ReactElement) {
    return render(<ThemeProvider>{component}</ThemeProvider>);
}

// Mock matchMedia for ThemeProvider
beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches: false, // Default to light mode
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    });
    localStorage.clear();
});

describe('US-001: Reset Conversation After Message', () => {
    it('US-001: shows action trigger when hovering (canReset=true)', () => {
        const onToggle = vi.fn();
        renderWithTheme(
            <MessageActions
                messageId="msg-1"
                messageRole="user"
                canReset={true}
                canRegenerate={false}
                isExpanded={false}
                onToggle={onToggle}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        // Should show the trigger dot (action button)
        const trigger = screen.getByRole('button', { name: /show message actions/i });
        expect(trigger).toBeInTheDocument();
    });

    it('US-001: reset button hidden when canReset=false', () => {
        renderWithTheme(
            <MessageActions
                messageId="msg-1"
                messageRole="user"
                canReset={false}
                canRegenerate={false}
                isExpanded={true}
                onToggle={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        // When both canReset and canRegenerate are false, nothing should render
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('US-001: expanded state shows reset icon', () => {
        renderWithTheme(
            <MessageActions
                messageId="msg-1"
                messageRole="user"
                canReset={true}
                canRegenerate={false}
                isExpanded={true}
                onToggle={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        // Should show the reset button
        const resetBtn = screen.getByRole('button', { name: /reset conversation after this message/i });
        expect(resetBtn).toBeInTheDocument();
    });

    it('US-001: clicking reset button calls onResetAfter', () => {
        const onResetAfter = vi.fn();
        renderWithTheme(
            <MessageActions
                messageId="msg-1"
                messageRole="user"
                canReset={true}
                canRegenerate={false}
                isExpanded={true}
                onToggle={vi.fn()}
                onResetAfter={onResetAfter}
                onRegenerate={vi.fn()}
            />
        );

        const resetBtn = screen.getByRole('button', { name: /reset conversation after this message/i });
        fireEvent.click(resetBtn);
        expect(onResetAfter).toHaveBeenCalledTimes(1);
    });
});

describe('US-002: Regenerate Assistant Response', () => {
    it('US-002: regenerate button shown for assistant messages', () => {
        renderWithTheme(
            <MessageActions
                messageId="msg-1"
                messageRole="assistant"
                canReset={true}
                canRegenerate={true}
                isExpanded={true}
                onToggle={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        const regenBtn = screen.getByRole('button', { name: /regenerate this response/i });
        expect(regenBtn).toBeInTheDocument();
    });

    it('US-002: regenerate button NOT shown for user messages', () => {
        renderWithTheme(
            <MessageActions
                messageId="msg-1"
                messageRole="user"
                canReset={true}
                canRegenerate={true} // Even with canRegenerate=true, user messages don't show regen
                isExpanded={true}
                onToggle={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
    });

    it('US-002: clicking regenerate calls onRegenerate', () => {
        const onRegenerate = vi.fn();
        renderWithTheme(
            <MessageActions
                messageId="msg-1"
                messageRole="assistant"
                canReset={true}
                canRegenerate={true}
                isExpanded={true}
                onToggle={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={onRegenerate}
            />
        );

        const regenBtn = screen.getByRole('button', { name: /regenerate this response/i });
        fireEvent.click(regenBtn);
        expect(onRegenerate).toHaveBeenCalledTimes(1);
    });

    it('US-002: regenerate hidden when canRegenerate=false (streaming)', () => {
        renderWithTheme(
            <MessageActions
                messageId="msg-1"
                messageRole="assistant"
                canReset={false}
                canRegenerate={false}
                isExpanded={true}
                onToggle={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
    });
});

describe('US-004: Confirmation Dialog', () => {
    it('US-004: shows correct delete count', () => {
        renderWithTheme(
            <ResetConfirmDialog
                messagePreview="This is a test message preview"
                deleteCount={5}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
                isLoading={false}
            />
        );

        expect(screen.getByText(/5 reflections/i)).toBeInTheDocument();
    });

    it('US-004: shows truncated message preview', () => {
        const longMessage = 'A'.repeat(100);
        renderWithTheme(
            <ResetConfirmDialog
                messagePreview={longMessage}
                deleteCount={3}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
                isLoading={false}
            />
        );

        // Preview should be truncated with ellipsis
        const preview = screen.getByText(/^"A+\.\.\."/);
        expect(preview).toBeInTheDocument();
    });

    it('US-004: Cancel button triggers onCancel', async () => {
        const onCancel = vi.fn();
        renderWithTheme(
            <ResetConfirmDialog
                messagePreview="Test message"
                deleteCount={2}
                onConfirm={vi.fn()}
                onCancel={onCancel}
                isLoading={false}
            />
        );

        const cancelBtn = screen.getByRole('button', { name: /stay here/i });
        fireEvent.click(cancelBtn);

        // Wait for animation
        await waitFor(() => {
            expect(onCancel).toHaveBeenCalledTimes(1);
        }, { timeout: 300 });
    });

    it('US-004: Confirm button triggers onConfirm', () => {
        const onConfirm = vi.fn();
        renderWithTheme(
            <ResetConfirmDialog
                messagePreview="Test message"
                deleteCount={2}
                onConfirm={onConfirm}
                onCancel={vi.fn()}
                isLoading={false}
            />
        );

        const confirmBtn = screen.getByRole('button', { name: /go back/i });
        fireEvent.click(confirmBtn);
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('US-004: shows loading state', () => {
        renderWithTheme(
            <ResetConfirmDialog
                messagePreview="Test message"
                deleteCount={2}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
                isLoading={true}
            />
        );

        expect(screen.getByText(/going back\.\.\./i)).toBeInTheDocument();
    });

    it('US-004: buttons disabled during loading', () => {
        renderWithTheme(
            <ResetConfirmDialog
                messagePreview="Test message"
                deleteCount={2}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
                isLoading={true}
            />
        );

        const cancelBtn = screen.getByRole('button', { name: /stay here/i });
        const confirmBtn = screen.getByRole('button', { name: /going back/i });
        expect(cancelBtn).toBeDisabled();
        expect(confirmBtn).toBeDisabled();
    });

    it('US-004: escape key closes dialog', async () => {
        const onCancel = vi.fn();
        renderWithTheme(
            <ResetConfirmDialog
                messagePreview="Test message"
                deleteCount={2}
                onConfirm={vi.fn()}
                onCancel={onCancel}
                isLoading={false}
            />
        );

        fireEvent.keyDown(document, { key: 'Escape' });

        await waitFor(() => {
            expect(onCancel).toHaveBeenCalledTimes(1);
        }, { timeout: 300 });
    });
});

describe('US-005: Touch/Mobile Support', () => {
    it('US-005: action sheet shows reset option when canReset=true', () => {
        renderWithTheme(
            <MessageActionSheet
                isOpen={true}
                canReset={true}
                canRegenerate={false}
                deleteCount={3}
                onClose={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        expect(screen.getByText(/reset after this/i)).toBeInTheDocument();
        expect(screen.getByText(/remove 3 messages/i)).toBeInTheDocument();
    });

    it('US-005: action sheet shows regenerate option when canRegenerate=true', () => {
        renderWithTheme(
            <MessageActionSheet
                isOpen={true}
                canReset={false}
                canRegenerate={true}
                deleteCount={0}
                onClose={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        expect(screen.getByText(/regenerate response/i)).toBeInTheDocument();
    });

    it('US-005: clicking reset calls onResetAfter', async () => {
        const onResetAfter = vi.fn();
        renderWithTheme(
            <MessageActionSheet
                isOpen={true}
                canReset={true}
                canRegenerate={false}
                deleteCount={3}
                onClose={vi.fn()}
                onResetAfter={onResetAfter}
                onRegenerate={vi.fn()}
            />
        );

        const resetOption = screen.getByText(/reset after this/i);
        fireEvent.click(resetOption.closest('div[role="button"]')!);

        await waitFor(() => {
            expect(onResetAfter).toHaveBeenCalledTimes(1);
        }, { timeout: 300 });
    });

    it('US-005: clicking regenerate calls onRegenerate', async () => {
        const onRegenerate = vi.fn();
        renderWithTheme(
            <MessageActionSheet
                isOpen={true}
                canReset={false}
                canRegenerate={true}
                deleteCount={0}
                onClose={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={onRegenerate}
            />
        );

        const regenOption = screen.getByText(/regenerate response/i);
        fireEvent.click(regenOption.closest('div[role="button"]')!);

        await waitFor(() => {
            expect(onRegenerate).toHaveBeenCalledTimes(1);
        }, { timeout: 300 });
    });

    it('US-005: cancel closes the sheet', async () => {
        const onClose = vi.fn();
        renderWithTheme(
            <MessageActionSheet
                isOpen={true}
                canReset={true}
                canRegenerate={true}
                deleteCount={3}
                onClose={onClose}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        const cancelBtn = screen.getByText(/cancel/i);
        fireEvent.click(cancelBtn.closest('div[role="button"]')!);

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledTimes(1);
        }, { timeout: 300 });
    });

    it('US-005: sheet not rendered when isOpen=false', () => {
        renderWithTheme(
            <MessageActionSheet
                isOpen={false}
                canReset={true}
                canRegenerate={true}
                deleteCount={3}
                onClose={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        expect(screen.queryByText(/reset after this/i)).not.toBeInTheDocument();
    });
});

describe('Edge Cases', () => {
    it('does not render MessageActions when both canReset and canRegenerate are false', () => {
        const { container } = renderWithTheme(
            <MessageActions
                messageId="msg-1"
                messageRole="assistant"
                canReset={false}
                canRegenerate={false}
                isExpanded={false}
                onToggle={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('clicking trigger toggles expanded state', () => {
        const onToggle = vi.fn();
        renderWithTheme(
            <MessageActions
                messageId="msg-1"
                messageRole="user"
                canReset={true}
                canRegenerate={false}
                isExpanded={false}
                onToggle={onToggle}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        const trigger = screen.getByRole('button', { name: /show message actions/i });
        fireEvent.click(trigger);
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('ResetConfirmDialog shows singular "reflection" for count=1', () => {
        renderWithTheme(
            <ResetConfirmDialog
                messagePreview="Test message"
                deleteCount={1}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
                isLoading={false}
            />
        );

        expect(screen.getByText(/1 reflection/i)).toBeInTheDocument();
        // Make sure it doesn't say "reflections"
        expect(screen.queryByText(/reflections/i)).not.toBeInTheDocument();
    });

    it('MessageActionSheet shows singular "message" for count=1', () => {
        renderWithTheme(
            <MessageActionSheet
                isOpen={true}
                canReset={true}
                canRegenerate={false}
                deleteCount={1}
                onClose={vi.fn()}
                onResetAfter={vi.fn()}
                onRegenerate={vi.fn()}
            />
        );

        expect(screen.getByText(/remove 1 message$/i)).toBeInTheDocument();
    });
});
