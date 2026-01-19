# Know Thyself - Architecture Diagrams

Comprehensive Mermaid diagrams for understanding the Electron application architecture.

---

## 1. Architecture Overview (C4 Model)

### Level 1: System Context

Shows the system's place in the world - who uses it and what external systems it depends on.

```mermaid
C4Context
    title System Context Diagram - Know Thyself

    Person(user, "User", "Person seeking self-understanding through AI-guided reflection")

    System(knowThyself, "Know Thyself", "Desktop application for deep self-understanding through AI conversation and pattern recognition")

    System_Ext(anthropic, "Anthropic API", "Claude AI for conversation and insight extraction")
    System_Ext(huggingface, "HuggingFace Hub", "Model repository for ONNX embeddings")

    Rel(user, knowThyself, "Converses with", "Desktop UI")
    Rel(knowThyself, anthropic, "Sends messages, receives responses", "HTTPS/REST")
    Rel(knowThyself, huggingface, "Downloads models (first run)", "HTTPS")
```

### Level 2: Container Diagram

Shows the high-level technical building blocks and how they interact.

```mermaid
C4Container
    title Container Diagram - Know Thyself

    Person(user, "User", "Person seeking self-understanding")

    System_Boundary(electron, "Electron Application") {
        Container(renderer, "Renderer Process", "React, TypeScript", "User interface for chat and profile display")
        Container(preload, "Preload Script", "TypeScript", "Secure bridge exposing IPC APIs")
        Container(main, "Main Process", "Node.js, TypeScript", "Application core: IPC handlers, AI clients, database access")

        ContainerDb(sqlite, "SQLite Database", "better-sqlite3", "Structured data: conversations, values, challenges, signals")
        ContainerDb(lancedb, "LanceDB", "Vector Store", "Semantic search over messages and insights")
        Container(onnx, "ONNX Runtime", "voyage-4-nano", "Local embedding generation")
    }

    System_Ext(anthropic, "Anthropic API", "Claude Haiku 4.5")

    Rel(user, renderer, "Interacts with", "Electron Window")
    Rel(renderer, preload, "Calls", "window.api.*")
    Rel(preload, main, "IPC", "invoke/handle, send/on")
    Rel(main, sqlite, "Reads/Writes", "SQL")
    Rel(main, lancedb, "Stores/Searches", "Vectors")
    Rel(main, onnx, "Generates embeddings", "ONNX tensors")
    Rel(main, anthropic, "Chat completion", "HTTPS")
```

### Level 3: Component Diagram (Main Process)

Shows the internal components of the main process.

```mermaid
C4Component
    title Component Diagram - Main Process

    Container_Boundary(main, "Main Process") {
        Component(entry, "App Entry", "index.ts", "Electron lifecycle, window creation, initialization orchestration")
        Component(ipc, "IPC Handlers", "ipc.ts", "Routes renderer requests to appropriate services")
        Component(claude, "Claude Client", "claude.ts", "Anthropic SDK wrapper for chat and streaming")
        Component(embed, "Embeddings Service", "embeddings.ts", "ONNX model loading and inference")
        Component(sqliteService, "SQLite Service", "db/sqlite.ts", "Schema management and queries")
        Component(lanceService, "LanceDB Service", "db/lancedb.ts", "Vector storage and similarity search")
    }

    ContainerDb(sqliteDb, "SQLite", "know-thyself.db")
    ContainerDb(lanceDb, "LanceDB", "lancedb/")
    Container(onnxModel, "ONNX Model", "voyage-4-nano")
    System_Ext(anthropic, "Anthropic API")

    Rel(entry, ipc, "Registers handlers")
    Rel(entry, claude, "Initializes")
    Rel(entry, embed, "Loads async")
    Rel(entry, sqliteService, "Initializes")
    Rel(entry, lanceService, "Initializes")

    Rel(ipc, claude, "chat:send, chat:stream")
    Rel(ipc, embed, "embeddings:embed")
    Rel(ipc, sqliteService, "profile:get")
    Rel(ipc, lanceService, "Vector operations")

    Rel(claude, anthropic, "HTTPS")
    Rel(embed, onnxModel, "Inference")
    Rel(sqliteService, sqliteDb, "SQL")
    Rel(lanceService, lanceDb, "Vector I/O")
```

---

## 2. Dependency Graph

### Module Dependencies

Shows how source modules depend on each other, revealing layers and coupling.

```mermaid
flowchart TB
    subgraph External["External Dependencies"]
        electron["electron"]
        anthropic["@anthropic-ai/sdk"]
        onnx["onnxruntime-node"]
        tokenizers["tokenizers"]
        betterSqlite["better-sqlite3"]
        vectordb["vectordb (LanceDB)"]
        react["react"]
        vite["vite"]
    end

    subgraph MainProcess["Main Process Layer"]
        mainIndex["main/index.ts<br/>(entry point)"]
        mainIpc["main/ipc.ts"]
        mainClaude["main/claude.ts"]
        mainEmbed["main/embeddings.ts"]
        mainSqlite["main/db/sqlite.ts"]
        mainLance["main/db/lancedb.ts"]
    end

    subgraph PreloadLayer["Preload Layer"]
        preloadIndex["preload/index.ts"]
    end

    subgraph RendererLayer["Renderer Layer"]
        rendererMain["renderer/main.tsx"]
        rendererApp["renderer/App.tsx"]
    end

    subgraph SharedLayer["Shared Layer"]
        sharedTypes["shared/types.ts"]
    end

    %% Main process dependencies
    mainIndex --> mainIpc
    mainIndex --> mainClaude
    mainIndex --> mainEmbed
    mainIndex --> mainSqlite
    mainIndex --> mainLance
    mainIndex --> electron

    mainIpc --> mainClaude
    mainIpc --> mainEmbed
    mainIpc --> mainSqlite
    mainIpc --> mainLance
    mainIpc --> sharedTypes

    mainClaude --> anthropic
    mainClaude --> sharedTypes

    mainEmbed --> onnx
    mainEmbed --> tokenizers

    mainSqlite --> betterSqlite
    mainSqlite --> sharedTypes

    mainLance --> vectordb
    mainLance --> sharedTypes

    %% Preload dependencies
    preloadIndex --> electron

    %% Renderer dependencies
    rendererMain --> rendererApp
    rendererMain --> react
    rendererApp --> react
    rendererApp --> sharedTypes

    %% Cross-layer communication (IPC, not import)
    preloadIndex -.->|"IPC bridge"| mainIpc
    rendererApp -.->|"window.api"| preloadIndex

    style sharedTypes fill:#e1f5fe
    style mainIndex fill:#fff3e0
    style preloadIndex fill:#f3e5f5
    style rendererApp fill:#e8f5e9
```

### Package Dependency Layers

```mermaid
flowchart TB
    subgraph App["Application Layer"]
        direction LR
        UI["React UI"]
        IPC["IPC Handlers"]
    end

    subgraph Services["Service Layer"]
        direction LR
        Claude["Claude Client"]
        Embeddings["Embeddings"]
    end

    subgraph Data["Data Layer"]
        direction LR
        SQLite["SQLite"]
        LanceDB["LanceDB"]
    end

    subgraph Infra["Infrastructure"]
        direction LR
        Electron["Electron"]
        Node["Node.js APIs"]
    end

    App --> Services
    Services --> Data
    Data --> Infra
    Services --> Infra

    style App fill:#c8e6c9
    style Services fill:#fff9c4
    style Data fill:#ffccbc
    style Infra fill:#e1bee7
```

---

## 3. Data Flow Diagrams

### Chat Message Flow

Traces a user message from input to response display.

```mermaid
flowchart LR
    subgraph User["User Action"]
        Input["Type message<br/>+ click Send"]
    end

    subgraph Renderer["Renderer Process"]
        R1["setMessage(text)"]
        R2["setIsLoading(true)"]
        R3["Register listeners"]
        R4["stream(message)"]
        R5["Accumulate chunks"]
        R6["setResponse(text)"]
        R7["Display response"]
    end

    subgraph IPC["IPC Layer"]
        I1["ipcRenderer.send<br/>'chat:stream'"]
        I2["ipcMain.on<br/>'chat:stream'"]
        I3["event.reply<br/>'chat:chunk'"]
        I4["ipcRenderer.on<br/>'chat:chunk'"]
    end

    subgraph Main["Main Process"]
        M1["Get Claude client"]
        M2["streamMessage()"]
        M3["Async iterator"]
        M4["Yield text chunks"]
    end

    subgraph Claude["Anthropic API"]
        C1["messages.stream()"]
        C2["SSE events"]
    end

    Input --> R1 --> R2 --> R3 --> R4
    R4 --> I1 --> I2 --> M1 --> M2 --> C1
    C1 --> C2 --> M3 --> M4 --> I3 --> I4 --> R5 --> R6 --> R7

    style Input fill:#e3f2fd
    style R7 fill:#e8f5e9
```

### Embedding Generation Flow

```mermaid
flowchart LR
    subgraph Input["Input"]
        Text["Raw text string"]
    end

    subgraph Tokenization["Tokenization"]
        T1["Load tokenizer.json"]
        T2["Encode text"]
        T3["input_ids: number[]"]
        T4["attention_mask: number[]"]
    end

    subgraph Tensors["Tensor Creation"]
        Te1["BigInt64Array<br/>(input_ids)"]
        Te2["BigInt64Array<br/>(attention_mask)"]
        Te3["ort.Tensor<br/>int64"]
    end

    subgraph Inference["ONNX Inference"]
        O1["Load model_fp32.onnx"]
        O2["session.run()"]
        O3["Output tensor"]
    end

    subgraph Output["Output"]
        Out1["Float32Array"]
        Out2["number[2048]"]
    end

    Text --> T1 --> T2 --> T3 & T4
    T3 --> Te1 --> Te3
    T4 --> Te2 --> Te3
    Te3 --> O1 --> O2 --> O3 --> Out1 --> Out2

    style Text fill:#fff3e0
    style Out2 fill:#e8f5e9
```

### Application State Flow

```mermaid
flowchart TB
    subgraph Sources["Data Sources"]
        UserInput["User Input"]
        ClaudeAPI["Claude API"]
        SQLiteDB["SQLite DB"]
        EmbedModel["Embedding Model"]
    end

    subgraph State["React State (App.tsx)"]
        message["message: string"]
        response["response: string"]
        error["error: string | null"]
        isLoading["isLoading: boolean"]
        status["status: AppStatus"]
    end

    subgraph Effects["Side Effects"]
        StatusPoll["useEffect: poll status<br/>every 2 seconds"]
        ChatStream["handleSend:<br/>stream response"]
    end

    subgraph UI["UI Output"]
        InputField["Input TextField"]
        ResponseDisplay["Response Display"]
        StatusIndicators["Status Indicators"]
        ErrorBanner["Error Banner"]
    end

    UserInput -->|"onChange"| message
    ClaudeAPI -->|"chat:chunk"| response
    ClaudeAPI -->|"chat:error"| error
    ChatStream -->|"start/end"| isLoading
    SQLiteDB -->|"app:status"| status

    StatusPoll --> status
    message --> InputField
    response --> ResponseDisplay
    status --> StatusIndicators
    error --> ErrorBanner
    isLoading --> InputField

    style State fill:#e3f2fd
```

---

## 4. Entity-Relationship Diagram

### Complete Database Schema

```mermaid
erDiagram
    conversations ||--o{ messages : contains
    conversations ||--o{ conversation_summaries : has
    messages ||--o{ extractions : yields
    messages ||--o{ evidence : references

    extractions }o--|| user_values : creates
    extractions }o--|| challenges : creates
    extractions }o--|| maslow_signals : creates
    extractions }o--|| psychological_signals : creates
    extractions }o--|| activities : creates
    extractions }o--|| goals : creates

    user_values ||--o{ evidence : supported_by
    challenges ||--o{ evidence : supported_by
    maslow_signals ||--o{ evidence : supported_by

    profile_summary ||--|| profile_summary : singleton

    conversations {
        integer id PK
        text created_at
        text updated_at
    }

    messages {
        integer id PK
        integer conversation_id FK
        text role "user | assistant"
        text content
        text created_at
    }

    extractions {
        integer id PK
        integer message_id FK
        text extraction_type "value | challenge | maslow | etc"
        text raw_content
        text validated_content
        text status "raw | validated | rejected"
        text created_at
    }

    user_values {
        integer id PK
        text name UK
        text description
        text value_type "core | instrumental | contextual"
        real confidence "0.0 - 1.0"
        integer evidence_count
        text first_seen
        text last_reinforced
    }

    challenges {
        integer id PK
        text description
        text status "active | resolved | recurring"
        text first_mentioned
        text last_mentioned
        integer mention_count
    }

    maslow_signals {
        integer id PK
        text level "physiological | safety | belonging | esteem | self_actualization"
        text signal_type
        text description
        text created_at
    }

    psychological_signals {
        integer id PK
        text dimension
        text signal_type
        text description
        real intensity "0.0 - 1.0"
        text created_at
    }

    activities {
        integer id PK
        text name
        text category
        text sentiment "positive | negative | neutral"
        integer mention_count
        text first_mentioned
        text last_mentioned
    }

    goals {
        integer id PK
        text description
        text goal_type "short_term | long_term | life"
        text status "active | achieved | abandoned"
        text created_at
        text updated_at
    }

    evidence {
        integer id PK
        text target_type "value | challenge | maslow"
        integer target_id
        integer message_id FK
        text quote
        text created_at
    }

    conversation_summaries {
        integer id PK
        integer conversation_id FK
        text summary
        text key_topics
        text created_at
    }

    profile_summary {
        integer id PK "always 1"
        text computed_summary
        text narrative_summary
        text updated_at
    }
```

### Vector Database Schema

```mermaid
erDiagram
    messages_vectors {
        string id PK
        float_array vector "2048 dimensions"
        string content
        string role "user | assistant"
        string created_at
    }

    insights_vectors {
        string id PK
        float_array vector "2048 dimensions"
        string insight_type "value | challenge | pattern"
        string content
        string source_id FK "links to SQLite"
        string created_at
    }

    messages_vectors ||--o{ insights_vectors : "semantic similarity"
```

---

## 5. Sequence Diagrams

### Application Startup Sequence

```mermaid
sequenceDiagram
    autonumber
    participant E as Electron
    participant M as Main Process
    participant S as SQLite
    participant L as LanceDB
    participant C as Claude Client
    participant O as ONNX Embeddings
    participant W as BrowserWindow
    participant R as Renderer

    E->>M: app.whenReady()
    activate M

    rect rgb(232, 245, 233)
        Note over M,L: Phase 1: Database Initialization
        M->>S: initSQLite()
        S->>S: Create tables if not exist
        S->>S: Create indexes
        S-->>M: Database ready

        M->>L: initLanceDB()
        L->>L: Open/create database
        L->>L: Create tables (messages, insights)
        L-->>M: Vector store ready
    end

    rect rgb(255, 243, 224)
        Note over M,C: Phase 2: Claude Client Setup
        M->>C: initClaude()
        alt API Key Present
            C->>C: Validate key format
            C-->>M: Client initialized
        else API Key Missing
            C-->>M: Store error (non-blocking)
        end
    end

    rect rgb(227, 242, 253)
        Note over M,W: Phase 3: IPC & Window
        M->>M: registerIpcHandlers()
        M->>W: new BrowserWindow()
        W->>W: Configure security options
        W-->>M: Window created

        alt Development Mode
            W->>R: loadURL('http://localhost:5173')
        else Production Mode
            W->>R: loadFile('dist/renderer/index.html')
        end
        R-->>W: Page loaded
    end

    rect rgb(243, 229, 245)
        Note over M,O: Phase 4: Background Model Loading
        M->>O: initEmbeddings() [async]
        activate O
        O->>O: Check for cached model
        alt Model Not Cached
            O->>O: Download from HuggingFace
            O->>O: Save to userData/models/
        end
        O->>O: Load ONNX session
        O->>O: Load tokenizer
        O-->>M: Embeddings ready
        deactivate O
    end

    deactivate M

    loop Every 2 seconds
        R->>M: app:status (invoke)
        M-->>R: {embeddingsReady, databaseReady, claudeReady}
    end
```

### Chat Streaming Sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant R as React App
    participant P as Preload
    participant I as IPC Handler
    participant C as Claude Client
    participant A as Anthropic API

    U->>R: Type message + click Send
    activate R
    R->>R: setIsLoading(true)
    R->>R: setResponse('')
    R->>R: Register event listeners

    R->>P: window.api.chat.stream(message)
    P->>I: ipcRenderer.send('chat:stream', message)
    activate I

    I->>C: streamMessage(message)
    activate C
    C->>A: messages.stream({model, messages})
    activate A

    loop For each SSE event
        A-->>C: content_block_delta {text}
        C-->>I: yield text chunk
        I-->>P: event.reply('chat:chunk', {chunk, done: false})
        P-->>R: onChunk callback
        R->>R: setResponse(prev + chunk)
    end

    A-->>C: message_stop
    deactivate A
    C-->>I: generator complete
    deactivate C

    I-->>P: event.reply('chat:done')
    deactivate I
    P-->>R: onDone callback
    R->>R: setIsLoading(false)
    R->>R: removeAllListeners()
    deactivate R

    R-->>U: Display complete response
```

### Embedding and Vector Search Sequence

```mermaid
sequenceDiagram
    autonumber
    participant R as Renderer
    participant I as IPC Handler
    participant E as Embeddings Service
    participant T as Tokenizer
    participant O as ONNX Runtime
    participant L as LanceDB

    R->>I: embeddings:embed(text)
    activate I

    I->>E: embed(text, 'document')
    activate E

    E->>E: Check model loaded
    alt Model Not Ready
        E-->>I: throw Error('Model not loaded')
        I-->>R: reject(error)
    end

    E->>T: tokenizer.encode(text)
    activate T
    T-->>E: {ids: number[], attentionMask: number[]}
    deactivate T

    E->>E: Convert to BigInt64Array
    E->>E: Create ort.Tensor('int64', ...)

    E->>O: session.run({input_ids, attention_mask})
    activate O
    O->>O: Forward pass through model
    O-->>E: {embeddings: Tensor}
    deactivate O

    E->>E: Extract Float32Array
    E->>E: Convert to number[]
    E-->>I: number[2048]
    deactivate E

    I-->>R: resolve(vector)
    deactivate I

    Note over R,L: Later: Store and Search

    R->>I: (future) store message
    I->>L: addMessageEmbedding({id, vector, content, role})
    L->>L: Insert into 'messages' table

    R->>I: (future) search similar
    I->>L: searchSimilarMessages(queryVector, limit=5)
    L->>L: Vector similarity search
    L-->>I: Similar messages with distances
    I-->>R: Search results
```

### Profile Loading Sequence

```mermaid
sequenceDiagram
    autonumber
    participant R as React App
    participant P as Preload
    participant I as IPC Handler
    participant S as SQLite

    R->>P: window.api.profile.get()
    P->>I: ipcRenderer.invoke('profile:get')
    activate I

    par Parallel Queries
        I->>S: SELECT * FROM maslow_signals<br/>ORDER BY created_at DESC LIMIT 10
        S-->>I: MaslowSignal[]
    and
        I->>S: SELECT * FROM user_values<br/>ORDER BY confidence DESC LIMIT 5
        S-->>I: UserValue[]
    and
        I->>S: SELECT * FROM challenges<br/>WHERE status = 'active'<br/>ORDER BY mention_count DESC LIMIT 5
        S-->>I: Challenge[]
    end

    I->>I: Assemble ProfileSummary
    I-->>P: {maslow, values, challenges}
    deactivate I
    P-->>R: Promise<ProfileSummary>

    R->>R: Update UI with profile data
```

### Error Handling Sequence

```mermaid
sequenceDiagram
    autonumber
    participant R as React App
    participant P as Preload
    participant I as IPC Handler
    participant C as Claude Client
    participant A as Anthropic API

    R->>P: window.api.chat.stream(message)
    P->>I: ipcRenderer.send('chat:stream', message)
    activate I

    I->>C: streamMessage(message)
    activate C
    C->>A: messages.stream(...)
    activate A

    alt API Error (rate limit, auth, etc)
        A-->>C: Error response
        C-->>I: throw APIError
        I-->>P: event.reply('chat:error', error.message)
        P-->>R: onError callback
        R->>R: setError(message)
        R->>R: setIsLoading(false)
    else Network Error
        A--xC: Connection failed
        C-->>I: throw NetworkError
        I-->>P: event.reply('chat:error', 'Network error')
        P-->>R: onError callback
        R->>R: setError('Network error')
    else Success
        A-->>C: Stream completes
        C-->>I: Generator done
        I-->>P: event.reply('chat:done')
        P-->>R: onDone callback
    end

    deactivate A
    deactivate C
    deactivate I

    R->>R: removeAllListeners()
```

---

## Summary

These diagrams provide multiple perspectives on the architecture:

| Diagram Type | Purpose | Key Insights |
|--------------|---------|--------------|
| **C4 Context** | System boundaries | External dependencies on Anthropic API and HuggingFace |
| **C4 Container** | Process architecture | Three-process Electron model with dual databases |
| **C4 Component** | Internal structure | Service-oriented main process design |
| **Dependency Graph** | Module coupling | Clean layering, shared types at bottom |
| **Data Flow** | Runtime behavior | Streaming pattern for real-time responses |
| **ER Diagram** | Data model | Rich schema for psychological profiling |
| **Sequence Diagrams** | Temporal interactions | Async initialization, streaming, error handling |

### Key Architectural Decisions

1. **Context Isolation**: Renderer sandboxed from Node.js for security
2. **Dual Database**: SQLite for relations, LanceDB for vectors
3. **Local Embeddings**: Privacy-preserving on-device inference
4. **Streaming IPC**: Real-time response display via event pattern
5. **Non-blocking Init**: App opens before embeddings fully loaded
