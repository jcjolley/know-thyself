import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { streamResponse, buildResponsePrompts, THINKING_MARKER } from '../main/claude.js';
import { runExtraction } from '../main/extraction.js';
import { assembleContext } from '../main/context.js';
import { getOrCreateConversation, saveMessage, getRecentMessages } from '../main/db/messages.js';
import {
    getConversationById,
    updateConversationTitle,
    generateTitleFromMessage,
    getMessageCount,
} from '../main/db/conversations.js';
import { checkBaselineStatus, updateGuidedModeState, getGuidedModeState } from '../main/guided-onboarding.js';
import type { Conversation } from '../shared/types.js';

interface ChatStreamMessage {
    type: 'chat:stream';
    conversationId?: string;
    content: string;
}

// Extended WebSocket with state tracking for heartbeat
const socketStates = new WeakMap<WebSocket, { isAlive: boolean }>();

export function setupWebSocket(wss: WebSocketServer): void {
    // Heartbeat to detect broken connections
    const interval = setInterval(() => {
        wss.clients.forEach((ws: WebSocket) => {
            const state = socketStates.get(ws);
            if (state?.isAlive === false) {
                ws.terminate();
                return;
            }
            if (state) {
                state.isAlive = false;
            }
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });

    wss.on('connection', (ws: WebSocket) => {
        socketStates.set(ws, { isAlive: true });

        ws.on('pong', () => {
            const state = socketStates.get(ws);
            if (state) {
                state.isAlive = true;
            }
        });

        ws.on('message', async (data: RawData) => {
            let message: ChatStreamMessage;
            try {
                message = JSON.parse(data.toString());
            } catch {
                ws.send(JSON.stringify({ type: 'chat:error', error: 'Invalid JSON' }));
                return;
            }

            if (message.type === 'chat:stream') {
                // Validate content is not empty
                if (!message.content || message.content.trim().length === 0) {
                    ws.send(JSON.stringify({ type: 'chat:error', error: 'Message content cannot be empty' }));
                    return;
                }
                await handleChatStream(ws, message);
            }
        });

        ws.on('error', (err: Error) => {
            console.error('[websocket] Error:', err);
        });
    });
}

async function handleChatStream(ws: WebSocket, message: ChatStreamMessage): Promise<void> {
    try {
        // Get or create conversation
        let conversation: Conversation & { title?: string };
        if (message.conversationId) {
            const existing = getConversationById(message.conversationId);
            if (!existing) {
                ws.send(JSON.stringify({ type: 'chat:error', error: `Conversation not found: ${message.conversationId}` }));
                return;
            }
            conversation = existing;
        } else {
            conversation = await getOrCreateConversation() as Conversation & { title?: string };
        }

        // Check if first message (for title generation)
        const messageCountBefore = getMessageCount(conversation.id);

        // Save user message
        const userMessage = await saveMessage(conversation.id, 'user', message.content);

        // Get recent history for context
        const recentMessages = getRecentMessages(conversation.id, 20);

        // Assemble context
        const context = await assembleContext(message.content, recentMessages, conversation.id);

        // Build prompt for logging
        const prompts = buildResponsePrompts(message.content, context);
        const fullPrompt = `=== SYSTEM PROMPT ===\n${prompts.system}\n\n=== USER PROMPT ===\n${prompts.user}`;

        // Stream response
        let fullResponse = '';
        for await (const chunk of streamResponse(message.content, context)) {
            // Check for thinking marker
            if (chunk === THINKING_MARKER) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'chat:thinking' }));
                }
                continue;
            }
            fullResponse += chunk;
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'chat:chunk', chunk }));
            }
        }

        // Save complete response (only if we got actual content)
        if (!fullResponse.trim()) {
            // Thinking model may have exhausted tokens during thinking phase
            const errorMsg = 'The model used all available tokens for thinking and produced no response. Try a shorter message or a different model.';
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'chat:error', error: errorMsg }));
            }
            return;
        }
        await saveMessage(conversation.id, 'assistant', fullResponse, fullPrompt);

        // Auto-generate title on first user message
        let newTitle: string | undefined;
        if (messageCountBefore === 0) {
            newTitle = generateTitleFromMessage(message.content);
            updateConversationTitle(conversation.id, newTitle);
        }

        // Run extraction in background
        runExtraction(userMessage.id, conversation.id)
            .then(() => {
                const baselineStatus = checkBaselineStatus();
                const state = getGuidedModeState(conversation.id);
                if (baselineStatus.baselineComplete && state.isActive) {
                    updateGuidedModeState(conversation.id, {
                        isActive: false,
                        deactivationReason: 'baseline_met',
                    });
                }
            })
            .catch(err => {
                console.error('[websocket] Extraction failed:', err);
            });

        // Send done with conversation info
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'chat:done',
                conversationId: conversation.id,
                title: newTitle,
            }));
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'chat:error', error: errorMessage }));
        }
    }
}
