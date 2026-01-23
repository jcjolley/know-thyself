import React, { useState, useCallback, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';

interface ApiKeySetupProps {
    onComplete: () => void;
    isModal?: boolean;
    onCancel?: () => void;
}

export function ApiKeySetup({ onComplete, isModal = false, onCancel }: ApiKeySetupProps) {
    const api = useApi();
    const [key, setKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);

    // Validate on change
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setKey(e.target.value);
        setError(null);
    }, []);

    // Handle blur validation
    const handleBlur = useCallback(async () => {
        if (key.trim().length > 0) {
            const result = await api.apiKey.validate(key);
            if (!result.valid) {
                setError(result.error || 'Invalid key format');
            }
        }
    }, [api, key]);

    // Handle save
    const handleSave = useCallback(async () => {
        if (!key.trim()) {
            setError('API key is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const result = await api.apiKey.save(key);
            if (result.success) {
                onComplete();
            } else {
                setError(result.error || 'Failed to save key');
            }
        } catch {
            setError('Failed to save API key');
        } finally {
            setSaving(false);
        }
    }, [api, key, onComplete]);

    // Handle Enter key
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !saving) {
            handleSave();
        }
        if (e.key === 'Escape' && isModal && onCancel) {
            onCancel();
        }
    }, [handleSave, saving, isModal, onCancel]);

    // Focus input on mount
    useEffect(() => {
        const input = document.getElementById('api-key-input');
        input?.focus();
    }, []);

    const containerStyle: React.CSSProperties = isModal ? {
        position: 'fixed',
        inset: 0,
        background: 'rgba(61, 54, 48, 0.4)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    } : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(180deg, #fdfcfb 0%, #f8f5f0 100%)',
        padding: 24,
    };

    const cardStyle: React.CSSProperties = {
        background: 'linear-gradient(180deg, #fdfcfb 0%, #f8f5f0 100%)',
        borderRadius: 16,
        boxShadow: isModal
            ? '0 20px 40px rgba(61, 54, 48, 0.2), 0 8px 16px rgba(61, 54, 48, 0.1)'
            : '0 4px 24px rgba(61, 54, 48, 0.08)',
        width: '100%',
        maxWidth: 420,
        padding: 32,
        border: '1px solid rgba(139, 129, 120, 0.15)',
    };

    const iconStyle: React.CSSProperties = {
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(139, 120, 100, 0.12) 0%, rgba(139, 120, 100, 0.06) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
    };

    const titleStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 24,
        fontWeight: 400,
        color: '#3d3630',
        margin: '0 0 8px 0',
        textAlign: 'center',
    };

    const subtitleStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 15,
        color: '#6b6359',
        margin: '0 0 32px 0',
        textAlign: 'center',
        lineHeight: 1.5,
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        fontWeight: 500,
        color: '#6b6359',
        marginBottom: 8,
    };

    const inputContainerStyle: React.CSSProperties = {
        position: 'relative',
        marginBottom: 8,
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 44px 12px 14px',
        borderRadius: 8,
        border: error
            ? '1px solid rgba(196, 90, 74, 0.5)'
            : '1px solid rgba(139, 129, 120, 0.3)',
        fontFamily: 'monospace',
        fontSize: 14,
        color: '#3d3630',
        background: '#fff',
        outline: 'none',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        boxSizing: 'border-box',
    };

    const toggleButtonStyle: React.CSSProperties = {
        position: 'absolute',
        right: 8,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        padding: 8,
        cursor: 'pointer',
        color: '#8b8178',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const errorStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        color: '#c45a4a',
        marginBottom: 16,
        minHeight: 20,
    };

    const helpTextStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        color: '#8b8178',
        marginBottom: 24,
        lineHeight: 1.5,
    };

    const linkStyle: React.CSSProperties = {
        color: '#7a6e5d',
        textDecoration: 'underline',
        cursor: 'pointer',
    };

    const buttonContainerStyle: React.CSSProperties = {
        display: 'flex',
        gap: 12,
        justifyContent: isModal ? 'flex-end' : 'center',
    };

    const buttonStyle: React.CSSProperties = {
        padding: '12px 28px',
        borderRadius: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 15,
        fontWeight: 500,
        cursor: saving ? 'not-allowed' : 'pointer',
        transition: 'all 150ms ease',
        background: 'linear-gradient(135deg, #8b7864 0%, #7a6e5d 100%)',
        border: 'none',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(139, 120, 100, 0.25)',
        opacity: saving ? 0.7 : 1,
    };

    const cancelButtonStyle: React.CSSProperties = {
        padding: '12px 20px',
        borderRadius: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 15,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 150ms ease',
        background: 'transparent',
        border: '1px solid rgba(139, 129, 120, 0.3)',
        color: '#6b6359',
    };

    const securityNoteStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        background: 'rgba(139, 120, 100, 0.06)',
        borderRadius: 8,
        marginBottom: 24,
    };

    const securityTextStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        color: '#8b8178',
        lineHeight: 1.5,
        margin: 0,
    };

    const content = (
        <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={iconStyle}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b7864" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
            </div>

            <h1 style={titleStyle}>
                {isModal ? 'Update API Key' : 'Welcome to Know Thyself'}
            </h1>
            <p style={subtitleStyle}>
                {isModal
                    ? 'Enter your new Anthropic API key'
                    : 'Enter your Anthropic API key to begin your journey of self-discovery'
                }
            </p>

            <label style={labelStyle} htmlFor="api-key-input">
                API Key
            </label>
            <div style={inputContainerStyle}>
                <input
                    id="api-key-input"
                    type={showKey ? 'text' : 'password'}
                    value={key}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="sk-ant-..."
                    style={inputStyle}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(139, 120, 100, 0.5)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 120, 100, 0.1)';
                    }}
                    onBlurCapture={(e) => {
                        if (!error) {
                            e.currentTarget.style.borderColor = 'rgba(139, 129, 120, 0.3)';
                            e.currentTarget.style.boxShadow = 'none';
                        }
                    }}
                />
                <button
                    type="button"
                    style={toggleButtonStyle}
                    onClick={() => setShowKey(!showKey)}
                    tabIndex={-1}
                >
                    {showKey ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                </button>
            </div>

            <div style={errorStyle}>
                {error}
            </div>

            <p style={helpTextStyle}>
                Get your API key from the{' '}
                <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkStyle}
                    onClick={(e) => {
                        e.preventDefault();
                        window.open('https://console.anthropic.com/', '_blank');
                    }}
                >
                    Anthropic Console
                </a>
            </p>

            <div style={securityNoteStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b8178" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p style={securityTextStyle}>
                    Your API key is encrypted and stored securely using your operating system's keychain. It never leaves your device.
                </p>
            </div>

            <div style={buttonContainerStyle}>
                {isModal && onCancel && (
                    <button
                        style={cancelButtonStyle}
                        onClick={onCancel}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 129, 120, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        Cancel
                    </button>
                )}
                <button
                    style={buttonStyle}
                    onClick={handleSave}
                    disabled={saving}
                    onMouseEnter={(e) => {
                        if (!saving) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #9a8775 0%, #8b7864 100%)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 120, 100, 0.35)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #8b7864 0%, #7a6e5d 100%)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 120, 100, 0.25)';
                    }}
                >
                    {saving ? 'Saving...' : (isModal ? 'Update Key' : 'Get Started')}
                </button>
            </div>
        </div>
    );

    if (isModal) {
        return (
            <div style={containerStyle} onClick={onCancel}>
                {content}
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {content}
        </div>
    );
}
