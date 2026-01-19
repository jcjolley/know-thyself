interface TabNavigationProps {
    activeTab: 'chat' | 'admin';
    onTabChange: (tab: 'chat' | 'admin') => void;
    showAdminTab: boolean;
}

type TabId = 'chat' | 'admin';

function getTabButtonStyle(isActive: boolean): React.CSSProperties {
    return {
        padding: '12px 20px',
        background: 'transparent',
        border: 'none',
        borderBottom: isActive ? '2px solid #00d9ff' : '2px solid transparent',
        color: isActive ? '#e6edf3' : '#7d8590',
        cursor: 'pointer',
        fontSize: 14,
        fontFamily: 'inherit',
        fontWeight: 500,
        transition: 'color 0.15s, border-color 0.15s',
    };
}

export function TabNavigation({ activeTab, onTabChange, showAdminTab }: TabNavigationProps) {
    if (!showAdminTab) return null;

    const tabs: { id: TabId; label: string }[] = [
        { id: 'chat', label: 'Chat' },
        { id: 'admin', label: 'Profile Admin' },
    ];

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
                        style={getTabButtonStyle(activeTab === tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
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
        </div>
    );
}
