import { useState, useEffect, useCallback } from "react";
import { TabNavigation } from "./components/TabNavigation";
import { ChatPage } from "./components/ChatPage";
import { ProfileView } from "./components/ProfileView";
import { AdminPage } from "./components/AdminPage";
import { JourneysPage } from "./components/JourneysPage";
import { ApiKeySetup } from "./components/ApiKeySetup";
import { SettingsPanel } from "./components/SettingsPanel";
import {
  ConversationSidebar,
  type ConversationListItem,
} from "./components/ConversationSidebar";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { ApiProvider, useApi } from "./contexts/ApiContext";
import { UserProvider, useUser } from "./contexts/UserContext";
import { CreateUserModal } from "./components/CreateUserModal";
import { MigrationPrompt } from "./components/MigrationPrompt";
import type { TabId } from "./components/TabNavigation";
import type { ApiKeyStatus } from "../shared/types";

const SIDEBAR_COLLAPSED_KEY = "know-thyself:sidebar-collapsed";

function AppContent() {
  const { theme } = useTheme();
  const api = useApi();
  const { users, isLoading: isUserLoading, migrationStatus, hasPendingMigration, claimLegacyData, refreshUsers } = useUser();
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // API Key state
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);

  // Conversation state
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === "true";
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Admin tab only shows when admin API exists (debug mode)
  const showAdminTab = !!(api as unknown as { admin?: unknown }).admin;

  // Check API key status on mount
  useEffect(() => {
    api.apiKey.getStatus().then(setApiKeyStatus);
  }, [api]);

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const list =
          (await api.conversations.list()) as ConversationListItem[];
        setConversations(list);

        // If no active conversation, select the most recent one or create new
        if (!activeConversationId && list.length > 0) {
          setActiveConversationId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      }
    };
    loadConversations();
  }, [api]);

  // Keyboard shortcut: Ctrl/Cmd+P for profile
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "p") {
      e.preventDefault();
      setActiveTab((prev) => (prev === "profile" ? "chat" : "profile"));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Handler: Create new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      const newConv =
        (await api.conversations.create()) as ConversationListItem;
      setConversations((prev) => [
        { ...newConv, message_count: 0, preview: null },
        ...prev,
      ]);
      setActiveConversationId(newConv.id);
      setActiveTab("chat");
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [api]);

  // Handler: Select conversation
  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setActiveTab("chat");
  }, []);

  // Handler: Toggle sidebar
  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Handler: Search conversations
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handler: Update conversation title
  const handleUpdateTitle = useCallback(async (id: string, title: string) => {
    try {
      await api.conversations.updateTitle(id, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c)),
      );
    } catch (err) {
      console.error("Failed to update title:", err);
    }
  }, [api]);

  // Handler: Delete conversation
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await api.conversations.delete(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));

        // If deleted conversation was active, select another
        if (activeConversationId === id) {
          const remaining = conversations.filter((c) => c.id !== id);
          if (remaining.length > 0) {
            setActiveConversationId(remaining[0].id);
          } else {
            setActiveConversationId(null);
          }
        }
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    },
    [api, activeConversationId, conversations],
  );

  // Handler: Conversation updated from ChatPage (new title, etc.)
  const handleConversationUpdated = useCallback(
    (conversationId: string, title?: string) => {
      if (title) {
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title } : c)),
        );
      }
      // Refresh the conversation list to get updated preview/message count
      api.conversations.list().then((list) => {
        setConversations(list as ConversationListItem[]);
      });
    },
    [api],
  );

  // Handler: Open settings
  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  // Handler: Start a journey
  const handleStartJourney = useCallback(async (journeyId: string) => {
    try {
      const result = await api.journeys.start(journeyId) as { conversationId: string; title: string; journeyId: string };

      // Add the new conversation to the list
      const newConv = {
        id: result.conversationId,
        title: result.title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        preview: null,
        journey_id: result.journeyId,
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(result.conversationId);
      setActiveTab("chat");
    } catch (err) {
      console.error("Failed to start journey:", err);
    }
  }, [api]);

  // Handler: API key setup complete
  const handleApiKeySetupComplete = useCallback(() => {
    api.apiKey.getStatus().then(setApiKeyStatus);
  }, [api]);

  // Handler: Create user complete
  const handleCreateUserComplete = useCallback(async (_userId: string) => {
    setShowCreateUser(false);
    await refreshUsers();
    // Check if there's pending migration data
    if (hasPendingMigration) {
      setShowMigrationPrompt(true);
    }
  }, [refreshUsers, hasPendingMigration]);

  // Handler: Add profile from user switcher
  const handleAddProfile = useCallback(() => {
    setShowCreateUser(true);
  }, []);

  // Handler: Claim migration data
  const handleClaimMigration = useCallback(async () => {
    await claimLegacyData();
    setShowMigrationPrompt(false);
    // Reload the page to refresh all data
    window.location.reload();
  }, [claimLegacyData]);

  // Handler: Skip migration (start fresh)
  const handleSkipMigration = useCallback(() => {
    setShowMigrationPrompt(false);
  }, []);

  // Determine background color based on active tab
  const getBackgroundColor = () => {
    switch (activeTab) {
      case "admin":
        return "#0a0e14"; // Admin has its own dark theme
      default:
        return theme.colors.background;
    }
  };

  // Show loading state while checking API key or users
  if (apiKeyStatus === null || isUserLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: theme.colors.background,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: theme.colors.textMuted,
        }}
      >
        Loading...
      </div>
    );
  }

  // Show setup screen if no API key is configured
  if (!apiKeyStatus.hasKey) {
    return <ApiKeySetup onComplete={handleApiKeySetupComplete} />;
  }

  // Show create user screen if no users exist (fresh install)
  if (users.length === 0) {
    return (
      <CreateUserModal
        isFullScreen
        onComplete={handleCreateUserComplete}
      />
    );
  }

  // Show migration prompt if user just created and there's pending data
  if (showMigrationPrompt && migrationStatus) {
    return (
      <MigrationPrompt
        migrationStatus={migrationStatus}
        onClaimData={handleClaimMigration}
        onStartFresh={handleSkipMigration}
      />
    );
  }

  // Show create user modal (adding additional profile)
  if (showCreateUser) {
    return (
      <CreateUserModal
        onComplete={handleCreateUserComplete}
        onCancel={() => setShowCreateUser(false)}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: getBackgroundColor(),
      }}
    >
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showAdminTab={showAdminTab}
        onSettingsClick={handleOpenSettings}
        onAddProfile={handleAddProfile}
        showUserSwitcher={users.length > 0}
      />
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Conversation Sidebar - only show on chat tab */}
        {activeTab === "chat" && (
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
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeTab === "chat" && (
            <ChatPage
              conversationId={activeConversationId}
              onConversationUpdated={handleConversationUpdated}
            />
          )}
          {activeTab === "journeys" && <JourneysPage onStartJourney={handleStartJourney} />}
          {activeTab === "profile" && <ProfileView />}
          {activeTab === "admin" && <AdminPage />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ApiProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </ApiProvider>
    </ThemeProvider>
  );
}
