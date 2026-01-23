import React, { createContext, useContext, ReactNode } from 'react';
import { webApi, type WebApiType } from '../api/web-client';

const ApiContext = createContext<WebApiType | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
    return <ApiContext.Provider value={webApi}>{children}</ApiContext.Provider>;
}

export function useApi(): WebApiType {
    const api = useContext(ApiContext);
    if (!api) {
        throw new Error('useApi must be used within an ApiProvider');
    }
    return api;
}
