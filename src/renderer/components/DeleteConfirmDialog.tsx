import React, { useEffect, useRef, useState } from 'react';

interface DeleteConfirmDialogProps {
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteConfirmDialog({ title, onConfirm, onCancel }: DeleteConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        // Focus cancel button (safe default)
        cancelButtonRef.current?.focus();

        // Handle escape key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        // Trap focus within dialog
        const handleFocusTrap = (e: FocusEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
                cancelButtonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('focusin', handleFocusTrap);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('focusin', handleFocusTrap);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onCancel, 150);
    };

    const handleConfirm = () => {
        setIsVisible(false);
        setTimeout(onConfirm, 150);
    };

    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        background: 'rgba(61, 54, 48, 0.4)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 150ms ease',
    };

    const dialogStyle: React.CSSProperties = {
        background: 'linear-gradient(180deg, #fdfcfb 0%, #f8f5f0 100%)',
        borderRadius: 12,
        boxShadow: '0 20px 40px rgba(61, 54, 48, 0.2), 0 8px 16px rgba(61, 54, 48, 0.1)',
        width: 340,
        maxWidth: '90vw',
        padding: '24px',
        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid rgba(139, 129, 120, 0.15)',
    };

    const iconContainerStyle: React.CSSProperties = {
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'rgba(196, 90, 74, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    };

    const titleStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 18,
        fontWeight: 400,
        color: '#3d3630',
        margin: '0 0 8px 0',
    };

    const messageStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        color: '#6b6359',
        margin: '0 0 24px 0',
        lineHeight: 1.5,
    };

    const conversationNameStyle: React.CSSProperties = {
        fontWeight: 500,
        color: '#3d3630',
    };

    const buttonsStyle: React.CSSProperties = {
        display: 'flex',
        gap: 12,
        justifyContent: 'flex-end',
    };

    const buttonBaseStyle: React.CSSProperties = {
        padding: '10px 20px',
        borderRadius: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 150ms ease',
    };

    const cancelButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        background: 'transparent',
        border: '1px solid rgba(139, 129, 120, 0.3)',
        color: '#6b6359',
    };

    const deleteButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        background: 'linear-gradient(135deg, #c45a4a 0%, #b04d3e 100%)',
        border: 'none',
        color: '#fff',
        boxShadow: '0 2px 6px rgba(196, 90, 74, 0.3)',
    };

    return (
        <div
            style={overlayStyle}
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
        >
            <div
                ref={dialogRef}
                style={dialogStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={iconContainerStyle}>
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#c45a4a"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </div>

                <h2 id="delete-dialog-title" style={titleStyle}>Delete Chapter?</h2>

                <p style={messageStyle}>
                    Are you sure you want to delete "<span style={conversationNameStyle}>{title}</span>"?
                    This will permanently remove all messages in this conversation. This cannot be undone.
                </p>

                <div style={buttonsStyle}>
                    <button
                        ref={cancelButtonRef}
                        style={cancelButtonStyle}
                        onClick={handleClose}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 129, 120, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(139, 129, 120, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'rgba(139, 129, 120, 0.3)';
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        style={deleteButtonStyle}
                        onClick={handleConfirm}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #d4665a 0%, #c45a4a 100%)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(196, 90, 74, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #c45a4a 0%, #b04d3e 100%)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(196, 90, 74, 0.3)';
                        }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
