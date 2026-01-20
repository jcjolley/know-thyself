interface TabNavigationProps {
    activeTab: 'chat' | 'profile' | 'admin';
    onTabChange: (tab: 'chat' | 'profile' | 'admin') => void;
    showAdminTab: boolean;
}

export type TabId = 'chat' | 'profile' | 'admin';

function getTabButtonStyle(isActive: boolean, isProfileTab: boolean = false): React.CSSProperties {
    // Profile tab uses warm accent color, others use blue
    const activeColor = isProfileTab ? '#c4956a' : '#00d9ff';
    return {
        padding: '12px 20px',
        background: 'transparent',
        border: 'none',
        borderBottom: isActive ? `2px solid ${activeColor}` : '2px solid transparent',
        color: isActive ? '#e6edf3' : '#7d8590',
        cursor: 'pointer',
        fontSize: 14,
        fontFamily: 'inherit',
        fontWeight: 500,
        transition: 'color 0.15s, border-color 0.15s',
    };
}

export function TabNavigation({ activeTab, onTabChange, showAdminTab }: TabNavigationProps) {
    const tabs: { id: TabId; label: string }[] = [
        { id: 'chat', label: 'Chat' },
        { id: 'profile', label: 'Your Self-Portrait' },
    ];

    // Add admin tab only in debug mode
    if (showAdminTab) {
        tabs.push({ id: 'admin', label: 'Admin' });
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #2a3545',
            background: '#0a0e14',
            padding: '0 16px',
            marginBottom: 0,
        }}>
            <div style={{ display: 'flex', gap: 0 }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        style={getTabButtonStyle(activeTab === tab.id, tab.id === 'profile')}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {showAdminTab && (
                <span style={{
                    padding: '4px 8px',
                    background: '#5c2525',
                    color: '#ff6b6b',
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: 3,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}>
                    DEBUG MODE
                </span>
            )}
        </div>
    );
}
