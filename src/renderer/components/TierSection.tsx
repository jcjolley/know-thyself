import { useState } from 'react';
import type { AdminSignal } from '../../shared/types';
import { SignalCard } from './SignalCard';
import { createTierSectionStyles, gridStyle, emptyStateStyle, adminColors } from '../styles/adminStyles';

interface TierSectionProps {
    tier: number;
    name: string;
    description: string;
    signals: AdminSignal[];
    defaultExpanded: boolean;
}

export function TierSection({ tier, name, description, signals, defaultExpanded }: TierSectionProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const styles = createTierSectionStyles(tier, expanded);

    const signalCount = signals.length;

    return (
        <div style={styles.container}>
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
                        TIER {tier}: {name}
                    </span>
                    <span style={styles.description}>{description}</span>
                </div>
                <span style={styles.count}>
                    {signalCount} signal{signalCount !== 1 ? 's' : ''}
                </span>
            </div>

            <div style={styles.content}>
                {signalCount === 0 ? (
                    <div style={emptyStateStyle}>
                        <div style={{ marginBottom: 8, fontSize: 20, opacity: 0.3 }}>◇ ◇ ◇</div>
                        <div>No signals detected in this tier</div>
                        <div style={{ marginTop: 4, fontSize: 12 }}>
                            Start a conversation to generate insights
                        </div>
                    </div>
                ) : (
                    <div style={gridStyle}>
                        {signals.map((signal) => (
                            <SignalCard key={signal.id} signal={signal} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
