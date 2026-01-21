import { useState, useEffect, useCallback } from 'react';
import { TabNavigation } from './components/TabNavigation';
import { ChatPage } from './components/ChatPage';
import { ProfileView } from './components/ProfileView';
import { AdminPage } from './components/AdminPage';
import { ConversationSidebar, type ConversationListItem } from './components/ConversationSidebar';
import type { TabId } from './components/TabNavigation';

const SIDEBAR_COLLAPSED_KEY = 'know-thyself:sidebar-collapsed';

export default function App() {
    const [activeTab, setActiveTab] = useState<TabId>('chat');

    // Conversation state
    const [conversations, setConversations] = useState<ConversationListItem[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        return stored === 'true';
    });
    const [searchQuery, setSearchQuery] = useState('');

    // Admin tab only shows when window.api.admin exists (debug mode)
    const showAdminTab = !!window.api.admin;

    // Load conversations on mount
    useEffect(() => {
        const loadConversations = async () => {
            try {
                const list = await window.api.conversations.list() as ConversationListItem[];
                setConversations(list);

                // If no active conversation, select the most recent one or create new
                if (!activeConversationId && list.length > 0) {
                    setActiveConversationId(list[0].id);
                }
            } catch (err) {
                console.error('Failed to load conversations:', err);
            }
        };
        loadConversations();
    }, []);

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

    // Persist sidebar state
    useEffect(() => {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    // Handler: Create new conversation
    const handleNewConversation = useCallback(async () => {
        try {
            const newConv = await window.api.conversations.create() as ConversationListItem;
            setConversations(prev => [{ ...newConv, message_count: 0, preview: null }, ...prev]);
            setActiveConversationId(newConv.id);
            setActiveTab('chat');
        } catch (err) {
            console.error('Failed to create conversation:', err);
        }
    }, []);

    // Handler: Select conversation
    const handleSelectConversation = useCallback((id: string) => {
        setActiveConversationId(id);
        setActiveTab('chat');
    }, []);

    // Handler: Toggle sidebar
    const handleToggleSidebar = useCallback(() => {
        setSidebarCollapsed(prev => !prev);
    }, []);

    // Handler: Search conversations
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    // Handler: Update conversation title
    const handleUpdateTitle = useCallback(async (id: string, title: string) => {
        try {
            await window.api.conversations.updateTitle(id, title);
            setConversations(prev =>
                prev.map(c => c.id === id ? { ...c, title } : c)
            );
        } catch (err) {
            console.error('Failed to update title:', err);
        }
    }, []);

    // Handler: Delete conversation
    const handleDeleteConversation = useCallback(async (id: string) => {
        try {
            await window.api.conversations.delete(id);
            setConversations(prev => prev.filter(c => c.id !== id));

            // If deleted conversation was active, select another
            if (activeConversationId === id) {
                const remaining = conversations.filter(c => c.id !== id);
                if (remaining.length > 0) {
                    setActiveConversationId(remaining[0].id);
                } else {
                    setActiveConversationId(null);
                }
            }
        } catch (err) {
            console.error('Failed to delete conversation:', err);
        }
    }, [activeConversationId, conversations]);

    // Handler: Conversation updated from ChatPage (new title, etc.)
    const handleConversationUpdated = useCallback((conversationId: string, title?: string) => {
        if (title) {
            setConversations(prev =>
                prev.map(c => c.id === conversationId ? { ...c, title } : c)
            );
        }
        // Refresh the conversation list to get updated preview/message count
        window.api.conversations.list().then((list) => {
            setConversations(list as ConversationListItem[]);
        });
    }, []);

    // Determine background color based on active tab
    const getBackgroundColor = () => {
        switch (activeTab) {
            case 'admin':
                return '#0a0e14';
            case 'profile':
                return '#faf8f5';
            default:
                return '#faf8f5';
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
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Conversation Sidebar - only show on chat tab */}
                {activeTab === 'chat' && (
                    <ConversationSidebar
                        conversations={conversations}
                        activeId={activeConversationId}
                        collapsed={sidebarCollapsed}
                        searchQuery={searchQuery}
                        onSelect={handleSelectConversation}
                        onNew={handleNewConversation}
                        onToggle={handleToggleSidebar}
                        onSearch={handleSearch}
                        onUpdateTitle={handleUpdateTitle}
                        onDelete={handleDeleteConversation}
                    />
                )}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    {activeTab === 'chat' && (
                        <ChatPage
                            conversationId={activeConversationId}
                            onConversationUpdated={handleConversationUpdated}
                        />
                    )}
                    {activeTab === 'profile' && <ProfileView />}
                    {activeTab === 'admin' && <AdminPage />}
                </div>
            </div>
        </div>
    );
}
