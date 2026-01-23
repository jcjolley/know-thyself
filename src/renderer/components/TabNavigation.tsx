import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface TabNavigationProps {
    activeTab: 'chat' | 'journeys' | 'profile' | 'admin';
    onTabChange: (tab: 'chat' | 'journeys' | 'profile' | 'admin') => void;
    showAdminTab: boolean;
    onSettingsClick?: () => void;
}

export type TabId = 'chat' | 'journeys' | 'profile' | 'admin';

export function TabNavigation({ activeTab, onTabChange, showAdminTab, onSettingsClick }: TabNavigationProps) {
    const { theme, isDark } = useTheme();
    const [hoveredTab, setHoveredTab] = useState<TabId | null>(null);

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        {
            id: 'chat',
            label: 'Reflect',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            ),
        },
        {
            id: 'journeys',
            label: 'Journeys',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
            ),
        },
        {
            id: 'profile',
            label: 'Self-Portrait',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            ),
        },
    ];

    // Add admin tab only in debug mode
    if (showAdminTab) {
        tabs.push({
            id: 'admin',
            label: 'Admin',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
            ),
        });
    }

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isDark ? theme.colors.background : '#3d3630',
        padding: '0 24px',
        height: 56,
        boxShadow: isDark ? `0 2px 8px ${theme.colors.shadow}` : '0 2px 8px rgba(61, 54, 48, 0.15)',
        position: 'relative',
        borderBottom: isDark ? `1px solid ${theme.colors.border}` : 'none',
    };

    const tabsContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: '100%',
    };

    const getTabStyle = (tabId: TabId): React.CSSProperties => {
        const isActive = activeTab === tabId;
        const isHovered = hoveredTab === tabId;
        const accentColor = theme.colors.accent;
        const accentDarker = isDark ? '#c4956a' : '#b8875c';

        return {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 20px',
            background: isActive
                ? `linear-gradient(135deg, ${accentColor} 0%, ${accentDarker} 100%)`
                : isHovered
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'transparent',
            border: 'none',
            borderRadius: 10,
            color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 15,
            fontWeight: isActive ? 500 : 400,
            letterSpacing: '0.02em',
            transition: 'all 0.25s ease',
            boxShadow: isActive ? `0 2px 8px ${theme.colors.accentSoft}` : 'none',
            transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
        };
    };

    const settingsButtonStyle: React.CSSProperties = {
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: 10,
        cursor: 'pointer',
        color: 'rgba(255, 255, 255, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        transition: 'all 0.2s ease',
    };

    const debugBadgeStyle: React.CSSProperties = {
        padding: '5px 12px',
        background: 'rgba(196, 90, 74, 0.2)',
        color: '#ff9a8a',
        fontSize: 10,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 600,
        borderRadius: 6,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        border: '1px solid rgba(196, 90, 74, 0.3)',
    };

    const logoStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginRight: 32,
        color: 'rgba(255, 255, 255, 0.9)',
    };

    return (
        <nav style={containerStyle}>
            {/* Left side: Logo + Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                {/* App identity */}
                <div style={logoStyle}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: theme.colors.accent }}>
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                    <span style={{
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: 16,
                        fontWeight: 400,
                        letterSpacing: '0.03em',
                    }}>
                        Know Thyself
                    </span>
                </div>

                {/* Separator */}
                <div style={{
                    width: 1,
                    height: 24,
                    background: 'rgba(255, 255, 255, 0.15)',
                    marginRight: 24,
                }} />

                {/* Tabs */}
                <div style={tabsContainerStyle}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            onMouseEnter={() => setHoveredTab(tab.id)}
                            onMouseLeave={() => setHoveredTab(null)}
                            style={getTabStyle(tab.id)}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                opacity: activeTab === tab.id ? 1 : 0.8,
                                transition: 'opacity 0.2s ease',
                            }}>
                                {tab.icon}
                            </span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right side: Debug badge + Settings */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {showAdminTab && (
                    <span style={debugBadgeStyle}>
                        Debug
                    </span>
                )}
                {onSettingsClick && (
                    <button
                        onClick={onSettingsClick}
                        style={settingsButtonStyle}
                        title="Settings"
                        aria-label="Settings"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </button>
                )}
            </div>
        </nav>
    );
}
