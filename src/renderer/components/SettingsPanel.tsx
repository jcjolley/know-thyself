import React, { useState, useEffect, useCallback } from 'react';
import { ApiKeySetup } from './ApiKeySetup';
import { BackendSettings } from './BackendSettings';
import type { ApiKeyStatus, LLMConfig } from '../../shared/types';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';

interface SettingsPanelProps {
    onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
    const { theme, isDark, mode, setMode } = useTheme();
    const [status, setStatus] = useState<ApiKeyStatus | null>(null);
    const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Load status on mount
    useEffect(() => {
        window.api.apiKey.getStatus().then(setStatus);
        window.api.llm.getConfig().then(setLlmConfig);
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    // Refresh LLM config when backend changes
    const handleBackendConfigChange = useCallback(() => {
        window.api.llm.getConfig().then(setLlmConfig);
    }, []);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !showUpdateModal) {
                handleClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showUpdateModal]);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        setTimeout(onClose, 150);
    }, [onClose]);

    const handleClearKey = useCallback(async () => {
        if (confirm('Are you sure you want to remove your API key? You will need to enter it again to use the app.')) {
            await window.api.apiKey.clear();
            setStatus(await window.api.apiKey.getStatus());
        }
    }, []);

    const handleUpdateComplete = useCallback(async () => {
        setShowUpdateModal(false);
        setStatus(await window.api.apiKey.getStatus());
    }, []);

    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        background: isDark ? 'rgba(10, 8, 6, 0.7)' : 'rgba(61, 54, 48, 0.4)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 150ms ease',
    };

    const panelStyle: React.CSSProperties = {
        background: isDark
            ? `linear-gradient(180deg, ${theme.colors.surface} 0%, ${theme.colors.background} 100%)`
            : 'linear-gradient(180deg, #fdfcfb 0%, #f8f5f0 100%)',
        borderRadius: 16,
        boxShadow: isDark
            ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.3)'
            : '0 20px 40px rgba(61, 54, 48, 0.2), 0 8px 16px rgba(61, 54, 48, 0.1)',
        width: 400,
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        border: `1px solid ${theme.colors.border}`,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: `1px solid ${theme.colors.border}`,
    };

    const titleStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 20,
        fontWeight: 400,
        color: theme.colors.textPrimary,
        margin: 0,
    };

    const closeButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        padding: 8,
        cursor: 'pointer',
        color: theme.colors.textMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        transition: 'background 150ms ease',
    };

    const contentStyle: React.CSSProperties = {
        padding: 24,
    };

    const sectionStyle: React.CSSProperties = {
        marginBottom: 24,
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        fontWeight: 600,
        color: theme.colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 12,
    };

    const cardStyle: React.CSSProperties = {
        background: isDark ? theme.colors.surfaceHover : '#fff',
        borderRadius: 10,
        border: `1px solid ${theme.colors.border}`,
        padding: 16,
    };

    const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    };

    const labelStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        color: theme.colors.textPrimary,
        fontWeight: 500,
    };

    const valueStyle: React.CSSProperties = {
        fontFamily: 'monospace',
        fontSize: 14,
        color: theme.colors.textSecondary,
    };

    const statusBadgeStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        fontWeight: 500,
    };

    const getStatusBadge = () => {
        if (!status) return null;

        if (status.source === 'env') {
            return (
                <span style={{ ...statusBadgeStyle, background: 'rgba(139, 120, 100, 0.1)', color: '#7a6e5d' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Environment Variable
                </span>
            );
        }

        if (status.source === 'stored') {
            return (
                <span style={{ ...statusBadgeStyle, background: 'rgba(76, 139, 87, 0.1)', color: '#4c8b57' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Stored Securely
                </span>
            );
        }

        return (
            <span style={{ ...statusBadgeStyle, background: 'rgba(196, 90, 74, 0.1)', color: '#c45a4a' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Not Configured
            </span>
        );
    };

    const buttonBaseStyle: React.CSSProperties = {
        padding: '8px 14px',
        borderRadius: 6,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 150ms ease',
    };

    const primaryButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        background: isDark
            ? `linear-gradient(135deg, ${theme.colors.accent} 0%, #a07850 100%)`
            : 'linear-gradient(135deg, #8b7864 0%, #7a6e5d 100%)',
        border: 'none',
        color: '#fff',
    };

    const dangerButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        background: 'transparent',
        border: `1px solid ${isDark ? 'rgba(196, 90, 74, 0.4)' : 'rgba(196, 90, 74, 0.3)'}`,
        color: theme.colors.error,
    };

    const helpTextStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 12,
        lineHeight: 1.5,
    };

    // Theme toggle styles
    const themeToggleContainerStyle: React.CSSProperties = {
        display: 'flex',
        background: isDark ? theme.colors.background : 'rgba(139, 129, 120, 0.1)',
        borderRadius: 8,
        padding: 4,
        gap: 4,
    };

    const themeOptionStyle = (isActive: boolean): React.CSSProperties => ({
        flex: 1,
        padding: '8px 12px',
        border: 'none',
        borderRadius: 6,
        background: isActive
            ? isDark ? theme.colors.surface : '#fff'
            : 'transparent',
        color: isActive ? theme.colors.textPrimary : theme.colors.textMuted,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        fontWeight: isActive ? 500 : 400,
        cursor: 'pointer',
        transition: 'all 150ms ease',
        boxShadow: isActive
            ? isDark
                ? '0 2px 4px rgba(0, 0, 0, 0.3)'
                : '0 1px 3px rgba(0, 0, 0, 0.1)'
            : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    });

    const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
        {
            mode: 'light',
            label: 'Light',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
            ),
        },
        {
            mode: 'dark',
            label: 'Dark',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            ),
        },
        {
            mode: 'system',
            label: 'System',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
            ),
        },
    ];

    return (
        <>
            <div style={overlayStyle} onClick={handleClose}>
                <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
                    <div style={headerStyle}>
                        <h2 style={titleStyle}>Settings</h2>
                        <button
                            style={closeButtonStyle}
                            onClick={handleClose}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(139, 129, 120, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <div style={contentStyle}>
                        {/* AI Backend Section - Always show first */}
                        <div style={sectionStyle}>
                            <div style={sectionTitleStyle}>AI Backend</div>
                            <BackendSettings onConfigChange={handleBackendConfigChange} />
                        </div>

                        {/* API Key Section - Only show when Claude is selected */}
                        {llmConfig?.backend === 'claude' && (
                        <div style={sectionStyle}>
                            <div style={sectionTitleStyle}>API Key</div>
                            <div style={cardStyle}>
                                <div style={rowStyle}>
                                    <span style={labelStyle}>Status</span>
                                    {getStatusBadge()}
                                </div>

                                {status?.maskedKey && (
                                    <div style={{ ...rowStyle, marginTop: 12 }}>
                                        <span style={labelStyle}>Key</span>
                                        <span style={valueStyle}>{status.maskedKey}</span>
                                    </div>
                                )}

                                {!status?.encryptionAvailable && status?.hasKey && (
                                    <p style={{ ...helpTextStyle, color: '#c45a4a' }}>
                                        Warning: Your system does not support secure storage. The key is stored with reduced security.
                                    </p>
                                )}

                                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                    {status?.source === 'env' ? (
                                        <p style={helpTextStyle}>
                                            API key is set via environment variable. Remove it from your environment to use a stored key.
                                        </p>
                                    ) : (
                                        <>
                                            <button
                                                style={primaryButtonStyle}
                                                onClick={() => setShowUpdateModal(true)}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'linear-gradient(135deg, #9a8775 0%, #8b7864 100%)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'linear-gradient(135deg, #8b7864 0%, #7a6e5d 100%)';
                                                }}
                                            >
                                                {status?.hasKey ? 'Update Key' : 'Add Key'}
                                            </button>
                                            {status?.hasKey && (
                                                <button
                                                    style={dangerButtonStyle}
                                                    onClick={handleClearKey}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(196, 90, 74, 0.08)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                    }}
                                                >
                                                    Remove Key
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        )}

                        <div style={sectionStyle}>
                            <div style={sectionTitleStyle}>Appearance</div>
                            <div style={cardStyle}>
                                <div style={{ ...rowStyle, marginBottom: 12 }}>
                                    <span style={labelStyle}>Theme</span>
                                </div>
                                <div style={themeToggleContainerStyle} data-testid="theme-toggle">
                                    {themeOptions.map((option) => (
                                        <button
                                            key={option.mode}
                                            style={themeOptionStyle(mode === option.mode)}
                                            onClick={() => setMode(option.mode)}
                                            data-testid={`theme-option-${option.mode}`}
                                        >
                                            {option.icon}
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                <p style={helpTextStyle}>
                                    Choose light or dark mode, or let the app follow your system preference.
                                </p>
                            </div>
                        </div>

                        <div style={sectionStyle}>
                            <div style={sectionTitleStyle}>About</div>
                            <div style={cardStyle}>
                                <div style={rowStyle}>
                                    <span style={labelStyle}>Version</span>
                                    <span style={valueStyle}>0.1.0</span>
                                </div>
                                <p style={helpTextStyle}>
                                    Know Thyself is an AI-guided self-reflection app that helps you understand yourself better through conversation.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showUpdateModal && (
                <ApiKeySetup
                    isModal
                    onComplete={handleUpdateComplete}
                    onCancel={() => setShowUpdateModal(false)}
                />
            )}
        </>
    );
}
