import { useState, useEffect, useCallback } from 'react';
import type { AdminProfileData, ReanalyzeProgress, MessageWithPrompt } from '../../shared/types';
import { TierSection } from './TierSection';
import { LegacyDataSection } from './LegacyDataSection';
import { groupSignalsByTier, TIER_INFO } from '../utils/signalUtils';
import {
    baseContainerStyle,
    pageContainerStyle,
    loadingStyle,
    errorStyle,
    adminColors,
} from '../styles/adminStyles';
import { useApi } from '../contexts/ApiContext';

type AdminTab = 'axes' | 'prompts';

export function AdminPage() {
    const api = useApi();
    const [activeTab, setActiveTab] = useState<AdminTab>('axes');
    const [data, setData] = useState<AdminProfileData | null>(null);
    const [prompts, setPrompts] = useState<MessageWithPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reanalyzeProgress, setReanalyzeProgress] = useState<ReanalyzeProgress | null>(null);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const admin = (api as unknown as { admin?: typeof api.admin }).admin;
            const [profile, promptsData] = await Promise.all([
                admin?.getProfile(),
                admin?.getMessagesWithPrompts(50),
            ]);
            if (profile) {
                setData(profile as AdminProfileData);
            }
            if (promptsData) {
                setPrompts(promptsData as MessageWithPrompt[]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profile data');
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const handleProgress = (progress: ReanalyzeProgress) => {
            setReanalyzeProgress(progress);
            if (progress.status === 'completed') {
                setIsReanalyzing(false);
                loadData();
            } else if (progress.status === 'error') {
                setIsReanalyzing(false);
                setError(progress.error || 'Re-analysis failed');
            }
        };

        const admin = (api as unknown as { admin?: typeof api.admin }).admin;
        admin?.onReanalyzeProgress(handleProgress);

        return () => {
            admin?.removeReanalyzeProgressListener();
        };
    }, [api, loadData]);

    const handleReanalyze = async () => {
        try {
            setIsReanalyzing(true);
            setError(null);
            setReanalyzeProgress(null);
            const admin = (api as unknown as { admin?: typeof api.admin }).admin;
            await admin?.reanalyze();
        } catch (err) {
            setIsReanalyzing(false);
            setError(err instanceof Error ? err.message : 'Re-analysis failed');
        }
    };

    if (loading) {
        return (
            <div style={baseContainerStyle}>
                <div style={loadingStyle}>Loading profile data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={baseContainerStyle}>
                <div style={errorStyle}>{error}</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div style={baseContainerStyle}>
                <div style={loadingStyle}>No data available</div>
            </div>
        );
    }

    const signalsByTier = groupSignalsByTier(data.signals);
    const tiers = [1, 2, 3, 4] as const;

    const getProgressText = () => {
        if (!reanalyzeProgress) return '';
        if (reanalyzeProgress.status === 'started') return 'Starting...';
        if (reanalyzeProgress.status === 'processing') {
            return `Re-analyzing... (${reanalyzeProgress.current}/${reanalyzeProgress.total} messages)`;
        }
        if (reanalyzeProgress.status === 'completed') return 'Completed!';
        return '';
    };

    const reanalyzeButtonStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: adminColors.surfaceElevated,
        border: `1px solid ${adminColors.border}`,
        color: isReanalyzing ? adminColors.textMuted : adminColors.accent,
        padding: '10px 16px',
        borderRadius: 4,
        fontSize: 13,
        fontWeight: 500,
        cursor: isReanalyzing ? 'not-allowed' : 'pointer',
        opacity: isReanalyzing ? 0.7 : 1,
        transition: 'all 0.15s',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    };

    const progressTextStyle: React.CSSProperties = {
        fontSize: 12,
        color: adminColors.textSecondary,
        marginLeft: 12,
    };

    const tabContainerStyle: React.CSSProperties = {
        display: 'flex',
        gap: 0,
        marginBottom: 24,
        borderBottom: `1px solid ${adminColors.border}`,
    };

    const tabStyle = (isActive: boolean): React.CSSProperties => ({
        padding: '12px 20px',
        background: 'transparent',
        border: 'none',
        borderBottom: isActive ? `2px solid ${adminColors.accent}` : '2px solid transparent',
        color: isActive ? adminColors.textPrimary : adminColors.textMuted,
        fontSize: 14,
        fontWeight: isActive ? 600 : 400,
        cursor: 'pointer',
        marginBottom: -1,
    });

    const promptCardStyle: React.CSSProperties = {
        background: adminColors.surfaceElevated,
        border: `1px solid ${adminColors.border}`,
        borderRadius: 6,
        marginBottom: 12,
        overflow: 'hidden',
    };

    const promptHeaderStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        cursor: 'pointer',
    };

    const promptContentStyle: React.CSSProperties = {
        padding: '0 16px 16px',
        fontSize: 12,
        lineHeight: 1.5,
    };

    const promptSectionStyle: React.CSSProperties = {
        marginBottom: 16,
    };

    const promptLabelStyle: React.CSSProperties = {
        color: adminColors.accent,
        fontWeight: 600,
        marginBottom: 8,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    };

    const promptTextStyle: React.CSSProperties = {
        background: adminColors.surface,
        padding: 12,
        borderRadius: 4,
        whiteSpace: 'pre-wrap',
        color: adminColors.textSecondary,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        maxHeight: 300,
        overflow: 'auto',
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    const renderAxesTab = () => (
        <>
            <div style={headerStyle}>
                <button
                    style={reanalyzeButtonStyle}
                    onClick={handleReanalyze}
                    disabled={isReanalyzing}
                    data-testid="reanalyze-button"
                >
                    {isReanalyzing ? (
                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
                    ) : (
                        <span>↻</span>
                    )}
                    Re-analyze Conversation
                </button>
                {isReanalyzing && (
                    <span style={progressTextStyle} data-testid="reanalyze-progress">
                        {getProgressText()}
                    </span>
                )}
            </div>

            {tiers.map((tier) => (
                <TierSection
                    key={tier}
                    tier={tier}
                    name={TIER_INFO[tier].name}
                    description={TIER_INFO[tier].description}
                    signals={signalsByTier[tier]}
                    defaultExpanded={tier <= 2}
                />
            ))}

            <LegacyDataSection
                values={data.values}
                challenges={data.challenges}
                goals={data.goals}
                maslowSignals={data.maslowSignals}
            />
        </>
    );

    const renderPromptsTab = () => (
        <div data-testid="prompts-tab-content">
            {prompts.length === 0 ? (
                <div style={{ color: adminColors.textMuted, textAlign: 'center', padding: 40 }}>
                    No prompts recorded yet. Chat with the assistant to see prompts here.
                </div>
            ) : (
                prompts.map((msg) => (
                    <div key={msg.id} style={promptCardStyle} data-testid="prompt-card">
                        <div
                            style={promptHeaderStyle}
                            onClick={() => setExpandedPromptId(expandedPromptId === msg.id ? null : msg.id)}
                        >
                            <div>
                                <div style={{ fontWeight: 500, color: adminColors.textPrimary, marginBottom: 4 }}>
                                    {msg.content.slice(0, 100)}{msg.content.length > 100 ? '...' : ''}
                                </div>
                                <div style={{ fontSize: 11, color: adminColors.textMuted }}>
                                    {formatDate(msg.created_at)}
                                </div>
                            </div>
                            <span style={{ color: adminColors.textMuted }}>
                                {expandedPromptId === msg.id ? '▼' : '▶'}
                            </span>
                        </div>
                        {expandedPromptId === msg.id && msg.prompt && (
                            <div style={promptContentStyle}>
                                <div style={promptSectionStyle}>
                                    <div style={promptLabelStyle}>Response</div>
                                    <div style={promptTextStyle}>{msg.content}</div>
                                </div>
                                <div style={promptSectionStyle}>
                                    <div style={promptLabelStyle}>Prompt that generated this response</div>
                                    <div style={promptTextStyle}>{msg.prompt}</div>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div style={baseContainerStyle}>
            <div style={pageContainerStyle}>
                <div style={tabContainerStyle}>
                    <button
                        style={tabStyle(activeTab === 'axes')}
                        onClick={() => setActiveTab('axes')}
                        data-testid="axes-tab"
                    >
                        Psychological Axes
                    </button>
                    <button
                        style={tabStyle(activeTab === 'prompts')}
                        onClick={() => setActiveTab('prompts')}
                        data-testid="prompts-tab"
                    >
                        Prompts ({prompts.length})
                    </button>
                </div>

                {activeTab === 'axes' && renderAxesTab()}
                {activeTab === 'prompts' && renderPromptsTab()}
            </div>
        </div>
    );
}
