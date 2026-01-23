import { useState, useEffect } from 'react';
import type { SignalEvidence } from '../../shared/types';
import {
    evidenceListStyle,
    evidenceItemStyle,
    evidenceQuoteStyle,
    evidenceIdStyle,
    adminColors,
} from '../styles/adminStyles';
import { useApi } from '../contexts/ApiContext';

interface EvidenceListProps {
    dimension: string;
}

export function EvidenceList({ dimension }: EvidenceListProps) {
    const api = useApi();
    const [evidence, setEvidence] = useState<SignalEvidence[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEvidence = async () => {
            try {
                setLoading(true);
                const admin = (api as unknown as { admin?: typeof api.admin }).admin;
                const result = await admin?.getEvidence(dimension);
                if (result) {
                    setEvidence(result as SignalEvidence[]);
                }
            } catch (err) {
                console.error('Failed to load evidence:', err);
            } finally {
                setLoading(false);
            }
        };
        loadEvidence();
    }, [api, dimension]);

    if (loading) {
        return (
            <div style={{ ...evidenceListStyle, color: adminColors.textMuted }}>
                Loading evidence...
            </div>
        );
    }

    if (evidence.length === 0) {
        return (
            <div style={{ ...evidenceListStyle, color: adminColors.textMuted }}>
                No evidence found
            </div>
        );
    }

    return (
        <div style={evidenceListStyle}>
            {evidence.map((item, index) => (
                <div
                    key={item.id}
                    style={{
                        ...evidenceItemStyle,
                        animation: `fadeIn 0.2s ease-out ${index * 50}ms both`,
                    }}
                >
                    <div style={evidenceQuoteStyle}>"{item.quote}"</div>
                    <div style={evidenceIdStyle}>— {item.message_id.slice(0, 8)}</div>
                </div>
            ))}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
