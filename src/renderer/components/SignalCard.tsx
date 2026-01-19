import { useState } from 'react';
import type { AdminSignal } from '../../shared/types';
import { EvidenceList } from './EvidenceList';
import { ConfidenceBadge } from './ConfidenceBadge';
import {
    formatDimensionName,
    getConfidenceLevel,
    formatRelativeTime,
} from '../utils/signalUtils';
import {
    createSignalCardStyles,
    buttonStyle,
    adminColors,
} from '../styles/adminStyles';

interface SignalCardProps {
    signal: AdminSignal;
}

export function SignalCard({ signal }: SignalCardProps) {
    const [showEvidence, setShowEvidence] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const styles = createSignalCardStyles(signal.confidence);
    const confidenceLevel = getConfidenceLevel(signal.confidence);

    const cardStyle: React.CSSProperties = {
        ...styles.card,
        boxShadow: isHovered
            ? `0 0 0 1px ${adminColors.accentDim}, 0 4px 24px -4px rgba(0, 217, 255, 0.2)`
            : 'none',
    };

    return (
        <div
            style={cardStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={styles.dimension}>
                    {formatDimensionName(signal.dimension)}
                </div>
                <ConfidenceBadge confidence={signal.confidence} level={confidenceLevel} />
            </div>

            <div style={styles.value}>{signal.value}</div>

            <div style={styles.confidenceBar}>
                <div style={styles.confidenceFill} />
            </div>

            <div style={styles.footer}>
                <span>{formatRelativeTime(signal.last_updated)}</span>
                {signal.evidence_count > 0 && (
                    <button
                        style={{
                            ...buttonStyle,
                            borderColor: isHovered ? adminColors.accent : adminColors.border,
                            color: isHovered ? adminColors.accent : adminColors.textSecondary,
                        }}
                        onClick={() => setShowEvidence(!showEvidence)}
                    >
                        {showEvidence ? 'Hide' : 'Show'} Evidence ({signal.evidence_count})
                    </button>
                )}
            </div>

            {showEvidence && signal.evidence_count > 0 && (
                <EvidenceList dimension={signal.dimension} />
            )}
        </div>
    );
}
