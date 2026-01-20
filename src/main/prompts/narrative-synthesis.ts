import type { NarrativeSummary } from '../../shared/types.js';

export type { NarrativeSummary };

export const NARRATIVE_SYNTHESIS_PROMPT = `
You are synthesizing a psychological profile narrative from structured data.
This narrative will be shown to the user as their "Self-Portrait" - a mirror
reflecting who they are based on their conversations.

## Current Profile Data
{profile_data}

## Previous Narrative (if any)
{existing_narrative}

## Your Task

Generate a brief, insightful narrative that:
1. Summarizes who this person is in 2-3 sentences (identity_summary)
2. Identifies their current life phase (current_phase)
3. Notes their top 3 concerns right now (primary_concerns)
4. Characterizes their emotional baseline (emotional_baseline)
5. Highlights patterns or tensions worth watching (patterns_to_watch)
6. Identifies recent positive developments (recent_wins)
7. Notes current difficulties (recent_struggles)

## Guidelines

- Write in second person ("You are..." not "They are...")
- Be warm but honest - this is a mirror, not flattery
- Ground observations in actual data - don't invent
- Keep identity_summary to 2-3 sentences max
- current_phase should be a short label like "career_transition", "new_parent", "rebuilding_after_loss"
- emotional_baseline should be a short descriptor like "anxious_but_hopeful", "stable_and_grounded"
- If data is insufficient for a field, use null (don't fabricate)

## Output Format (JSON only, no markdown)
{
    "identity_summary": "2-3 sentence summary of who they are",
    "current_phase": "short_label_for_life_phase",
    "primary_concerns": ["concern1", "concern2", "concern3"],
    "emotional_baseline": "emotional_state_descriptor",
    "patterns_to_watch": ["pattern or tension worth noting"],
    "recent_wins": ["positive development"],
    "recent_struggles": ["current difficulty"]
}

Respond with valid JSON only. No markdown code blocks.
`;
