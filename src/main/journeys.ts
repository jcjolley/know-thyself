/**
 * Journey Registry - loads and manages guided journey data.
 * Parses journey markdown files and extracts system prompts.
 */

import fs from 'fs';
import path from 'path';

// Detect if running in Electron
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;

// Lazy-load Electron app module only when in Electron
function getAppPath(): string | null {
    if (isElectron) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { app } = require('electron');
            return app.getAppPath();
        } catch {
            return null;
        }
    }
    return null;
}

// =============================================================================
// Types
// =============================================================================

export interface JourneyInfo {
    id: string;
    title: string;
    description: string;
    duration: string;
    category: 'foundation' | 'understanding' | 'deeper';
    axes: string[];
    systemPrompt: string;
}

// =============================================================================
// Journey Metadata (static, matches JourneysPage.tsx)
// =============================================================================

interface JourneyMetadata {
    id: string;
    filename: string;
    title: string;
    description: string;
    duration: string;
    category: 'foundation' | 'understanding' | 'deeper';
    axes: string[];
}

const JOURNEY_METADATA: JourneyMetadata[] = [
    // Foundation
    {
        id: 'what-do-you-need',
        filename: '01-what-do-you-need.md',
        title: 'What Do You Actually Need?',
        description: 'Discover which of your fundamental needs are met and which are calling for attention.',
        duration: '15-25 min',
        category: 'foundation',
        axes: ['Maslow Status', 'Life Situation'],
    },
    {
        id: 'what-matters-most',
        filename: '02-what-matters-most.md',
        title: 'What Matters Most to You?',
        description: 'Uncover your core values—the principles that guide your best decisions.',
        duration: '20-30 min',
        category: 'foundation',
        axes: ['Core Values', 'Moral Foundations'],
    },
    {
        id: 'where-are-you-going',
        filename: '03-where-are-you-going.md',
        title: 'Where Are You Going?',
        description: "Clarify what you're working toward and what's been getting in the way.",
        duration: '15-25 min',
        category: 'foundation',
        axes: ['Goals', 'Challenges', 'Intent'],
    },
    // Understanding Yourself
    {
        id: 'how-you-show-up',
        filename: '04-how-you-show-up.md',
        title: 'How You Show Up',
        description: 'Understand your natural tendencies—how you recharge, approach problems, and relate to others.',
        duration: '20-30 min',
        category: 'understanding',
        axes: ['Personality (Big Five)'],
    },
    {
        id: 'relationship-with-risk',
        filename: '05-relationship-with-risk.md',
        title: 'Your Relationship with Risk',
        description: 'Explore how you navigate uncertainty and what drives your decisions.',
        duration: '15-20 min',
        category: 'understanding',
        axes: ['Risk Tolerance', 'Motivation Style'],
    },
    {
        id: 'how-you-connect',
        filename: '06-how-you-connect.md',
        title: 'How You Connect',
        description: 'Understand your patterns in close relationships and how you seek support.',
        duration: '20-30 min',
        category: 'understanding',
        axes: ['Attachment Style', 'Support-Seeking'],
    },
    // Going Deeper
    {
        id: 'whos-in-control',
        filename: '07-whos-in-control.md',
        title: "Who's in Control?",
        description: 'Explore your sense of personal agency and beliefs about change.',
        duration: '15-20 min',
        category: 'deeper',
        axes: ['Locus of Control', 'Growth Mindset', 'Self-Efficacy'],
    },
    {
        id: 'living-in-time',
        filename: '08-living-in-time.md',
        title: 'Living in Time',
        description: 'Discover where you psychologically live—past, present, or future.',
        duration: '15-20 min',
        category: 'deeper',
        axes: ['Temporal Orientation'],
    },
    {
        id: 'under-pressure',
        filename: '09-under-pressure.md',
        title: 'Under Pressure',
        description: 'Understand how you respond to stress and handle intense emotions.',
        duration: '15-20 min',
        category: 'deeper',
        axes: ['Stress Response', 'Emotional Regulation'],
    },
    {
        id: 'ready-for-change',
        filename: '10-ready-for-change.md',
        title: 'Ready for Change',
        description: "Assess your true readiness for the changes you're considering.",
        duration: '15-20 min',
        category: 'deeper',
        axes: ['Change Readiness'],
    },
];

// =============================================================================
// System Prompt Extraction
// =============================================================================

/**
 * Extract the system prompt from a journey markdown file.
 * Looks for content between ```...``` after the "## System Prompt" heading.
 */
function extractSystemPrompt(markdown: string): string {
    // Find the System Prompt section
    const systemPromptMatch = markdown.match(/## System Prompt\s*\n\s*```\n?([\s\S]*?)```/);

    if (!systemPromptMatch) {
        console.warn('Could not find system prompt in journey markdown');
        return '';
    }

    return systemPromptMatch[1].trim();
}

/**
 * Get the path to the journeys directory.
 * In development, this is relative to the project root.
 * In production, journey files are bundled with the app.
 */
function getJourneysDirectory(): string {
    // Try multiple possible paths (works for both dev and production)
    const possiblePaths = [
        path.join(process.cwd(), 'docs', 'journeys'),
    ];

    // In Electron, also try the app path
    const appPath = getAppPath();
    if (appPath) {
        possiblePaths.push(path.join(appPath, 'docs', 'journeys'));
    }

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    // Default to cwd-based path
    return path.join(process.cwd(), 'docs', 'journeys');
}

// =============================================================================
// Journey Registry
// =============================================================================

const journeyCache: Map<string, JourneyInfo> = new Map();
let registryInitialized = false;

/**
 * Initialize the journey registry by loading all journey files.
 */
export function initJourneyRegistry(): void {
    if (registryInitialized) return;

    const journeysDir = getJourneysDirectory();
    console.log(`[journeys] Loading journeys from: ${journeysDir}`);

    for (const metadata of JOURNEY_METADATA) {
        try {
            const filePath = path.join(journeysDir, metadata.filename);

            if (!fs.existsSync(filePath)) {
                console.warn(`[journeys] Journey file not found: ${filePath}`);
                // Use metadata with empty prompt as fallback
                journeyCache.set(metadata.id, {
                    id: metadata.id,
                    title: metadata.title,
                    description: metadata.description,
                    duration: metadata.duration,
                    category: metadata.category,
                    axes: metadata.axes,
                    systemPrompt: '',
                });
                continue;
            }

            const markdown = fs.readFileSync(filePath, 'utf-8');
            const systemPrompt = extractSystemPrompt(markdown);

            if (!systemPrompt) {
                console.warn(`[journeys] No system prompt found in: ${metadata.filename}`);
            }

            journeyCache.set(metadata.id, {
                id: metadata.id,
                title: metadata.title,
                description: metadata.description,
                duration: metadata.duration,
                category: metadata.category,
                axes: metadata.axes,
                systemPrompt,
            });

            console.log(`[journeys] Loaded journey: ${metadata.id} (${systemPrompt.length} chars)`);
        } catch (error) {
            console.error(`[journeys] Failed to load journey ${metadata.id}:`, error);
        }
    }

    registryInitialized = true;
    console.log(`[journeys] Registry initialized with ${journeyCache.size} journeys`);
}

/**
 * Get a journey by ID.
 */
export function getJourney(id: string): JourneyInfo | null {
    if (!registryInitialized) {
        initJourneyRegistry();
    }

    return journeyCache.get(id) || null;
}

/**
 * Get all journeys.
 */
export function getAllJourneys(): JourneyInfo[] {
    if (!registryInitialized) {
        initJourneyRegistry();
    }

    // Return in metadata order (which is the intended display order)
    return JOURNEY_METADATA.map(meta => journeyCache.get(meta.id)).filter((j): j is JourneyInfo => j !== undefined);
}

/**
 * Get journeys by category.
 */
export function getJourneysByCategory(category: 'foundation' | 'understanding' | 'deeper'): JourneyInfo[] {
    return getAllJourneys().filter(j => j.category === category);
}

/**
 * Clear the journey cache (for testing).
 */
export function clearJourneyCache(): void {
    journeyCache.clear();
    registryInitialized = false;
}
