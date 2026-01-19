import { useState, useEffect } from 'react';
import type { AdminProfileData } from '../../shared/types';
import { TierSection } from './TierSection';
import { LegacyDataSection } from './LegacyDataSection';
import { groupSignalsByTier, TIER_INFO } from '../utils/signalUtils';
import {
    baseContainerStyle,
    pageContainerStyle,
    loadingStyle,
    errorStyle,
} from '../styles/adminStyles';

export function AdminPage() {
    const [data, setData] = useState<AdminProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const profile = await window.api.admin?.getProfile();
            if (profile) {
                setData(profile as AdminProfileData);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profile data');
        } finally {
            setLoading(false);
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

    return (
        <div style={baseContainerStyle}>
            <div style={pageContainerStyle}>
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
            </div>
        </div>
    );
}
