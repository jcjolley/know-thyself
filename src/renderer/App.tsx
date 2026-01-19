import { useState } from 'react';
import { TabNavigation } from './components/TabNavigation';
import { ChatPage } from './components/ChatPage';
import { AdminPage } from './components/AdminPage';

export default function App() {
    const [activeTab, setActiveTab] = useState<'chat' | 'admin'>('chat');

    // Admin tab only shows when window.api.admin exists (debug mode)
    const showAdminTab = !!window.api.admin;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: activeTab === 'admin' ? '#0a0e14' : '#fff',
        }}>
            <TabNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showAdminTab={showAdminTab}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {activeTab === 'chat' ? <ChatPage /> : <AdminPage />}
            </div>
        </div>
    );
}
