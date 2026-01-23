/**
 * Comprehensive question bank for guided onboarding and profile building.
 * Questions designed to naturally gather psychological data across all axes.
 *
 * Based on AXIS_REFERENCE_LIBRARY.md detection signals and question suggestions.
 */

import type { AxisName } from './completeness.js';
import { getHighestPriorityAxis } from './guided-onboarding.js';

export type QuestionType = 'direct' | 'indirect' | 'follow_up' | 'scenario' | 'reflection';

export interface GuidingQuestion {
    id: string;
    axis: AxisName;
    question: string;
    type: QuestionType;
    context: string;  // When to use this question
    tier: 1 | 2 | 3 | 4;
    detects?: string[];  // What signals/values this question helps detect
}

export const QUESTION_BANK: GuidingQuestion[] = [
    // =============================================================================
    // TIER 1: ESSENTIAL (Gather first to avoid bad advice)
    // =============================================================================

    // -------------------------------------------------------------------------
    // 1.1 MASLOW STATUS
    // Identifies which fundamental human needs are currently met or challenged
    // -------------------------------------------------------------------------

    // Physiological Level
    {
        id: 'maslow_physio_1',
        axis: 'maslow_status',
        question: "How are you sleeping these days? Getting enough rest?",
        type: 'indirect',
        context: "Gentle check on physiological needs",
        tier: 1,
        detects: ['physiological', 'sleep', 'health'],
    },
    {
        id: 'maslow_physio_2',
        axis: 'maslow_status',
        question: "How's your health been lately?",
        type: 'direct',
        context: "Direct health check",
        tier: 1,
        detects: ['physiological', 'health'],
    },
    {
        id: 'maslow_physio_3',
        axis: 'maslow_status',
        question: "Are the basics covered for you right now - food, housing, that sort of thing?",
        type: 'direct',
        context: "Check basic survival needs",
        tier: 1,
        detects: ['physiological', 'shelter', 'food'],
    },

    // Safety Level
    {
        id: 'maslow_safety_1',
        axis: 'maslow_status',
        question: "How secure do you feel about your job or income right now?",
        type: 'direct',
        context: "Assess financial/job security",
        tier: 1,
        detects: ['safety', 'financial_security', 'job_security'],
    },
    {
        id: 'maslow_safety_2',
        axis: 'maslow_status',
        question: "Is there anything making you feel unsafe or unstable lately?",
        type: 'direct',
        context: "Open-ended safety concerns",
        tier: 1,
        detects: ['safety', 'physical_safety', 'stability'],
    },
    {
        id: 'maslow_safety_3',
        axis: 'maslow_status',
        question: "Do you find yourself worrying a lot about what might go wrong?",
        type: 'indirect',
        context: "Detect anxiety about security",
        tier: 1,
        detects: ['safety', 'anxiety', 'hypervigilance'],
    },

    // Belonging Level
    {
        id: 'maslow_belonging_1',
        axis: 'maslow_status',
        question: "Do you have people in your life who really understand you?",
        type: 'direct',
        context: "Assess connection needs",
        tier: 1,
        detects: ['belonging', 'connection', 'being_seen'],
    },
    {
        id: 'maslow_belonging_2',
        axis: 'maslow_status',
        question: "How connected do you feel to the people around you?",
        type: 'direct',
        context: "General belonging check",
        tier: 1,
        detects: ['belonging', 'community', 'isolation'],
    },
    {
        id: 'maslow_belonging_3',
        axis: 'maslow_status',
        question: "When was the last time you felt truly seen by someone?",
        type: 'indirect',
        context: "Explore depth of connection",
        tier: 1,
        detects: ['belonging', 'intimacy', 'loneliness'],
    },

    // Esteem Level
    {
        id: 'maslow_esteem_1',
        axis: 'maslow_status',
        question: "How do you feel about what you've accomplished so far in life?",
        type: 'direct',
        context: "Assess achievement satisfaction",
        tier: 1,
        detects: ['esteem', 'achievement', 'self_respect'],
    },
    {
        id: 'maslow_esteem_2',
        axis: 'maslow_status',
        question: "Do you ever feel like you're not good enough, even when things are going well?",
        type: 'indirect',
        context: "Detect imposter syndrome or self-doubt",
        tier: 1,
        detects: ['esteem', 'imposter_syndrome', 'self_doubt'],
    },
    {
        id: 'maslow_esteem_3',
        axis: 'maslow_status',
        question: "Do you feel respected by the people who matter to you?",
        type: 'direct',
        context: "Assess external validation needs",
        tier: 1,
        detects: ['esteem', 'respect', 'validation'],
    },

    // Self-Actualization Level
    {
        id: 'maslow_actualization_1',
        axis: 'maslow_status',
        question: "Do you feel like you're living up to your potential?",
        type: 'direct',
        context: "Assess self-actualization",
        tier: 1,
        detects: ['self_actualization', 'potential', 'growth'],
    },
    {
        id: 'maslow_actualization_2',
        axis: 'maslow_status',
        question: "What gives your life meaning right now?",
        type: 'indirect',
        context: "Explore purpose and meaning",
        tier: 1,
        detects: ['self_actualization', 'meaning', 'purpose'],
    },
    {
        id: 'maslow_actualization_3',
        axis: 'maslow_status',
        question: "Do you ever find yourself asking 'is this all there is?'",
        type: 'indirect',
        context: "Detect existential questioning",
        tier: 1,
        detects: ['self_actualization', 'existential', 'unfulfilled'],
    },

    // General Maslow Questions
    {
        id: 'maslow_general_1',
        axis: 'maslow_status',
        question: "How are things going with the basics right now - work, health, finances, living situation?",
        type: 'direct',
        context: "Opening question to assess fundamental needs",
        tier: 1,
        detects: ['physiological', 'safety', 'overview'],
    },
    {
        id: 'maslow_general_2',
        axis: 'maslow_status',
        question: "Is there anything weighing on you at a really fundamental level?",
        type: 'direct',
        context: "Follow-up if first question didn't reveal enough",
        tier: 1,
        detects: ['physiological', 'safety', 'concerns'],
    },
    {
        id: 'maslow_general_3',
        axis: 'maslow_status',
        question: "What's been taking up most of your mental energy lately?",
        type: 'indirect',
        context: "Alternative approach to understand concerns",
        tier: 1,
        detects: ['all_levels', 'primary_concern'],
    },
    {
        id: 'maslow_general_4',
        axis: 'maslow_status',
        question: "If you could change one thing about your current situation, what would it be?",
        type: 'indirect',
        context: "Reveal primary area of concern",
        tier: 1,
        detects: ['all_levels', 'priority_need'],
    },

    // -------------------------------------------------------------------------
    // 1.2 SUPPORT-SEEKING STYLE
    // How the person prefers to receive help
    // -------------------------------------------------------------------------

    // Direct Style Questions
    {
        id: 'support_direct_1',
        axis: 'support_seeking_style',
        question: "When something's on your mind, do you usually want help solving it, or do you need to talk it through first?",
        type: 'direct',
        context: "Direct question about support preference",
        tier: 1,
        detects: ['emotional_vs_instrumental'],
    },
    {
        id: 'support_direct_2',
        axis: 'support_seeking_style',
        question: "What would be most helpful from me right now - listening, thinking through options, or something else?",
        type: 'direct',
        context: "In-the-moment clarification",
        tier: 1,
        detects: ['current_preference'],
    },
    {
        id: 'support_direct_3',
        axis: 'support_seeking_style',
        question: "Before I respond - are you looking for thoughts on what to do, or do you just need to be heard right now?",
        type: 'direct',
        context: "Check before giving advice",
        tier: 1,
        detects: ['emotional_vs_instrumental'],
    },

    // Indirect/Exploratory Questions
    {
        id: 'support_indirect_1',
        axis: 'support_seeking_style',
        question: "When you're going through something hard, what helps you most?",
        type: 'indirect',
        context: "General support preference",
        tier: 1,
        detects: ['all_styles'],
    },
    {
        id: 'support_indirect_2',
        axis: 'support_seeking_style',
        question: "Do you tend to work things out on your own, or do you like to talk things through with others?",
        type: 'indirect',
        context: "Independence vs collaboration",
        tier: 1,
        detects: ['independence', 'collaborative'],
    },
    {
        id: 'support_indirect_3',
        axis: 'support_seeking_style',
        question: "When friends come to you with problems, what kind of support do you usually offer them?",
        type: 'indirect',
        context: "Project support style onto others",
        tier: 1,
        detects: ['preferred_style'],
    },
    {
        id: 'support_scenario_1',
        axis: 'support_seeking_style',
        question: "If you were stressed about a big decision, would you want someone to help you analyze it, or just sit with you while you figure it out?",
        type: 'scenario',
        context: "Scenario-based preference",
        tier: 1,
        detects: ['informational', 'emotional', 'independence'],
    },
    {
        id: 'support_validation_1',
        axis: 'support_seeking_style',
        question: "When you share something difficult, do you want perspective and pushback, or mostly to know your feelings make sense?",
        type: 'direct',
        context: "Check validation preference",
        tier: 1,
        detects: ['validation', 'informational'],
    },

    // -------------------------------------------------------------------------
    // 1.3 LIFE SITUATION
    // Basic factual context about current life circumstances
    // -------------------------------------------------------------------------

    // Work/Career
    {
        id: 'life_work_1',
        axis: 'life_situation',
        question: "What kind of work do you do? Or are you in school, between jobs, something else?",
        type: 'direct',
        context: "Establish work situation",
        tier: 1,
        detects: ['work', 'career'],
    },
    {
        id: 'life_work_2',
        axis: 'life_situation',
        question: "How do you spend most of your days?",
        type: 'indirect',
        context: "Open-ended daily life exploration",
        tier: 1,
        detects: ['work', 'routine', 'lifestyle'],
    },

    // Relationships
    {
        id: 'life_relationships_1',
        axis: 'life_situation',
        question: "Who are the important people in your life right now?",
        type: 'direct',
        context: "Explore relationships and social context",
        tier: 1,
        detects: ['relationships', 'family', 'friends'],
    },
    {
        id: 'life_relationships_2',
        axis: 'life_situation',
        question: "Are you in a relationship, or is that not part of the picture right now?",
        type: 'direct',
        context: "Romantic relationship status",
        tier: 1,
        detects: ['romantic_relationship'],
    },
    {
        id: 'life_relationships_3',
        axis: 'life_situation',
        question: "Are you going through this alone, or is there someone in your life who's involved?",
        type: 'follow_up',
        context: "Check support availability",
        tier: 1,
        detects: ['support_network', 'isolation'],
    },

    // Family
    {
        id: 'life_family_1',
        axis: 'life_situation',
        question: "Do you have kids, or is that not in the picture?",
        type: 'direct',
        context: "Parental status",
        tier: 1,
        detects: ['children', 'parenting'],
    },
    {
        id: 'life_family_2',
        axis: 'life_situation',
        question: "How's your relationship with your family these days?",
        type: 'direct',
        context: "Family dynamics",
        tier: 1,
        detects: ['family_relationships'],
    },

    // Living Situation
    {
        id: 'life_living_1',
        axis: 'life_situation',
        question: "Where are you living these days? Alone, with family, roommates?",
        type: 'direct',
        context: "Living situation",
        tier: 1,
        detects: ['housing', 'living_arrangement'],
    },
    {
        id: 'life_living_2',
        axis: 'life_situation',
        question: "Do you feel settled where you are, or is your situation kind of in flux?",
        type: 'indirect',
        context: "Stability of living situation",
        tier: 1,
        detects: ['housing_stability'],
    },

    // General Life Context
    {
        id: 'life_general_1',
        axis: 'life_situation',
        question: "Tell me about your life right now - what does a typical week look like?",
        type: 'direct',
        context: "Open-ended life context question",
        tier: 1,
        detects: ['all_dimensions'],
    },
    {
        id: 'life_general_2',
        axis: 'life_situation',
        question: "What stage of life would you say you're in right now?",
        type: 'indirect',
        context: "Life stage awareness",
        tier: 1,
        detects: ['age_stage', 'transitions'],
    },
    {
        id: 'life_general_3',
        axis: 'life_situation',
        question: "How long have you been in your current situation?",
        type: 'follow_up',
        context: "Duration and stability",
        tier: 1,
        detects: ['stability', 'duration'],
    },

    // -------------------------------------------------------------------------
    // 1.4 IMMEDIATE INTENT
    // What brought them to this conversation today
    // -------------------------------------------------------------------------

    // Opening Questions
    {
        id: 'intent_opening_1',
        axis: 'immediate_intent',
        question: "What's on your mind today?",
        type: 'direct',
        context: "Standard opening",
        tier: 1,
        detects: ['all_intent_types'],
    },
    {
        id: 'intent_opening_2',
        axis: 'immediate_intent',
        question: "What brought you here?",
        type: 'direct',
        context: "Simple opening",
        tier: 1,
        detects: ['all_intent_types'],
    },
    {
        id: 'intent_opening_3',
        axis: 'immediate_intent',
        question: "Is there something specific you're hoping to figure out, or is this more of an open exploration?",
        type: 'direct',
        context: "Clarify specific vs general need",
        tier: 1,
        detects: ['specific_question', 'general_exploration'],
    },

    // Goal Clarification
    {
        id: 'intent_goal_1',
        axis: 'immediate_intent',
        question: "What would make this conversation feel useful to you?",
        type: 'direct',
        context: "Set expectations",
        tier: 1,
        detects: ['conversation_goal'],
    },
    {
        id: 'intent_goal_2',
        axis: 'immediate_intent',
        question: "By the end of our chat, what would you like to have - a decision made, a feeling processed, just some clarity?",
        type: 'direct',
        context: "Desired outcome",
        tier: 1,
        detects: ['desired_outcome'],
    },
    {
        id: 'intent_goal_3',
        axis: 'immediate_intent',
        question: "Are you here to work through something specific, or just to explore and think out loud?",
        type: 'direct',
        context: "Mode clarification",
        tier: 1,
        detects: ['specific_question', 'general_exploration'],
    },

    // Emotional Processing Detection
    {
        id: 'intent_emotional_1',
        axis: 'immediate_intent',
        question: "Is there something that just happened that you need to talk about?",
        type: 'direct',
        context: "Recent event processing",
        tier: 1,
        detects: ['emotional_processing', 'crisis_support'],
    },
    {
        id: 'intent_emotional_2',
        axis: 'immediate_intent',
        question: "How are you feeling right now?",
        type: 'direct',
        context: "Emotional state check",
        tier: 1,
        detects: ['emotional_state', 'crisis_support'],
    },

    // =============================================================================
    // TIER 2: EARLY INFERENCE (Improve personalization quality)
    // =============================================================================

    // -------------------------------------------------------------------------
    // 2.1 CORE VALUES (Schwartz)
    // 10 universal value types
    // -------------------------------------------------------------------------

    // Direct Value Questions
    {
        id: 'values_direct_1',
        axis: 'core_values',
        question: "What matters most to you in life? What would you never compromise on?",
        type: 'direct',
        context: "Direct values exploration",
        tier: 2,
        detects: ['all_values'],
    },
    {
        id: 'values_direct_2',
        axis: 'core_values',
        question: "When you imagine your ideal life, what's non-negotiable?",
        type: 'direct',
        context: "Core value identification",
        tier: 2,
        detects: ['all_values'],
    },
    {
        id: 'values_direct_3',
        axis: 'core_values',
        question: "What do you want to be remembered for?",
        type: 'reflection',
        context: "Legacy values",
        tier: 2,
        detects: ['benevolence', 'achievement', 'universalism'],
    },

    // Trade-off Questions
    {
        id: 'values_tradeoff_1',
        axis: 'core_values',
        question: "If you had to choose between financial security and doing something you love, which way would you lean?",
        type: 'scenario',
        context: "Security vs self-direction trade-off",
        tier: 2,
        detects: ['security', 'self_direction', 'stimulation'],
    },
    {
        id: 'values_tradeoff_2',
        axis: 'core_values',
        question: "Is it more important to you to stand out or to fit in?",
        type: 'scenario',
        context: "Self-direction vs conformity trade-off",
        tier: 2,
        detects: ['self_direction', 'conformity', 'tradition'],
    },
    {
        id: 'values_tradeoff_3',
        axis: 'core_values',
        question: "Would you rather have influence over others, or make a positive impact on the world?",
        type: 'scenario',
        context: "Power vs universalism trade-off",
        tier: 2,
        detects: ['power', 'universalism', 'benevolence'],
    },
    {
        id: 'values_tradeoff_4',
        axis: 'core_values',
        question: "When you think about success, is it more about personal achievement or helping others?",
        type: 'scenario',
        context: "Achievement vs benevolence trade-off",
        tier: 2,
        detects: ['achievement', 'benevolence'],
    },

    // Value Conflict Questions
    {
        id: 'values_conflict_1',
        axis: 'core_values',
        question: "Tell me about a time you had to make a hard choice between two things that both mattered to you.",
        type: 'reflection',
        context: "Reveal value hierarchy through conflict",
        tier: 2,
        detects: ['value_hierarchy'],
    },
    {
        id: 'values_conflict_2',
        axis: 'core_values',
        question: "Have you ever had to give up something important to stay true to something you believed in?",
        type: 'reflection',
        context: "Core value identification through sacrifice",
        tier: 2,
        detects: ['core_values', 'value_strength'],
    },

    // Self-Direction Detection
    {
        id: 'values_selfdirection_1',
        axis: 'core_values',
        question: "How important is it to you to do things your own way?",
        type: 'direct',
        context: "Self-direction value",
        tier: 2,
        detects: ['self_direction', 'autonomy'],
    },

    // Stimulation Detection
    {
        id: 'values_stimulation_1',
        axis: 'core_values',
        question: "Do you seek out new experiences, or do you prefer familiar routines?",
        type: 'direct',
        context: "Stimulation vs security",
        tier: 2,
        detects: ['stimulation', 'security'],
    },

    // Hedonism Detection
    {
        id: 'values_hedonism_1',
        axis: 'core_values',
        question: "How important is pleasure and enjoyment in your day-to-day life?",
        type: 'direct',
        context: "Hedonism value",
        tier: 2,
        detects: ['hedonism'],
    },

    // Tradition/Conformity Detection
    {
        id: 'values_tradition_1',
        axis: 'core_values',
        question: "How much do traditions and customs matter to you?",
        type: 'direct',
        context: "Tradition value",
        tier: 2,
        detects: ['tradition', 'conformity'],
    },

    // -------------------------------------------------------------------------
    // 2.2 CURRENT CHALLENGES
    // What the person is currently struggling with
    // -------------------------------------------------------------------------

    // Primary Challenge Identification
    {
        id: 'challenges_primary_1',
        axis: 'current_challenges',
        question: "What's the biggest thing you're dealing with right now?",
        type: 'direct',
        context: "Identify primary challenge",
        tier: 2,
        detects: ['primary_challenge'],
    },
    {
        id: 'challenges_primary_2',
        axis: 'current_challenges',
        question: "Is there something in your life that feels stuck or difficult to change?",
        type: 'direct',
        context: "Explore persistent challenges",
        tier: 2,
        detects: ['stuck_areas', 'persistent_challenges'],
    },
    {
        id: 'challenges_primary_3',
        axis: 'current_challenges',
        question: "What's been keeping you up at night lately?",
        type: 'indirect',
        context: "Identify worry areas",
        tier: 2,
        detects: ['anxiety_sources', 'worries'],
    },

    // Challenge Context
    {
        id: 'challenges_context_1',
        axis: 'current_challenges',
        question: "How long have you been dealing with this?",
        type: 'follow_up',
        context: "Challenge duration",
        tier: 2,
        detects: ['challenge_duration'],
    },
    {
        id: 'challenges_context_2',
        axis: 'current_challenges',
        question: "What have you tried so far?",
        type: 'follow_up',
        context: "Previous attempts",
        tier: 2,
        detects: ['coping_strategies', 'attempted_solutions'],
    },
    {
        id: 'challenges_context_3',
        axis: 'current_challenges',
        question: "What makes this particularly hard for you?",
        type: 'follow_up',
        context: "Challenge difficulty",
        tier: 2,
        detects: ['challenge_barriers'],
    },

    // Challenge Categories
    {
        id: 'challenges_work_1',
        axis: 'current_challenges',
        question: "How are things going at work? Any difficulties there?",
        type: 'direct',
        context: "Work challenges",
        tier: 2,
        detects: ['career_work'],
    },
    {
        id: 'challenges_relationships_1',
        axis: 'current_challenges',
        question: "Are there any relationship tensions you're navigating right now?",
        type: 'direct',
        context: "Relationship challenges",
        tier: 2,
        detects: ['relationships'],
    },
    {
        id: 'challenges_health_1',
        axis: 'current_challenges',
        question: "Is health - physical or mental - something you're working on right now?",
        type: 'direct',
        context: "Health challenges",
        tier: 2,
        detects: ['health'],
    },

    // -------------------------------------------------------------------------
    // 2.3 GOALS
    // What the person is working toward
    // -------------------------------------------------------------------------

    // Stated Goals
    {
        id: 'goals_stated_1',
        axis: 'goals',
        question: "Is there something you're actively working toward right now?",
        type: 'direct',
        context: "Current active goals",
        tier: 2,
        detects: ['active_goals'],
    },
    {
        id: 'goals_stated_2',
        axis: 'goals',
        question: "What would you like your life to look like in a year or two?",
        type: 'direct',
        context: "Medium-term vision",
        tier: 2,
        detects: ['aspirational_goals'],
    },
    {
        id: 'goals_stated_3',
        axis: 'goals',
        question: "If things went well, what would be different a year from now?",
        type: 'indirect',
        context: "Positive future vision",
        tier: 2,
        detects: ['desired_outcomes'],
    },

    // Implicit Goals
    {
        id: 'goals_implicit_1',
        axis: 'goals',
        question: "Is there something you wish were different about your life right now?",
        type: 'indirect',
        context: "Implicit goals from dissatisfaction",
        tier: 2,
        detects: ['implicit_goals'],
    },
    {
        id: 'goals_implicit_2',
        axis: 'goals',
        question: "What would make you feel like you're making progress?",
        type: 'indirect',
        context: "Progress markers",
        tier: 2,
        detects: ['progress_indicators'],
    },

    // Goal Obstacles
    {
        id: 'goals_obstacles_1',
        axis: 'goals',
        question: "What's been getting in the way of what you want?",
        type: 'direct',
        context: "Goal barriers",
        tier: 2,
        detects: ['goal_obstacles'],
    },
    {
        id: 'goals_obstacles_2',
        axis: 'goals',
        question: "Is there something you've wanted to do but haven't been able to start?",
        type: 'indirect',
        context: "Blocked goals",
        tier: 2,
        detects: ['blocked_goals', 'aspirational_goals'],
    },

    // Aspirational Dreams
    {
        id: 'goals_dreams_1',
        axis: 'goals',
        question: "If you could do anything with your life, what would it be?",
        type: 'indirect',
        context: "Deep aspirations",
        tier: 2,
        detects: ['dreams', 'aspirational_goals'],
    },
    {
        id: 'goals_dreams_2',
        axis: 'goals',
        question: "Is there a dream you've been putting off or have given up on?",
        type: 'reflection',
        context: "Abandoned goals",
        tier: 2,
        detects: ['abandoned_goals'],
    },

    // -------------------------------------------------------------------------
    // 2.4 MORAL FOUNDATIONS (Haidt)
    // Six foundations of moral intuition
    // -------------------------------------------------------------------------

    // General Moral Sense
    {
        id: 'moral_general_1',
        axis: 'moral_foundations',
        question: "What kinds of things really bother you about how people treat each other?",
        type: 'indirect',
        context: "Explore moral sensitivities",
        tier: 2,
        detects: ['all_foundations'],
    },
    {
        id: 'moral_general_2',
        axis: 'moral_foundations',
        question: "What do you think makes someone a good person?",
        type: 'direct',
        context: "Explore moral values",
        tier: 2,
        detects: ['all_foundations'],
    },
    {
        id: 'moral_general_3',
        axis: 'moral_foundations',
        question: "What's something you find genuinely unacceptable, even if others disagree?",
        type: 'direct',
        context: "Strong moral triggers",
        tier: 2,
        detects: ['strong_foundations'],
    },
    {
        id: 'moral_general_4',
        axis: 'moral_foundations',
        question: "When you judge someone harshly, what have they usually done?",
        type: 'reflection',
        context: "Moral violations that matter",
        tier: 2,
        detects: ['moral_priorities'],
    },

    // Care/Harm Foundation
    {
        id: 'moral_care_1',
        axis: 'moral_foundations',
        question: "How much does seeing others suffer affect you?",
        type: 'direct',
        context: "Care foundation",
        tier: 2,
        detects: ['care_harm'],
    },

    // Fairness/Cheating Foundation
    {
        id: 'moral_fairness_1',
        axis: 'moral_foundations',
        question: "How important is fairness to you? Can you give an example?",
        type: 'direct',
        context: "Fairness foundation",
        tier: 2,
        detects: ['fairness_cheating'],
    },

    // Loyalty/Betrayal Foundation
    {
        id: 'moral_loyalty_1',
        axis: 'moral_foundations',
        question: "How do you feel about loyalty - to family, friends, or groups you're part of?",
        type: 'direct',
        context: "Loyalty foundation",
        tier: 2,
        detects: ['loyalty_betrayal'],
    },

    // Authority/Subversion Foundation
    {
        id: 'moral_authority_1',
        axis: 'moral_foundations',
        question: "How do you feel about respecting authority and traditions?",
        type: 'direct',
        context: "Authority foundation",
        tier: 2,
        detects: ['authority_subversion'],
    },

    // Sanctity/Degradation Foundation
    {
        id: 'moral_sanctity_1',
        axis: 'moral_foundations',
        question: "Are there things you consider sacred or off-limits, even if you can't explain why?",
        type: 'indirect',
        context: "Sanctity foundation",
        tier: 2,
        detects: ['sanctity_degradation'],
    },

    // Liberty/Oppression Foundation
    {
        id: 'moral_liberty_1',
        axis: 'moral_foundations',
        question: "How do you feel when someone tries to control or dominate others?",
        type: 'direct',
        context: "Liberty foundation",
        tier: 2,
        detects: ['liberty_oppression'],
    },

    // Society-Level Moral Views
    {
        id: 'moral_society_1',
        axis: 'moral_foundations',
        question: "What do you think is wrong with society today?",
        type: 'indirect',
        context: "Reveal salient moral foundations",
        tier: 2,
        detects: ['all_foundations'],
    },

    // =============================================================================
    // TIER 3: PERSONALITY & DISPOSITION (Frame advice delivery)
    // =============================================================================

    // -------------------------------------------------------------------------
    // 3.1 BIG FIVE (OCEAN)
    // Five-factor model of personality
    // -------------------------------------------------------------------------

    // Openness
    {
        id: 'bigfive_openness_1',
        axis: 'big_five',
        question: "Are you drawn to new ideas and experiences, or do you prefer what's tried and true?",
        type: 'direct',
        context: "Openness trait",
        tier: 3,
        detects: ['openness'],
    },
    {
        id: 'bigfive_openness_2',
        axis: 'big_five',
        question: "Do you enjoy abstract ideas and creative thinking, or do you prefer practical, concrete things?",
        type: 'direct',
        context: "Openness to ideas",
        tier: 3,
        detects: ['openness'],
    },

    // Conscientiousness
    {
        id: 'bigfive_conscientiousness_1',
        axis: 'big_five',
        question: "Are you someone who likes things planned out, or do you prefer going with the flow?",
        type: 'direct',
        context: "Conscientiousness trait",
        tier: 3,
        detects: ['conscientiousness'],
    },
    {
        id: 'bigfive_conscientiousness_2',
        axis: 'big_five',
        question: "How organized would you say you are in your daily life?",
        type: 'direct',
        context: "Organization level",
        tier: 3,
        detects: ['conscientiousness'],
    },
    {
        id: 'bigfive_conscientiousness_3',
        axis: 'big_five',
        question: "When you start something, do you usually follow through, or do other things tend to take over?",
        type: 'indirect',
        context: "Follow-through tendency",
        tier: 3,
        detects: ['conscientiousness'],
    },

    // Extraversion
    {
        id: 'bigfive_extraversion_1',
        axis: 'big_five',
        question: "How do you usually recharge - time alone or time with others?",
        type: 'direct',
        context: "Extraversion trait",
        tier: 3,
        detects: ['extraversion'],
    },
    {
        id: 'bigfive_extraversion_2',
        axis: 'big_five',
        question: "Do you feel energized after spending time with people, or does it drain you?",
        type: 'direct',
        context: "Social energy",
        tier: 3,
        detects: ['extraversion'],
    },
    {
        id: 'bigfive_extraversion_3',
        axis: 'big_five',
        question: "Are you comfortable being the center of attention?",
        type: 'direct',
        context: "Social spotlight",
        tier: 3,
        detects: ['extraversion'],
    },

    // Agreeableness
    {
        id: 'bigfive_agreeableness_1',
        axis: 'big_five',
        question: "Do you tend to avoid conflict, or are you comfortable with disagreement?",
        type: 'direct',
        context: "Agreeableness trait",
        tier: 3,
        detects: ['agreeableness'],
    },
    {
        id: 'bigfive_agreeableness_2',
        axis: 'big_five',
        question: "In a group decision, do you usually go along with others or push for what you think is right?",
        type: 'scenario',
        context: "Cooperation vs assertion",
        tier: 3,
        detects: ['agreeableness'],
    },

    // Neuroticism
    {
        id: 'bigfive_neuroticism_1',
        axis: 'big_five',
        question: "Would you say you're generally calm under pressure, or do you tend to feel stress more intensely?",
        type: 'direct',
        context: "Emotional stability",
        tier: 3,
        detects: ['neuroticism'],
    },
    {
        id: 'bigfive_neuroticism_2',
        axis: 'big_five',
        question: "Do you worry more than you think you should?",
        type: 'direct',
        context: "Anxiety tendency",
        tier: 3,
        detects: ['neuroticism'],
    },
    {
        id: 'bigfive_neuroticism_3',
        axis: 'big_five',
        question: "How easily do things throw you off emotionally?",
        type: 'direct',
        context: "Emotional reactivity",
        tier: 3,
        detects: ['neuroticism'],
    },

    // -------------------------------------------------------------------------
    // 3.2 RISK TOLERANCE
    // Comfort with uncertainty and potential loss
    // -------------------------------------------------------------------------

    {
        id: 'risk_general_1',
        axis: 'risk_tolerance',
        question: "When you're facing a big decision, do you tend to play it safe or take chances?",
        type: 'direct',
        context: "General risk preference",
        tier: 3,
        detects: ['risk_level'],
    },
    {
        id: 'risk_scenario_1',
        axis: 'risk_tolerance',
        question: "If you had to choose between a stable, predictable life and an exciting life with more uncertainty, which way would you lean?",
        type: 'scenario',
        context: "Stability vs excitement trade-off",
        tier: 3,
        detects: ['risk_seeking', 'risk_averse'],
    },
    {
        id: 'risk_past_1',
        axis: 'risk_tolerance',
        question: "Think about a big decision you made recently - did you play it safe or take a risk?",
        type: 'reflection',
        context: "Past behavior as indicator",
        tier: 3,
        detects: ['risk_behavior'],
    },
    {
        id: 'risk_feeling_1',
        axis: 'risk_tolerance',
        question: "How does uncertainty make you feel - excited or anxious?",
        type: 'direct',
        context: "Emotional response to risk",
        tier: 3,
        detects: ['risk_emotion'],
    },
    {
        id: 'risk_worstcase_1',
        axis: 'risk_tolerance',
        question: "When making decisions, do you focus more on what could go right or what could go wrong?",
        type: 'direct',
        context: "Focus on upside vs downside",
        tier: 3,
        detects: ['risk_focus'],
    },

    // -------------------------------------------------------------------------
    // 3.3 MOTIVATION STYLE (Approach vs Avoidance)
    // -------------------------------------------------------------------------

    {
        id: 'motivation_general_1',
        axis: 'motivation_style',
        question: "What usually gets you motivated - avoiding problems or working toward something exciting?",
        type: 'direct',
        context: "Approach vs avoidance orientation",
        tier: 3,
        detects: ['approach', 'avoidance'],
    },
    {
        id: 'motivation_framing_1',
        axis: 'motivation_style',
        question: "When you set goals, do you think more about what you want to achieve or what you want to avoid?",
        type: 'direct',
        context: "Goal framing",
        tier: 3,
        detects: ['approach', 'avoidance'],
    },
    {
        id: 'motivation_driver_1',
        axis: 'motivation_style',
        question: "What drives this decision more - excitement about what could go right, or wanting to avoid what could go wrong?",
        type: 'direct',
        context: "Decision driver",
        tier: 3,
        detects: ['approach', 'avoidance'],
    },
    {
        id: 'motivation_energy_1',
        axis: 'motivation_style',
        question: "Do you feel more energy when you're chasing something good or escaping something bad?",
        type: 'indirect',
        context: "Motivational energy",
        tier: 3,
        detects: ['approach', 'avoidance'],
    },

    // =============================================================================
    // TIER 4: DEEPER PATTERNS (Emerge over time)
    // =============================================================================

    // -------------------------------------------------------------------------
    // 4.1 ATTACHMENT STYLE
    // Patterns of relating to others in close relationships
    // -------------------------------------------------------------------------

    {
        id: 'attachment_general_1',
        axis: 'attachment_style',
        question: "How easy is it for you to open up to people you're close to?",
        type: 'direct',
        context: "Vulnerability comfort",
        tier: 4,
        detects: ['secure', 'avoidant'],
    },
    {
        id: 'attachment_general_2',
        axis: 'attachment_style',
        question: "How would you describe your closest relationships?",
        type: 'indirect',
        context: "Relationship patterns",
        tier: 4,
        detects: ['all_styles'],
    },
    {
        id: 'attachment_hard_1',
        axis: 'attachment_style',
        question: "What's hardest for you in close relationships?",
        type: 'direct',
        context: "Relationship challenges",
        tier: 4,
        detects: ['all_styles'],
    },
    {
        id: 'attachment_trust_1',
        axis: 'attachment_style',
        question: "Do you generally trust people to be there for you, or do you tend to hold back?",
        type: 'direct',
        context: "Trust in relationships",
        tier: 4,
        detects: ['secure', 'avoidant', 'anxious'],
    },
    {
        id: 'attachment_need_1',
        axis: 'attachment_style',
        question: "Do you worry about people you care about leaving or rejecting you?",
        type: 'direct',
        context: "Abandonment fears",
        tier: 4,
        detects: ['anxious'],
    },
    {
        id: 'attachment_space_1',
        axis: 'attachment_style',
        question: "Do you ever feel like you need more space in relationships than others seem to?",
        type: 'direct',
        context: "Independence needs",
        tier: 4,
        detects: ['avoidant'],
    },
    {
        id: 'attachment_pattern_1',
        axis: 'attachment_style',
        question: "Do you notice any patterns in how your relationships tend to go?",
        type: 'reflection',
        context: "Relationship patterns",
        tier: 4,
        detects: ['all_styles'],
    },

    // -------------------------------------------------------------------------
    // 4.2 LOCUS OF CONTROL
    // Internal vs external attribution of outcomes
    // -------------------------------------------------------------------------

    {
        id: 'locus_general_1',
        axis: 'locus_of_control',
        question: "Do you feel like you're mostly in control of how your life goes, or does it feel like outside forces have a big influence?",
        type: 'direct',
        context: "General locus of control",
        tier: 4,
        detects: ['internal', 'external'],
    },
    {
        id: 'locus_attribution_1',
        axis: 'locus_of_control',
        question: "Looking back at how things turned out, what do you think made the difference?",
        type: 'reflection',
        context: "Attribution style",
        tier: 4,
        detects: ['internal', 'external'],
    },
    {
        id: 'locus_success_1',
        axis: 'locus_of_control',
        question: "When something goes well for you, is it because of your efforts or because you got lucky?",
        type: 'direct',
        context: "Success attribution",
        tier: 4,
        detects: ['internal', 'external'],
    },
    {
        id: 'locus_failure_1',
        axis: 'locus_of_control',
        question: "When things don't work out, is it usually because of something you did or something outside your control?",
        type: 'direct',
        context: "Failure attribution",
        tier: 4,
        detects: ['internal', 'external'],
    },
    {
        id: 'locus_change_1',
        axis: 'locus_of_control',
        question: "Do you believe you can change your situation if you really try?",
        type: 'direct',
        context: "Agency belief",
        tier: 4,
        detects: ['internal', 'external'],
    },

    // -------------------------------------------------------------------------
    // 4.3 TEMPORAL ORIENTATION
    // Where the person psychologically "lives" - past, present, or future
    // -------------------------------------------------------------------------

    {
        id: 'temporal_general_1',
        axis: 'temporal_orientation',
        question: "Do you spend more time thinking about the past, present, or future?",
        type: 'direct',
        context: "Temporal focus",
        tier: 4,
        detects: ['all_orientations'],
    },
    {
        id: 'temporal_past_1',
        axis: 'temporal_orientation',
        question: "Do you find yourself often thinking about things that happened in the past?",
        type: 'direct',
        context: "Past orientation",
        tier: 4,
        detects: ['past_negative', 'past_positive'],
    },
    {
        id: 'temporal_past_2',
        axis: 'temporal_orientation',
        question: "When you think about the past, is it mostly fond memories or regrets?",
        type: 'direct',
        context: "Past valence",
        tier: 4,
        detects: ['past_negative', 'past_positive'],
    },
    {
        id: 'temporal_present_1',
        axis: 'temporal_orientation',
        question: "How good are you at enjoying the moment without worrying about what's next?",
        type: 'direct',
        context: "Present enjoyment",
        tier: 4,
        detects: ['present_hedonistic'],
    },
    {
        id: 'temporal_future_1',
        axis: 'temporal_orientation',
        question: "Do you often sacrifice present enjoyment for future goals?",
        type: 'direct',
        context: "Future orientation",
        tier: 4,
        detects: ['future_oriented'],
    },
    {
        id: 'temporal_future_2',
        axis: 'temporal_orientation',
        question: "How far ahead do you typically plan?",
        type: 'direct',
        context: "Planning horizon",
        tier: 4,
        detects: ['future_oriented'],
    },

    // -------------------------------------------------------------------------
    // 4.4 GROWTH MINDSET
    // Belief about whether abilities are fixed or developable
    // -------------------------------------------------------------------------

    {
        id: 'growth_general_1',
        axis: 'growth_mindset',
        question: "When you fail at something, do you usually feel like you can improve with effort, or does it feel more fixed?",
        type: 'direct',
        context: "Response to failure",
        tier: 4,
        detects: ['growth', 'fixed'],
    },
    {
        id: 'growth_challenge_1',
        axis: 'growth_mindset',
        question: "Do you enjoy challenges that push you, or do you prefer to stick with what you're good at?",
        type: 'direct',
        context: "Challenge preference",
        tier: 4,
        detects: ['growth', 'fixed'],
    },
    {
        id: 'growth_ability_1',
        axis: 'growth_mindset',
        question: "Do you believe people can fundamentally change their abilities, or are we mostly stuck with what we're born with?",
        type: 'direct',
        context: "Ability beliefs",
        tier: 4,
        detects: ['growth', 'fixed'],
    },
    {
        id: 'growth_feedback_1',
        axis: 'growth_mindset',
        question: "How do you react when someone criticizes your work or abilities?",
        type: 'direct',
        context: "Response to feedback",
        tier: 4,
        detects: ['growth', 'fixed'],
    },
    {
        id: 'growth_effort_1',
        axis: 'growth_mindset',
        question: "Do you see effort as a path to mastery, or as a sign that you're not naturally talented?",
        type: 'direct',
        context: "Effort beliefs",
        tier: 4,
        detects: ['growth', 'fixed'],
    },

    // -------------------------------------------------------------------------
    // 4.5 ADDITIONAL AXES
    // -------------------------------------------------------------------------

    // Change Readiness (Prochaska)
    {
        id: 'change_stage_1',
        axis: 'change_readiness',
        question: "Is there something about yourself or your life you've been thinking about changing?",
        type: 'direct',
        context: "Change contemplation",
        tier: 4,
        detects: ['contemplation', 'preparation'],
    },
    {
        id: 'change_stage_2',
        axis: 'change_readiness',
        question: "How ready do you feel to make changes in your life right now?",
        type: 'direct',
        context: "Change readiness",
        tier: 4,
        detects: ['all_stages'],
    },
    {
        id: 'change_action_1',
        axis: 'change_readiness',
        question: "Have you started taking steps toward something you want to change?",
        type: 'direct',
        context: "Action stage detection",
        tier: 4,
        detects: ['preparation', 'action'],
    },

    // Stress Response
    {
        id: 'stress_response_1',
        axis: 'stress_response',
        question: "When you're under stress, what's your first instinct - fight it, escape it, freeze up, or try to make everyone happy?",
        type: 'direct',
        context: "Stress response pattern",
        tier: 4,
        detects: ['fight', 'flight', 'freeze', 'fawn'],
    },
    {
        id: 'stress_response_2',
        axis: 'stress_response',
        question: "How do you usually react when you feel overwhelmed?",
        type: 'direct',
        context: "Overwhelm response",
        tier: 4,
        detects: ['all_responses'],
    },

    // Emotional Regulation
    {
        id: 'emotional_reg_1',
        axis: 'emotional_regulation',
        question: "When you're feeling something intense, do you tend to push it down, let it out, or try to think about it differently?",
        type: 'direct',
        context: "Regulation strategy",
        tier: 4,
        detects: ['suppression', 'expression', 'reappraisal'],
    },
    {
        id: 'emotional_reg_2',
        axis: 'emotional_regulation',
        question: "Do you find yourself replaying difficult thoughts or feelings over and over?",
        type: 'direct',
        context: "Rumination detection",
        tier: 4,
        detects: ['rumination'],
    },

    // Self-Efficacy
    {
        id: 'self_efficacy_1',
        axis: 'self_efficacy',
        question: "When you face a new challenge, do you generally feel confident you can figure it out?",
        type: 'direct',
        context: "General self-efficacy",
        tier: 4,
        detects: ['high', 'low'],
    },
    {
        id: 'self_efficacy_2',
        axis: 'self_efficacy',
        question: "Do you trust yourself to handle whatever life throws at you?",
        type: 'direct',
        context: "Coping confidence",
        tier: 4,
        detects: ['high', 'low'],
    },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all questions for a specific axis.
 */
export function getQuestionsForAxis(axis: AxisName): GuidingQuestion[] {
    return QUESTION_BANK.filter(q => q.axis === axis);
}

/**
 * Get all questions of a specific type for an axis.
 */
export function getQuestionsForAxisByType(axis: AxisName, type: QuestionType): GuidingQuestion[] {
    return QUESTION_BANK.filter(q => q.axis === axis && q.type === type);
}

/**
 * Get all questions for a specific tier.
 */
export function getQuestionsForTier(tier: 1 | 2 | 3 | 4): GuidingQuestion[] {
    return QUESTION_BANK.filter(q => q.tier === tier);
}

/**
 * Get a random question for a specific axis.
 */
export function getRandomQuestionForAxis(axis: AxisName): GuidingQuestion | null {
    const questions = getQuestionsForAxis(axis);
    if (questions.length === 0) return null;
    return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * Get a random question for an axis, excluding already-asked question IDs.
 */
export function getRandomQuestionForAxisExcluding(
    axis: AxisName,
    excludeIds: string[]
): GuidingQuestion | null {
    const questions = getQuestionsForAxis(axis).filter(q => !excludeIds.includes(q.id));
    if (questions.length === 0) return null;
    return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * Get a direct question for an axis (preferred for explicit gathering).
 */
export function getDirectQuestionForAxis(axis: AxisName): GuidingQuestion | null {
    const questions = getQuestionsForAxisByType(axis, 'direct');
    if (questions.length === 0) return null;
    return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * Get an indirect question for an axis (preferred for natural conversation).
 */
export function getIndirectQuestionForAxis(axis: AxisName): GuidingQuestion | null {
    const questions = getQuestionsForAxisByType(axis, 'indirect');
    if (questions.length === 0) {
        // Fallback to any question if no indirect ones
        return getRandomQuestionForAxis(axis);
    }
    return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * Get follow-up questions for an axis.
 */
export function getFollowUpQuestionsForAxis(axis: AxisName): GuidingQuestion[] {
    return getQuestionsForAxisByType(axis, 'follow_up');
}

/**
 * Get the best question for the highest priority axis.
 * Returns null if no priority axis found or no questions available.
 */
export function getNextGuidingQuestion(): GuidingQuestion | null {
    const priorityAxis = getHighestPriorityAxis();
    if (!priorityAxis) return null;

    return getRandomQuestionForAxis(priorityAxis.axis);
}

/**
 * Get the count of questions per axis.
 */
export function getQuestionCounts(): Record<AxisName, number> {
    const counts = {} as Record<AxisName, number>;
    for (const question of QUESTION_BANK) {
        counts[question.axis] = (counts[question.axis] || 0) + 1;
    }
    return counts;
}

/**
 * Get questions that detect a specific signal/value.
 */
export function getQuestionsDetecting(signal: string): GuidingQuestion[] {
    return QUESTION_BANK.filter(q => q.detects?.includes(signal));
}
