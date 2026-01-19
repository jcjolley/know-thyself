import { useState } from 'react';
import type { Value, Challenge, Goal, MaslowSignal } from '../../shared/types';
import {
    adminColors,
    createTierSectionStyles,
    createSignalCardStyles,
    gridStyle,
    emptyStateStyle,
} from '../styles/adminStyles';
import { formatRelativeTime } from '../utils/signalUtils';

function getChallengeStatusStyle(status: string): { background: string; color: string } {
    switch (status) {
        case 'active':
            return { background: 'rgba(255, 107, 107, 0.2)', color: adminColors.tier1 };
        case 'resolved':
            return { background: 'rgba(0, 255, 157, 0.2)', color: adminColors.confidenceHigh };
        default:
            return { background: 'rgba(255, 179, 0, 0.2)', color: adminColors.confidenceMedium };
    }
}

function getGoalStatusStyle(status: string): { background: string; color: string } {
    switch (status) {
        case 'achieved':
            return { background: 'rgba(0, 255, 157, 0.2)', color: adminColors.confidenceHigh };
        case 'in_progress':
            return { background: 'rgba(0, 217, 255, 0.2)', color: adminColors.accent };
        default:
            return { background: 'rgba(255, 255, 255, 0.1)', color: adminColors.textSecondary };
    }
}

function getSignalTypeStyle(signalType: string): { background: string; color: string } {
    if (signalType === 'concern') {
        return { background: 'rgba(255, 107, 107, 0.2)', color: adminColors.tier1 };
    }
    return { background: 'rgba(0, 255, 157, 0.2)', color: adminColors.confidenceHigh };
}

interface LegacyDataSectionProps {
    values: Value[];
    challenges: Challenge[];
    goals: Goal[];
    maslowSignals: MaslowSignal[];
}

type LegacyTab = 'values' | 'challenges' | 'goals' | 'maslow';

export function LegacyDataSection({ values, challenges, goals, maslowSignals }: LegacyDataSectionProps) {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<LegacyTab>('values');
    const styles = createTierSectionStyles(0, expanded);

    const totalCount = values.length + challenges.length + goals.length + maslowSignals.length;

    const tabStyle = (isActive: boolean): React.CSSProperties => ({
        padding: '8px 16px',
        background: isActive ? adminColors.surfaceElevated : 'transparent',
        border: 'none',
        borderBottom: isActive ? `2px solid ${adminColors.accent}` : '2px solid transparent',
        color: isActive ? adminColors.textPrimary : adminColors.textSecondary,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 500,
    });

    return (
        <div style={{
            ...styles.container,
            borderLeftColor: adminColors.textMuted,
        }}>
            <div
                style={styles.header}
                onClick={() => setExpanded(!expanded)}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = adminColors.surfaceElevated;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={styles.chevron}>▶</span>
                    <span style={{ ...styles.title, marginLeft: 12 }}>
                        LEGACY DATA
                    </span>
                    <span style={styles.description}>Original profile tables</span>
                </div>
                <span style={styles.count}>
                    {totalCount} item{totalCount !== 1 ? 's' : ''}
                </span>
            </div>

            <div style={styles.content}>
                {/* Sub-tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: `1px solid ${adminColors.border}`,
                    marginBottom: 16,
                }}>
                    <button style={tabStyle(activeTab === 'values')} onClick={() => setActiveTab('values')}>
                        Values ({values.length})
                    </button>
                    <button style={tabStyle(activeTab === 'challenges')} onClick={() => setActiveTab('challenges')}>
                        Challenges ({challenges.length})
                    </button>
                    <button style={tabStyle(activeTab === 'goals')} onClick={() => setActiveTab('goals')}>
                        Goals ({goals.length})
                    </button>
                    <button style={tabStyle(activeTab === 'maslow')} onClick={() => setActiveTab('maslow')}>
                        Maslow ({maslowSignals.length})
                    </button>
                </div>

                {/* Tab content */}
                {activeTab === 'values' && <ValuesTab values={values} />}
                {activeTab === 'challenges' && <ChallengesTab challenges={challenges} />}
                {activeTab === 'goals' && <GoalsTab goals={goals} />}
                {activeTab === 'maslow' && <MaslowTab signals={maslowSignals} />}
            </div>
        </div>
    );
}

function ValuesTab({ values }: { values: Value[] }) {
    if (values.length === 0) return <EmptyTab message="No values detected yet" />;

    return (
        <div style={gridStyle}>
            {values.map((value) => {
                const styles = createSignalCardStyles(value.confidence);
                return (
                    <div key={value.id} style={styles.card}>
                        <div style={styles.dimension}>{value.name}</div>
                        <div style={{ ...styles.value, fontSize: 14 }}>
                            {value.description || 'No description'}
                        </div>
                        <div style={{ fontSize: 11, color: adminColors.textMuted, marginBottom: 8 }}>
                            Type: {value.value_type}
                        </div>
                        <div style={styles.confidenceBar}>
                            <div style={styles.confidenceFill} />
                        </div>
                        <div style={styles.footer}>
                            <span>{formatRelativeTime(value.last_reinforced)}</span>
                            <span>{value.evidence_count} evidence</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ChallengesTab({ challenges }: { challenges: Challenge[] }) {
    if (challenges.length === 0) return <EmptyTab message="No challenges identified yet" />;

    return (
        <div style={gridStyle}>
            {challenges.map((challenge) => {
                const styles = createSignalCardStyles(0.5);
                const statusStyle = getChallengeStatusStyle(challenge.status);
                return (
                    <div key={challenge.id} style={styles.card}>
                        <div style={styles.dimension}>Challenge</div>
                        <div style={{ ...styles.value, fontSize: 14 }}>
                            {challenge.description}
                        </div>
                        <div style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            ...statusStyle,
                            borderRadius: 3,
                            fontSize: 11,
                            marginBottom: 8,
                        }}>
                            {challenge.status}
                        </div>
                        <div style={styles.footer}>
                            <span>Mentioned {challenge.mention_count}x</span>
                            <span>{formatRelativeTime(challenge.last_mentioned || challenge.first_mentioned)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function GoalsTab({ goals }: { goals: Goal[] }) {
    if (goals.length === 0) return <EmptyTab message="No goals stated yet" />;

    return (
        <div style={gridStyle}>
            {goals.map((goal) => {
                const styles = createSignalCardStyles(0.6);
                const statusStyle = getGoalStatusStyle(goal.status);
                return (
                    <div key={goal.id} style={styles.card}>
                        <div style={styles.dimension}>
                            {goal.timeframe ? goal.timeframe.replace('_', ' ') : 'Goal'}
                        </div>
                        <div style={{ ...styles.value, fontSize: 14 }}>
                            {goal.description}
                        </div>
                        <div style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            ...statusStyle,
                            borderRadius: 3,
                            fontSize: 11,
                            marginBottom: 8,
                        }}>
                            {goal.status.replace('_', ' ')}
                        </div>
                        <div style={styles.footer}>
                            <span>First stated {formatRelativeTime(goal.first_stated)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const MASLOW_LEVEL_COLORS: Record<string, string> = {
    physiological: '#ff6b6b',
    safety: '#ffd93d',
    belonging: '#6bcb77',
    esteem: '#4d96ff',
    self_actualization: '#a78bfa',
};

function MaslowTab({ signals }: { signals: MaslowSignal[] }) {
    if (signals.length === 0) return <EmptyTab message="No Maslow signals detected" />;

    return (
        <div style={gridStyle}>
            {signals.map((signal) => {
                const styles = createSignalCardStyles(0.7);
                const color = MASLOW_LEVEL_COLORS[signal.level] || adminColors.accent;
                const signalTypeStyle = getSignalTypeStyle(signal.signal_type);
                return (
                    <div key={signal.id} style={{
                        ...styles.card,
                        borderLeft: `3px solid ${color}`,
                    }}>
                        <div style={{ ...styles.dimension, color }}>
                            {signal.level.replace('_', ' ')}
                        </div>
                        <div style={{ ...styles.value, fontSize: 14 }}>
                            {signal.description || signal.signal_type}
                        </div>
                        <div style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            ...signalTypeStyle,
                            borderRadius: 3,
                            fontSize: 11,
                        }}>
                            {signal.signal_type}
                        </div>
                        <div style={styles.footer}>
                            <span>{formatRelativeTime(signal.created_at)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function EmptyTab({ message }: { message: string }) {
    return (
        <div style={emptyStateStyle}>
            <div style={{ marginBottom: 8, fontSize: 20, opacity: 0.3 }}>◇ ◇ ◇</div>
            <div>{message}</div>
        </div>
    );
}
