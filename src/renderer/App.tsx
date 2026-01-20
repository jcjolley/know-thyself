import { useState, useEffect, useCallback } from 'react';
import { TabNavigation } from './components/TabNavigation';
import { ChatPage } from './components/ChatPage';
import { ProfileView } from './components/ProfileView';
import { AdminPage } from './components/AdminPage';
import type { TabId } from './components/TabNavigation';

export default function App() {
    const [activeTab, setActiveTab] = useState<TabId>('chat');

    // Admin tab only shows when window.api.admin exists (debug mode)
    const showAdminTab = !!window.api.admin;

    // Keyboard shortcut: Ctrl/Cmd+P for profile
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            setActiveTab(prev => prev === 'profile' ? 'chat' : 'profile');
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Determine background color based on active tab
    const getBackgroundColor = () => {
        switch (activeTab) {
            case 'admin':
                return '#0a0e14';
            case 'profile':
                return '#faf8f5';
            default:
                return '#fff';
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: getBackgroundColor(),
        }}>
            <TabNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showAdminTab={showAdminTab}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {activeTab === 'chat' && <ChatPage />}
                {activeTab === 'profile' && <ProfileView />}
                {activeTab === 'admin' && <AdminPage />}
            </div>
        </div>
    );
}
