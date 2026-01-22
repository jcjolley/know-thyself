import { contextBridge, ipcRenderer } from "electron";

// Define the ReanalyzeProgress interface inline to avoid import issues
interface ReanalyzeProgress {
  status: "started" | "processing" | "completed" | "error";
  current: number;
  total: number;
  error?: string;
}

// Define ChatStreamDonePayload inline to avoid import issues
interface ChatStreamDonePayload {
  conversationId: string;
  title?: string;
}

// Define ApiKeyStatus inline to avoid import issues
interface ApiKeyStatus {
  hasKey: boolean;
  source: "stored" | "env" | "none";
  maskedKey: string | null;
  encryptionAvailable: boolean;
}

interface JourneyInfo {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: "foundation" | "understanding" | "deeper";
  axes: string[];
  systemPrompt: string;
}

interface JourneyStartResult {
  conversationId: string;
  journeyId: string;
  title: string;
}

// LLM Backend types
type BackendType = "ollama" | "claude";

interface LLMConfig {
  backend: BackendType;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  claudeApiKey?: string;
  claudeModel?: string;
}

interface LLMStatus {
  backend: BackendType;
  connected: boolean;
  error?: string;
  model?: string;
}

interface OllamaModel {
  name: string;
  size: number;
  modifiedAt: string;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameterSize: string;
    quantizationLevel: string;
  };
}

// Define the API interface inline to avoid import resolution issues in preload
interface ElectronAPI {
  chat: {
    send: (
      message: string,
      conversationId?: string,
    ) => Promise<{ response: string; conversationId: string; title?: string }>;
    stream: (message: string, conversationId?: string) => void;
    onChunk: (callback: (chunk: string) => void) => void;
    onDone: (callback: (payload?: ChatStreamDonePayload) => void) => void;
    onError: (callback: (error: string) => void) => void;
    removeAllListeners: () => void;
  };
  messages: {
    history: (conversationId?: string) => Promise<unknown[]>;
  };
  conversations: {
    list: () => Promise<unknown[]>;
    create: () => Promise<unknown>;
    get: (id: string) => Promise<unknown | null>;
    updateTitle: (id: string, title: string) => Promise<boolean>;
    delete: (id: string) => Promise<boolean>;
    search: (query: string) => Promise<unknown[]>;
    getCurrent: () => Promise<unknown | null>;
  };
  profile: {
    get: () => Promise<unknown>;
    getSummary: () => Promise<unknown>;
  };
  embeddings: {
    embed: (text: string) => Promise<number[]>;
    isReady: () => Promise<boolean>;
  };
  app: {
    getStatus: () => Promise<unknown>;
  };
  debug: {
    getExtractions: (messageId?: string) => Promise<unknown[]>;
    waitForExtraction: (
      messageId: string,
      timeoutMs?: number,
    ) => Promise<unknown | null>;
    clearDatabase: () => Promise<void>;
    getMessages: () => Promise<unknown[]>;
  };
  admin?: {
    getProfile: () => Promise<unknown>;
    getEvidence: (dimension: string) => Promise<unknown[]>;
    getMessagesWithPrompts: (limit?: number) => Promise<unknown[]>;
    reanalyze: () => Promise<void>;
    onReanalyzeProgress: (
      callback: (progress: ReanalyzeProgress) => void,
    ) => void;
    removeReanalyzeProgressListener: () => void;
  };
  apiKey: {
    getStatus: () => Promise<ApiKeyStatus>;
    save: (key: string) => Promise<{ success: boolean; error?: string }>;
    clear: () => Promise<boolean>;
    validate: (key: string) => Promise<{ valid: boolean; error?: string }>;
  };
  journeys: {
    list: () => Promise<JourneyInfo[]>;
    start: (journeyId: string) => Promise<JourneyStartResult>;
  };
  llm: {
    getConfig: () => Promise<LLMConfig>;
    setConfig: (config: Partial<LLMConfig>) => Promise<void>;
    testConnection: () => Promise<{ ok: boolean; error?: string }>;
    getStatus: () => Promise<LLMStatus>;
    listOllamaModels: (baseUrl?: string) => Promise<OllamaModel[]>;
  };
}

const api: ElectronAPI = {
  chat: {
    send: (message: string, conversationId?: string) =>
      ipcRenderer.invoke("chat:send", message, conversationId),
    stream: (message: string, conversationId?: string) =>
      ipcRenderer.send("chat:stream", message, conversationId),
    onChunk: (callback: (chunk: string) => void) => {
      ipcRenderer.on("chat:chunk", (_event, chunk: string) => callback(chunk));
    },
    onDone: (callback: (payload?: ChatStreamDonePayload) => void) => {
      ipcRenderer.on("chat:done", (_event, payload?: ChatStreamDonePayload) =>
        callback(payload),
      );
    },
    onError: (callback: (error: string) => void) => {
      ipcRenderer.on("chat:error", (_event, error: string) => callback(error));
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners("chat:chunk");
      ipcRenderer.removeAllListeners("chat:done");
      ipcRenderer.removeAllListeners("chat:error");
    },
  },
  messages: {
    history: (conversationId?: string) =>
      ipcRenderer.invoke("messages:history", conversationId),
  },
  conversations: {
    list: () => ipcRenderer.invoke("conversations:list"),
    create: () => ipcRenderer.invoke("conversations:create"),
    get: (id: string) => ipcRenderer.invoke("conversations:get", id),
    updateTitle: (id: string, title: string) =>
      ipcRenderer.invoke("conversations:updateTitle", id, title),
    delete: (id: string) => ipcRenderer.invoke("conversations:delete", id),
    search: (query: string) =>
      ipcRenderer.invoke("conversations:search", query),
    getCurrent: () => ipcRenderer.invoke("conversations:getCurrent"),
  },
  profile: {
    get: () => ipcRenderer.invoke("profile:get"),
    getSummary: () => ipcRenderer.invoke("profile:getSummary"),
  },
  embeddings: {
    embed: (text: string) => ipcRenderer.invoke("embeddings:embed", text),
    isReady: () => ipcRenderer.invoke("embeddings:ready"),
  },
  app: {
    getStatus: () => ipcRenderer.invoke("app:status"),
  },
  debug: {
    getExtractions: (messageId?: string) =>
      ipcRenderer.invoke("debug:getExtractions", messageId),
    waitForExtraction: (messageId: string, timeoutMs?: number) =>
      ipcRenderer.invoke("debug:waitForExtraction", messageId, timeoutMs),
    clearDatabase: () => ipcRenderer.invoke("debug:clearDatabase"),
    getMessages: () => ipcRenderer.invoke("debug:getMessages"),
  },
  admin: {
    getProfile: () => ipcRenderer.invoke("admin:getProfile"),
    getEvidence: (dimension: string) =>
      ipcRenderer.invoke("admin:getEvidence", dimension),
    getMessagesWithPrompts: (limit?: number) =>
      ipcRenderer.invoke("admin:getMessagesWithPrompts", limit),
    reanalyze: () => ipcRenderer.invoke("extraction:reanalyze"),
    onReanalyzeProgress: (callback: (progress: ReanalyzeProgress) => void) => {
      ipcRenderer.on(
        "extraction:progress",
        (_event, progress: ReanalyzeProgress) => callback(progress),
      );
    },
    removeReanalyzeProgressListener: () => {
      ipcRenderer.removeAllListeners("extraction:progress");
    },
  },
  apiKey: {
    getStatus: () => ipcRenderer.invoke("apiKey:getStatus"),
    save: (key: string) => ipcRenderer.invoke("apiKey:save", key),
    clear: () => ipcRenderer.invoke("apiKey:clear"),
    validate: (key: string) => ipcRenderer.invoke("apiKey:validate", key),
  },
  journeys: {
    list: () => ipcRenderer.invoke("journeys:list"),
    start: (journeyId: string) => ipcRenderer.invoke("journeys:start", journeyId),
  },
  llm: {
    getConfig: () => ipcRenderer.invoke("llm:getConfig"),
    setConfig: (config: Partial<LLMConfig>) =>
      ipcRenderer.invoke("llm:setConfig", config),
    testConnection: () => ipcRenderer.invoke("llm:testConnection"),
    getStatus: () => ipcRenderer.invoke("llm:getStatus"),
    listOllamaModels: (baseUrl?: string) =>
      ipcRenderer.invoke("llm:listOllamaModels", baseUrl),
  },
};

contextBridge.exposeInMainWorld("api", api);
