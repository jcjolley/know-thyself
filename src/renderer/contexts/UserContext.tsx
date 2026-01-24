import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useApi } from './ApiContext';
import type { User, MigrationStatus } from '../../shared/types';

interface UserContextValue {
    // Current user state
    currentUser: User | null;
    users: User[];
    isLoading: boolean;

    // Migration state
    migrationStatus: MigrationStatus | null;
    hasPendingMigration: boolean;

    // Actions
    refreshUsers: () => Promise<void>;
    selectUser: (userId: string) => Promise<void>;
    createUser: (name: string, avatarColor?: string) => Promise<User>;
    deleteUser: (userId: string) => Promise<void>;
    claimLegacyData: () => Promise<void>;
    checkMigrationStatus: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
    const api = useApi();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);

    // Check migration status
    const checkMigrationStatus = useCallback(async () => {
        try {
            const status = await api.users.getMigrationStatus();
            setMigrationStatus(status);
        } catch (err) {
            console.error('Failed to check migration status:', err);
        }
    }, [api]);

    // Refresh users list
    const refreshUsers = useCallback(async () => {
        try {
            const [usersList, current] = await Promise.all([
                api.users.list(),
                api.users.getCurrent(),
            ]);
            setUsers(usersList);
            setCurrentUser(current);
        } catch (err) {
            console.error('Failed to refresh users:', err);
        }
    }, [api]);

    // Select a user
    const selectUser = useCallback(async (userId: string) => {
        try {
            const user = await api.users.select(userId);
            setCurrentUser(user);
        } catch (err) {
            console.error('Failed to select user:', err);
            throw err;
        }
    }, [api]);

    // Create a new user
    const createUser = useCallback(async (name: string, avatarColor?: string): Promise<User> => {
        try {
            const user = await api.users.create(name, avatarColor);
            setCurrentUser(user);
            await refreshUsers();
            return user;
        } catch (err) {
            console.error('Failed to create user:', err);
            throw err;
        }
    }, [api, refreshUsers]);

    // Delete a user
    const deleteUser = useCallback(async (userId: string) => {
        try {
            await api.users.delete(userId);
            await refreshUsers();
        } catch (err) {
            console.error('Failed to delete user:', err);
            throw err;
        }
    }, [api, refreshUsers]);

    // Claim legacy data
    const claimLegacyData = useCallback(async () => {
        try {
            await api.users.claimMigration();
            setMigrationStatus(null);
        } catch (err) {
            console.error('Failed to claim legacy data:', err);
            throw err;
        }
    }, [api]);

    // Load initial state
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                await Promise.all([refreshUsers(), checkMigrationStatus()]);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [refreshUsers, checkMigrationStatus]);

    const value: UserContextValue = {
        currentUser,
        users,
        isLoading,
        migrationStatus,
        hasPendingMigration: migrationStatus?.pending ?? false,
        refreshUsers,
        selectUser,
        createUser,
        deleteUser,
        claimLegacyData,
        checkMigrationStatus,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
