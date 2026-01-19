import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface inline to avoid import resolution issues in preload
interface ElectronAPI {
    chat: {
        send: (message: string) => Promise<string>;
        stream: (message: string) => void;
        onChunk: (callback: (chunk: string) => void) => void;
        onDone: (callback: () => void) => void;
        onError: (callback: (error: string) => void) => void;
        removeAllListeners: () => void;
    };
    profile: {
        get: () => Promise<unknown>;
    };
    embeddings: {
        embed: (text: string) => Promise<number[]>;
        isReady: () => Promise<boolean>;
    };
    app: {
        getStatus: () => Promise<unknown>;
    };
}

const api: ElectronAPI = {
    chat: {
        send: (message: string) => ipcRenderer.invoke('chat:send', message),
        stream: (message: string) => ipcRenderer.send('chat:stream', message),
        onChunk: (callback: (chunk: string) => void) => {
            ipcRenderer.on('chat:chunk', (_event, chunk: string) => callback(chunk));
        },
        onDone: (callback: () => void) => {
            ipcRenderer.on('chat:done', () => callback());
        },
        onError: (callback: (error: string) => void) => {
            ipcRenderer.on('chat:error', (_event, error: string) => callback(error));
        },
        removeAllListeners: () => {
            ipcRenderer.removeAllListeners('chat:chunk');
            ipcRenderer.removeAllListeners('chat:done');
            ipcRenderer.removeAllListeners('chat:error');
        },
    },
    profile: {
        get: () => ipcRenderer.invoke('profile:get'),
    },
    embeddings: {
        embed: (text: string) => ipcRenderer.invoke('embeddings:embed', text),
        isReady: () => ipcRenderer.invoke('embeddings:ready'),
    },
    app: {
        getStatus: () => ipcRenderer.invoke('app:status'),
    },
};

contextBridge.exposeInMainWorld('api', api);
