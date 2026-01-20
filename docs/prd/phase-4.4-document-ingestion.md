# Phase 4.4: Document Ingestion

## Overview

Enable users to upload personal documents (journals, conversation exports) that get processed through the existing extraction pipeline, accelerating psychological profile building. The system parses various file formats, chunks text intelligently, and runs each chunk through extraction to populate the user's psychological profile.

## Problem Statement

Users accumulate years of self-reflection content in journals, ChatGPT/Claude exports, and other formats. Currently, they can only build their profile through real-time conversation with the system. Document ingestion allows them to:
- Bootstrap a rich profile from existing self-reflection data
- Get personalized advice immediately based on historical context
- Avoid re-explaining their entire life story through conversation

## Goals

- [ ] Accept file uploads via drag-and-drop and file picker
- [ ] Parse plain text (.txt), Markdown (.md), JSON exports (ChatGPT, Claude), and Day One exports
- [ ] Chunk documents intelligently (~500 tokens with overlap) while tracking source references
- [ ] Process each chunk through the existing extraction pipeline
- [ ] Show progress during processing of large documents
- [ ] Allow users to view and delete uploaded documents
- [ ] Integrate seamlessly with existing profile building

## Non-Goals

- Not building real-time document sync (one-time upload only)
- Not supporting email ingestion (requires careful privacy consideration - Priority 3)
- Not building OCR for scanned documents
- Not processing audio/video files
- Not changing the extraction pipeline itself (it already handles text)
- Not supporting Notion exports in this phase (Priority 2, can add later)
- Not building batch upload of many files at once (one file at a time)

---

## User Stories

### US-001: Drag and Drop File Upload
**As a** user
**I want** to drag a file onto the app window
**So that** I can quickly upload documents without navigating file dialogs

**Acceptance Criteria:**
- [ ] Given the app is open, when a user drags a .txt/.md/.json file over the window, then a drop zone indicator appears
- [ ] Given a file is dropped, when the file type is supported, then processing begins
- [ ] Given a file is dropped, when the file type is unsupported, then an error message displays
- [ ] Given a file is dropped, when the file is too large (>10MB), then an error message displays

### US-002: File Picker Upload
**As a** user
**I want** to click a button to open a file picker
**So that** I can select files from my filesystem

**Acceptance Criteria:**
- [ ] Given the documents panel is open, when user clicks "Upload Document", then native file picker opens
- [ ] File picker filters to supported extensions (.txt, .md, .json)
- [ ] Given a file is selected, when confirmed, then processing begins

### US-003: Plain Text Processing
**As a** user
**I want** to upload .txt journal files
**So that** my existing journal entries get analyzed

**Acceptance Criteria:**
- [ ] Given a .txt file is uploaded, when processing, then content is extracted as plain text
- [ ] Line breaks are preserved for context
- [ ] File encoding is handled (UTF-8 assumed, fallback to Latin-1)

### US-004: Markdown Processing
**As a** user
**I want** to upload .md files
**So that** my markdown notes and journals get analyzed

**Acceptance Criteria:**
- [ ] Given a .md file is uploaded, when processing, then markdown is converted to plain text
- [ ] Headers, lists, and basic formatting are preserved as readable text
- [ ] Code blocks are excluded (not self-reflection content)
- [ ] Links are converted to text (link text preserved, URLs removed)

### US-005: ChatGPT/Claude Export Processing
**As a** user
**I want** to upload conversation exports from ChatGPT or Claude
**So that** my past AI conversations inform my profile

**Acceptance Criteria:**
- [ ] Given a ChatGPT export JSON, when processing, then user messages are extracted
- [ ] Given a Claude export JSON, when processing, then human messages are extracted
- [ ] Assistant/AI messages are excluded (only user self-expression matters)
- [ ] Conversation metadata (timestamps, titles) is preserved for source tracking

### US-006: Day One Export Processing
**As a** user
**I want** to upload Day One journal exports
**So that** my existing journal entries get analyzed

**Acceptance Criteria:**
- [ ] Given a Day One JSON export, when processing, then journal entries are extracted
- [ ] Entry dates are preserved for source tracking
- [ ] Entry tags/metadata are included for context
- [ ] Photos/attachments are skipped (text only)

### US-007: Text Chunking
**As a** system component
**I want** to chunk documents into ~500 token segments with overlap
**So that** each chunk can be processed by the extraction pipeline without losing context

**Acceptance Criteria:**
- [ ] Given a document, when chunking, then chunks target ~500 tokens
- [ ] Chunks have ~100 token overlap with previous chunk
- [ ] Chunks break at natural boundaries (paragraphs, sentences) when possible
- [ ] Each chunk includes source reference (file name, position, date if available)
- [ ] Very short documents (<500 tokens) are processed as single chunk

### US-008: Processing Progress Indicator
**As a** user
**I want** to see progress during document processing
**So that** I know the system is working and approximately how long to wait

**Acceptance Criteria:**
- [ ] Given processing starts, when chunks are being processed, then progress bar shows current/total chunks
- [ ] Progress updates in real-time as each chunk completes
- [ ] Estimated time remaining is displayed for large documents
- [ ] Processing can be cancelled mid-way

### US-009: Document Management View
**As a** user
**I want** to see a list of uploaded documents
**So that** I can track what has been processed

**Acceptance Criteria:**
- [ ] Documents panel shows list of all uploaded documents
- [ ] Each document shows: filename, upload date, processing status, chunk count
- [ ] Documents can be sorted by date or name
- [ ] Click on document shows source info and extracted insights count

### US-010: Document Deletion
**As a** user
**I want** to delete an uploaded document
**So that** I can remove content I no longer want in my profile

**Acceptance Criteria:**
- [ ] Given a document is selected, when delete is clicked, then confirmation dialog appears
- [ ] Given deletion is confirmed, when processing, then document record is removed
- [ ] Extractions from that document are marked as "from_deleted_source" (not deleted, to preserve profile)
- [ ] Evidence quotes from deleted documents show "[deleted source]" indicator

---

## Phases

### Phase 1: Database Schema & Types

Create the data layer for document storage and tracking.

#### 1.1 Add Document Tables
**File:** `src/main/db/sqlite.ts`

Add to SCHEMA:

```sql
-- Uploaded documents
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_path TEXT,
    file_type TEXT NOT NULL CHECK (file_type IN ('txt', 'md', 'json_chatgpt', 'json_claude', 'json_dayone')),
    file_size INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    chunk_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Document chunks (for tracking and re-processing)
CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    source_reference TEXT,
    extraction_id TEXT REFERENCES extractions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
```

#### 1.2 Add Document Types
**File:** `src/shared/types.ts`

```typescript
// =============================================================================
// Document Ingestion Types
// =============================================================================

export type DocumentFileType = 'txt' | 'md' | 'json_chatgpt' | 'json_claude' | 'json_dayone';
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Document {
    id: string;
    filename: string;
    original_path: string | null;
    file_type: DocumentFileType;
    file_size: number;
    content_hash: string;
    chunk_count: number;
    status: DocumentStatus;
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
}

export interface DocumentChunk {
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    token_count: number | null;
    source_reference: string | null;
    extraction_id: string | null;
    created_at: string;
}

export interface DocumentUploadResult {
    document: Document;
    success: boolean;
    error?: string;
}

export interface DocumentProcessingProgress {
    document_id: string;
    status: 'started' | 'processing' | 'completed' | 'failed' | 'cancelled';
    current_chunk: number;
    total_chunks: number;
    error?: string;
}

export interface DocumentSummary {
    id: string;
    filename: string;
    file_type: DocumentFileType;
    status: DocumentStatus;
    chunk_count: number;
    extraction_count: number;
    created_at: string;
    completed_at: string | null;
}
```

### Phase 2: File Parsing

Implement parsers for each supported file format.

#### 2.1 Create Parser Module
**File:** `src/main/document-parser.ts`

```typescript
import type { DocumentFileType } from '../shared/types.js';

export interface ParsedDocument {
    entries: ParsedEntry[];
    metadata: DocumentMetadata;
}

export interface ParsedEntry {
    content: string;
    timestamp?: string;
    title?: string;
    source_hint?: string;  // e.g., "ChatGPT conversation: Career advice"
}

export interface DocumentMetadata {
    entry_count: number;
    date_range?: { earliest: string; latest: string };
    source_type: string;
}

// Detect file type from content and extension
export function detectFileType(filename: string, content: string): DocumentFileType;

// Parse document based on type
export function parseDocument(content: string, fileType: DocumentFileType): ParsedDocument;

// Individual parsers
export function parsePlainText(content: string): ParsedDocument;
export function parseMarkdown(content: string): ParsedDocument;
export function parseChatGPTExport(content: string): ParsedDocument;
export function parseClaudeExport(content: string): ParsedDocument;
export function parseDayOneExport(content: string): ParsedDocument;
```

#### 2.2 Implement Plain Text Parser
**File:** `src/main/document-parser.ts`

```typescript
export function parsePlainText(content: string): ParsedDocument {
    // Attempt to split by common journal delimiters:
    // - Date headers (e.g., "January 15, 2024", "2024-01-15", "Monday, January 15")
    // - Horizontal rules (---, ***, ===)
    // - Multiple blank lines

    const entries = splitByDateHeaders(content);

    return {
        entries: entries.map(e => ({
            content: e.text,
            timestamp: e.date,
            source_hint: e.date ? `Journal entry: ${e.date}` : undefined,
        })),
        metadata: {
            entry_count: entries.length,
            date_range: extractDateRange(entries),
            source_type: 'plain_text',
        },
    };
}
```

#### 2.3 Implement ChatGPT Export Parser
**File:** `src/main/document-parser.ts`

ChatGPT exports are JSON with structure:
```json
{
  "title": "Conversation Title",
  "mapping": {
    "node_id": {
      "message": {
        "author": { "role": "user" | "assistant" },
        "content": { "parts": ["message text"] }
      }
    }
  }
}
```

```typescript
export function parseChatGPTExport(content: string): ParsedDocument {
    const data = JSON.parse(content);
    const entries: ParsedEntry[] = [];

    // Extract only user messages
    for (const node of Object.values(data.mapping || {})) {
        if (node.message?.author?.role === 'user') {
            const text = node.message.content?.parts?.join('\n') || '';
            if (text.trim()) {
                entries.push({
                    content: text,
                    title: data.title,
                    source_hint: `ChatGPT: ${data.title || 'Untitled conversation'}`,
                });
            }
        }
    }

    return {
        entries,
        metadata: {
            entry_count: entries.length,
            source_type: 'chatgpt_export',
        },
    };
}
```

#### 2.4 Implement Claude Export Parser
**File:** `src/main/document-parser.ts`

Claude exports are JSON with structure:
```json
{
  "name": "Conversation Name",
  "chat_messages": [
    { "sender": "human" | "assistant", "text": "message" }
  ]
}
```

```typescript
export function parseClaudeExport(content: string): ParsedDocument {
    const data = JSON.parse(content);
    const entries: ParsedEntry[] = [];

    for (const msg of data.chat_messages || []) {
        if (msg.sender === 'human' && msg.text?.trim()) {
            entries.push({
                content: msg.text,
                title: data.name,
                source_hint: `Claude: ${data.name || 'Untitled conversation'}`,
            });
        }
    }

    return {
        entries,
        metadata: {
            entry_count: entries.length,
            source_type: 'claude_export',
        },
    };
}
```

#### 2.5 Implement Day One Export Parser
**File:** `src/main/document-parser.ts`

Day One exports are JSON:
```json
{
  "entries": [
    {
      "text": "Journal entry text",
      "creationDate": "2024-01-15T10:30:00Z",
      "tags": ["reflection", "goals"]
    }
  ]
}
```

### Phase 3: Text Chunking

Implement intelligent text chunking with overlap.

#### 3.1 Create Chunking Module
**File:** `src/main/document-chunker.ts`

```typescript
export interface ChunkOptions {
    target_tokens: number;    // Default: 500
    overlap_tokens: number;   // Default: 100
    min_chunk_tokens: number; // Default: 50
}

export interface Chunk {
    content: string;
    token_count: number;
    start_position: number;
    end_position: number;
    source_reference: string;
}

// Chunk a parsed document's entries
export function chunkDocument(
    entries: ParsedEntry[],
    documentId: string,
    filename: string,
    options?: Partial<ChunkOptions>
): Chunk[];

// Estimate token count (simple approximation)
export function estimateTokens(text: string): number;

// Find natural break points
export function findBreakPoint(text: string, targetPosition: number): number;
```

#### 3.2 Implement Chunking Logic
**File:** `src/main/document-chunker.ts`

```typescript
const DEFAULT_OPTIONS: ChunkOptions = {
    target_tokens: 500,
    overlap_tokens: 100,
    min_chunk_tokens: 50,
};

export function chunkDocument(
    entries: ParsedEntry[],
    documentId: string,
    filename: string,
    options?: Partial<ChunkOptions>
): Chunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const chunks: Chunk[] = [];

    // Combine all entries into one text with preserved source hints
    let combinedText = '';
    const sourceMarkers: { position: number; hint: string }[] = [];

    for (const entry of entries) {
        sourceMarkers.push({
            position: combinedText.length,
            hint: entry.source_hint || filename,
        });
        combinedText += entry.content + '\n\n';
    }

    // Chunk the combined text
    let position = 0;
    let chunkIndex = 0;

    while (position < combinedText.length) {
        const targetEnd = position + (opts.target_tokens * 4); // ~4 chars per token
        const breakPoint = findBreakPoint(combinedText, Math.min(targetEnd, combinedText.length));

        const chunkText = combinedText.slice(position, breakPoint).trim();
        const tokenCount = estimateTokens(chunkText);

        if (tokenCount >= opts.min_chunk_tokens) {
            const sourceRef = findSourceReference(sourceMarkers, position, filename);
            chunks.push({
                content: chunkText,
                token_count: tokenCount,
                start_position: position,
                end_position: breakPoint,
                source_reference: sourceRef,
            });
            chunkIndex++;
        }

        // Move forward with overlap
        const overlapChars = opts.overlap_tokens * 4;
        position = breakPoint - overlapChars;
        if (position <= chunks[chunks.length - 1]?.start_position) {
            position = breakPoint; // Prevent infinite loop
        }
    }

    return chunks;
}

export function estimateTokens(text: string): number {
    // Simple approximation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
}

export function findBreakPoint(text: string, targetPosition: number): number {
    if (targetPosition >= text.length) return text.length;

    // Look for paragraph break within 200 chars
    const paragraphBreak = text.lastIndexOf('\n\n', targetPosition);
    if (paragraphBreak > targetPosition - 200 && paragraphBreak > 0) {
        return paragraphBreak + 2;
    }

    // Look for sentence break
    const sentenceBreak = findLastSentenceBreak(text, targetPosition);
    if (sentenceBreak > targetPosition - 100 && sentenceBreak > 0) {
        return sentenceBreak;
    }

    // Fall back to target position
    return targetPosition;
}
```

### Phase 4: Processing Pipeline

Integrate parsing, chunking, and extraction.

#### 4.1 Create Document Processing Service
**File:** `src/main/document-processor.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from './db/sqlite.js';
import { parseDocument, detectFileType } from './document-parser.js';
import { chunkDocument } from './document-chunker.js';
import { runExtraction } from './extraction.js';
import type { Document, DocumentProcessingProgress } from '../shared/types.js';

export type ProcessingProgressCallback = (progress: DocumentProcessingProgress) => void;

export async function processDocument(
    filename: string,
    content: string,
    onProgress?: ProcessingProgressCallback
): Promise<Document> {
    const db = getDb();
    const documentId = uuidv4();
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    // Check for duplicate
    const existing = db.prepare(
        'SELECT id FROM documents WHERE content_hash = ?'
    ).get(contentHash);
    if (existing) {
        throw new Error('This document has already been uploaded');
    }

    // Detect file type
    const fileType = detectFileType(filename, content);

    // Create document record
    db.prepare(`
        INSERT INTO documents (id, filename, file_type, file_size, content_hash, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(documentId, filename, fileType, content.length, contentHash);

    try {
        // Parse document
        const parsed = parseDocument(content, fileType);

        // Chunk document
        const chunks = chunkDocument(parsed.entries, documentId, filename);

        // Update chunk count
        db.prepare('UPDATE documents SET chunk_count = ?, status = ? WHERE id = ?')
            .run(chunks.length, 'processing', documentId);

        onProgress?.({
            document_id: documentId,
            status: 'started',
            current_chunk: 0,
            total_chunks: chunks.length,
        });

        // Process each chunk through extraction
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Create a synthetic message for the extraction pipeline
            const messageId = uuidv4();
            const conversationId = `document:${documentId}`;

            db.prepare(`
                INSERT INTO messages (id, conversation_id, role, content, created_at)
                VALUES (?, ?, 'user', ?, datetime('now'))
            `).run(messageId, conversationId, chunk.content);

            // Store chunk record
            const chunkId = uuidv4();
            db.prepare(`
                INSERT INTO document_chunks (id, document_id, chunk_index, content, token_count, source_reference)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(chunkId, documentId, i, chunk.content, chunk.token_count, chunk.source_reference);

            // Run extraction
            const extraction = await runExtraction(messageId, conversationId);

            // Link extraction to chunk
            db.prepare('UPDATE document_chunks SET extraction_id = ? WHERE id = ?')
                .run(extraction.id, chunkId);

            onProgress?.({
                document_id: documentId,
                status: 'processing',
                current_chunk: i + 1,
                total_chunks: chunks.length,
            });
        }

        // Mark complete
        db.prepare(`
            UPDATE documents SET status = 'completed', completed_at = datetime('now')
            WHERE id = ?
        `).run(documentId);

        onProgress?.({
            document_id: documentId,
            status: 'completed',
            current_chunk: chunks.length,
            total_chunks: chunks.length,
        });

    } catch (err) {
        db.prepare('UPDATE documents SET status = ?, error_message = ? WHERE id = ?')
            .run('failed', err instanceof Error ? err.message : 'Unknown error', documentId);

        onProgress?.({
            document_id: documentId,
            status: 'failed',
            current_chunk: 0,
            total_chunks: 0,
            error: err instanceof Error ? err.message : 'Unknown error',
        });

        throw err;
    }

    return getDocumentById(documentId)!;
}

export function getDocumentById(id: string): Document | null {
    return getDb().prepare('SELECT * FROM documents WHERE id = ?').get(id) as Document | null;
}

export function getAllDocuments(): Document[] {
    return getDb().prepare(
        'SELECT * FROM documents ORDER BY created_at DESC'
    ).all() as Document[];
}

export function deleteDocument(id: string): void {
    const db = getDb();

    // Mark extractions as from deleted source rather than deleting
    db.prepare(`
        UPDATE extractions SET validation_errors =
            COALESCE(validation_errors || ', ', '') || 'source_document_deleted'
        WHERE message_id IN (
            SELECT m.id FROM messages m
            WHERE m.conversation_id = 'document:' || ?
        )
    `).run(id);

    // Delete document (cascades to chunks)
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
}
```

### Phase 5: IPC Handlers & Preload

Expose document functionality to renderer.

#### 5.1 Add IPC Handlers
**File:** `src/main/ipc.ts`

Add document handlers:

```typescript
import { ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import {
    processDocument,
    getAllDocuments,
    getDocumentById,
    deleteDocument,
} from './document-processor.js';

// File picker
ipcMain.handle('documents:pick-file', async () => {
    const result = await dialog.showOpenDialog({
        filters: [
            { name: 'Supported Files', extensions: ['txt', 'md', 'json'] },
        ],
        properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    const filePath = result.filePaths[0];
    const content = await fs.readFile(filePath, 'utf-8');
    const filename = path.basename(filePath);

    return { filename, content, path: filePath };
});

// Process uploaded document
ipcMain.on('documents:process', async (event, { filename, content }) => {
    try {
        await processDocument(filename, content, (progress) => {
            event.reply('documents:progress', progress);
        });
    } catch (err) {
        event.reply('documents:error', {
            error: err instanceof Error ? err.message : 'Processing failed',
        });
    }
});

// Get all documents
ipcMain.handle('documents:list', async () => {
    return getAllDocuments();
});

// Get document details
ipcMain.handle('documents:get', async (_, id: string) => {
    return getDocumentById(id);
});

// Delete document
ipcMain.handle('documents:delete', async (_, id: string) => {
    deleteDocument(id);
    return { success: true };
});
```

#### 5.2 Update Preload
**File:** `src/preload/index.ts`

Add document API:

```typescript
documents: {
    pickFile: () => ipcRenderer.invoke('documents:pick-file'),
    process: (filename: string, content: string) => {
        ipcRenderer.send('documents:process', { filename, content });
    },
    onProgress: (callback: (progress: DocumentProcessingProgress) => void) => {
        ipcRenderer.on('documents:progress', (_, progress) => callback(progress));
    },
    onError: (callback: (error: { error: string }) => void) => {
        ipcRenderer.on('documents:error', (_, error) => callback(error));
    },
    removeProgressListeners: () => {
        ipcRenderer.removeAllListeners('documents:progress');
        ipcRenderer.removeAllListeners('documents:error');
    },
    list: () => ipcRenderer.invoke('documents:list'),
    get: (id: string) => ipcRenderer.invoke('documents:get', id),
    delete: (id: string) => ipcRenderer.invoke('documents:delete', id),
},
```

#### 5.3 Update ElectronAPI Type
**File:** `src/shared/types.ts`

Add to ElectronAPI interface:

```typescript
documents: {
    pickFile: () => Promise<{ filename: string; content: string; path: string } | null>;
    process: (filename: string, content: string) => void;
    onProgress: (callback: (progress: DocumentProcessingProgress) => void) => void;
    onError: (callback: (error: { error: string }) => void) => void;
    removeProgressListeners: () => void;
    list: () => Promise<Document[]>;
    get: (id: string) => Promise<Document | null>;
    delete: (id: string) => Promise<{ success: boolean }>;
};
```

### Phase 6: UI Components

Build the document management interface.

#### 6.1 Create Documents Panel Component
**File:** `src/renderer/components/DocumentsPanel.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import type { Document, DocumentProcessingProgress } from '../../shared/types';

export function DocumentsPanel() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [processing, setProcessing] = useState<DocumentProcessingProgress | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load documents on mount
    useEffect(() => {
        loadDocuments();

        // Set up progress listeners
        window.api.documents.onProgress((progress) => {
            setProcessing(progress);
            if (progress.status === 'completed' || progress.status === 'failed') {
                loadDocuments();
                if (progress.status === 'completed') {
                    setProcessing(null);
                }
            }
        });

        window.api.documents.onError((err) => {
            setError(err.error);
            setProcessing(null);
        });

        return () => {
            window.api.documents.removeProgressListeners();
        };
    }, []);

    const loadDocuments = async () => {
        const docs = await window.api.documents.list();
        setDocuments(docs);
    };

    const handleFilePick = async () => {
        const file = await window.api.documents.pickFile();
        if (file) {
            processFile(file.filename, file.content);
        }
    };

    const processFile = (filename: string, content: string) => {
        setError(null);
        setProcessing({
            document_id: '',
            status: 'started',
            current_chunk: 0,
            total_chunks: 0,
        });
        window.api.documents.process(filename, content);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const file = e.dataTransfer.files[0];
        if (!file) return;

        // Validate file type
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['txt', 'md', 'json'].includes(ext || '')) {
            setError('Unsupported file type. Please upload .txt, .md, or .json files.');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            setError('File too large. Maximum size is 10MB.');
            return;
        }

        // Read file content
        const reader = new FileReader();
        reader.onload = () => {
            processFile(file.name, reader.result as string);
        };
        reader.readAsText(file);
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm('Delete this document? Extracted insights will be preserved.')) {
            await window.api.documents.delete(id);
            loadDocuments();
        }
    };

    return (
        <div className="documents-panel">
            <h2>Your Documents</h2>

            {/* Drop zone */}
            <div
                className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
                <p>Drag and drop a file here, or</p>
                <button onClick={handleFilePick}>Choose File</button>
                <p className="hint">Supported: .txt, .md, .json (ChatGPT/Claude exports, Day One)</p>
            </div>

            {/* Error message */}
            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {/* Processing progress */}
            {processing && (
                <div className="processing-indicator">
                    <p>Processing: {processing.current_chunk} / {processing.total_chunks} chunks</p>
                    <progress value={processing.current_chunk} max={processing.total_chunks} />
                </div>
            )}

            {/* Document list */}
            <div className="document-list">
                {documents.map((doc) => (
                    <div key={doc.id} className="document-item">
                        <div className="document-info">
                            <span className="filename">{doc.filename}</span>
                            <span className="meta">
                                {doc.chunk_count} chunks | {doc.status}
                            </span>
                            <span className="date">
                                {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <button
                            className="delete-btn"
                            onClick={() => handleDelete(doc.id)}
                        >
                            Delete
                        </button>
                    </div>
                ))}

                {documents.length === 0 && !processing && (
                    <p className="empty-state">
                        No documents uploaded yet. Upload your journals or conversation exports
                        to build your profile faster.
                    </p>
                )}
            </div>
        </div>
    );
}
```

#### 6.2 Add Styles
**File:** `src/renderer/styles/documents.css`

```css
.documents-panel {
    padding: 20px;
    max-width: 600px;
}

.drop-zone {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 40px;
    text-align: center;
    margin-bottom: 20px;
    transition: border-color 0.2s, background-color 0.2s;
}

.drop-zone.drag-over {
    border-color: #4a90d9;
    background-color: #f0f7ff;
}

.drop-zone .hint {
    font-size: 0.85em;
    color: #666;
    margin-top: 10px;
}

.processing-indicator {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.processing-indicator progress {
    width: 100%;
    height: 8px;
    margin-top: 10px;
}

.document-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.document-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: #f9f9f9;
    border-radius: 6px;
}

.document-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.document-info .filename {
    font-weight: 500;
}

.document-info .meta {
    font-size: 0.85em;
    color: #666;
}

.document-info .date {
    font-size: 0.8em;
    color: #999;
}

.error-banner {
    background: #fee;
    border: 1px solid #fcc;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.empty-state {
    text-align: center;
    color: #666;
    padding: 40px;
}
```

### Phase 7: Integration & Navigation

Wire up the documents panel in the main app.

#### 7.1 Add Documents Tab
**File:** `src/renderer/App.tsx`

Add documents panel to the UI (modify existing):

```typescript
import { DocumentsPanel } from './components/DocumentsPanel';

// Add tab state
const [activeTab, setActiveTab] = useState<'chat' | 'profile' | 'documents'>('chat');

// In render:
<nav className="app-tabs">
    <button onClick={() => setActiveTab('chat')}>Chat</button>
    <button onClick={() => setActiveTab('profile')}>Your Self-Portrait</button>
    <button onClick={() => setActiveTab('documents')}>Documents</button>
</nav>

{activeTab === 'documents' && <DocumentsPanel />}
```

### Phase 8: Testing

Comprehensive tests for document ingestion.

#### 8.1 Parser Tests
**File:** `tests/document-parser.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('Document Parser', () => {
    // Test file type detection
    // Test plain text parsing
    // Test markdown parsing
    // Test ChatGPT export parsing
    // Test Claude export parsing
    // Test Day One export parsing
});
```

#### 8.2 Chunking Tests
**File:** `tests/document-chunker.spec.ts`

```typescript
test.describe('Document Chunker', () => {
    // Test chunk size targeting
    // Test overlap calculation
    // Test natural break points
    // Test source reference tracking
    // Test small document handling
});
```

#### 8.3 Integration Tests
**File:** `tests/document-ingestion.spec.ts`

```typescript
test.describe('Document Ingestion', () => {
    test.beforeAll(async () => { await launchApp(); });
    test.afterAll(async () => { await closeApp(); });

    test('US-001: Drag and drop upload', async () => {
        // Test drag and drop behavior
    });

    test('US-002: File picker upload', async () => {
        // Test file picker flow
    });

    test('US-008: Processing progress indicator', async () => {
        // Test progress updates
    });

    test('US-010: Document deletion', async () => {
        // Test deletion preserves extractions
    });
});
```

---

## Technical Specifications

### Data Models

```typescript
// Document metadata stored in SQLite
interface Document {
    id: string;              // UUID
    filename: string;        // Original filename
    file_type: DocumentFileType;
    file_size: number;       // Bytes
    content_hash: string;    // SHA-256 for deduplication
    chunk_count: number;
    status: DocumentStatus;
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
}

// Individual chunks for tracking
interface DocumentChunk {
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    token_count: number | null;
    source_reference: string | null;  // "journal-2024.txt, entry 3"
    extraction_id: string | null;
}
```

### Chunking Strategy

- **Target size**: 500 tokens (~2000 characters)
- **Overlap**: 100 tokens (~400 characters) to preserve context across chunks
- **Break points**: Prefer paragraph breaks > sentence breaks > arbitrary position
- **Minimum chunk**: 50 tokens to avoid trivial chunks
- **Source tracking**: Each chunk knows its origin file and approximate position

### File Size Limits

- Maximum file size: 10MB
- Rationale: Prevents memory issues and excessive API costs
- Very large files should be split by user before upload

### Duplicate Detection

- SHA-256 hash of file content stored with document
- Reject uploads that match existing hash
- Provides "this file was already uploaded" message

---

## Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/main/document-parser.ts` | Parse various file formats into text entries |
| `src/main/document-chunker.ts` | Chunk text with overlap and source tracking |
| `src/main/document-processor.ts` | Orchestrate parsing, chunking, and extraction |
| `src/renderer/components/DocumentsPanel.tsx` | Upload UI and document management |
| `src/renderer/styles/documents.css` | Document panel styles |
| `tests/document-parser.spec.ts` | Parser unit tests |
| `tests/document-chunker.spec.ts` | Chunker unit tests |
| `tests/document-ingestion.spec.ts` | Integration tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/main/db/sqlite.ts` | Add documents and document_chunks tables |
| `src/main/ipc.ts` | Add document IPC handlers |
| `src/preload/index.ts` | Expose document API to renderer |
| `src/shared/types.ts` | Add document types |
| `src/renderer/App.tsx` | Add documents tab |

---

## Quality Gates

- `make typecheck` - Type checking passes
- `make lint` - No linting errors
- `make test` - All tests pass (including new document tests)
- `make build` - Build succeeds

### Post-Verification: Code Simplification

After all quality gates pass, run the code simplifier and re-verify:

1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates above
3. Repeat until no further simplifications are made

---

## Verification Checklist

1. [ ] Drag file onto window -> drop zone indicator appears
2. [ ] Drop .txt file -> processing starts, progress shows
3. [ ] Drop .json ChatGPT export -> only user messages extracted
4. [ ] Drop unsupported file type -> error message displays
5. [ ] Drop file >10MB -> error message displays
6. [ ] Click "Choose File" -> native file picker opens with filters
7. [ ] Upload duplicate file -> "already uploaded" error
8. [ ] Progress bar updates as chunks process
9. [ ] Document appears in list after processing completes
10. [ ] Delete document -> removed from list, extractions preserved
11. [ ] View profile after upload -> new values/challenges appear
12. [ ] Large document (~1000 chunks) -> processes without memory issues
13. [ ] Cancel processing mid-way -> status shows "cancelled"

---

## Implementation Order

1. Add document tables to SQLite schema
2. Add document types to shared/types.ts
3. Create document-parser.ts with plain text parser
4. Add markdown parser
5. Add ChatGPT export parser
6. Add Claude export parser
7. Add Day One export parser
8. Create document-chunker.ts
9. Create document-processor.ts
10. Add IPC handlers for documents
11. Update preload with document API
12. Create DocumentsPanel component
13. Add documents tab to App.tsx
14. Add styles
15. Write parser tests
16. Write chunker tests
17. Write integration tests
18. Run `make check` and fix issues
19. Run code simplifier and re-verify

---

## Open Questions

- [ ] Should we support batch upload of multiple files?
  - **Current decision**: Single file at a time for simplicity
- [ ] Should processing be cancellable?
  - **Current decision**: Yes, add cancel functionality
- [ ] How to handle very large ChatGPT exports with hundreds of conversations?
  - **Current decision**: Process all; consider pagination in future

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large files cause memory issues | High | 10MB limit, streaming read if needed |
| ChatGPT/Claude export format changes | Medium | Graceful fallback, version detection |
| API costs from many extractions | Medium | Show cost estimate before processing |
| Duplicate content from overlapping chunks | Low | Overlap is small, extraction handles duplicates |
| Non-UTF8 encoded files | Low | Try UTF-8, fall back to Latin-1, show warning |
