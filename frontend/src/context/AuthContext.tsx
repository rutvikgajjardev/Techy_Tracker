import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import {
  apiService,
  TOKEN_STORAGE_KEY,
  ACTIVE_USER_STORAGE_KEY,
  getAuthToken,
  setAuthToken,
} from '../services/api';

const USERS_STORAGE_KEY = 'techy_traker_users_v2';

export const INITIAL_REGISTERED_USERS: User[] = [];

interface AuthContextType {
  currentUser: User | null;
  registeredUsers: User[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, upi_id?: string) => Promise<User>;
  updateProfile: (payload: { name?: string; upi_id?: string | null }) => Promise<User>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedToken = getAuthToken();
    const savedUserJson = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);

    // If token is old mock token from previous localStorage version, discard it
    if (savedToken && savedToken.startsWith('jwt-token-')) {
      setAuthToken(null);
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      return null;
    }

    if (savedUserJson && savedToken) {
      try {
        return JSON.parse(savedUserJson);
      } catch {
        return null;
      }
    }
    return null;
  });

  const refreshUsers = useCallback(async () => {
    try {
      const users = await apiService.getUsers();
      if (users && users.length > 0) {
        setRegisteredUsers(users);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    } catch {
      // Keep existing users if fetch fails
    }
  }, []);

  // Listen for 401 token expiration from API client
  useEffect(() => {
    const handleExpired = () => {
      setCurrentUser(null);
      setAuthToken(null);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  // Refresh user list whenever logged in
  useEffect(() => {
    if (currentUser) {
      refreshUsers();
    }
  }, [currentUser, refreshUsers]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiService.login(email, password);
    localStorage.removeItem('techy_traker_logged_out_v2');
    setCurrentUser(res.user);
    await refreshUsers();
    return res.user;
  };

  const register = async (name: string, email: string, password: string, upi_id?: string): Promise<User> => {
    const res = await apiService.register(name, email, password, upi_id);
    localStorage.removeItem('techy_traker_logged_out_v2');
    setCurrentUser(res.user);
    await refreshUsers();
    return res.user;
  };

  const updateProfile = async (payload: { name?: string; upi_id?: string | null }): Promise<User> => {
    const res = await apiService.updateProfile(payload);
    setCurrentUser(res.user);
    await refreshUsers();
    return res.user;
  };

  const logout = () => {
    localStorage.setItem('techy_traker_logged_out_v2', 'true');
    localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        registeredUsers,
        isAuthenticated: !!currentUser,
        login,
        register,
        updateProfile,
        logout,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
