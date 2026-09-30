/**
 * TerminalX - Frontend Authentication Store
 * Handles session persistence via HTTP-only cookies and /api/auth/me checks.
 * Manages authenticated user context, balance synchronization, and login/register states.
 */

import { create } from 'zustand';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  balance: number;
  createdAt: string;
}

export interface DatabaseStatus {
  isConnected: boolean;
  status: 'CONNECTED' | 'DISCONNECTED';
  storageType: 'MONGODB' | 'IN-MEMORY / DEMO';
  dbName: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingAuth: boolean;
  error: string | null;
  dbStatus: DatabaseStatus | null;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  updateUserBalance: (newBalance: number) => void;
  clearError: () => void;
  fetchDbStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isCheckingAuth: true,
  error: null,
  dbStatus: null,

  clearError: () => set({ error: null }),

  updateUserBalance: (newBalance: number) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, balance: newBalance } });
    }
  },

  fetchDbStatus: async () => {
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data = await res.json();
        set({
          dbStatus: {
            isConnected: data.isConnected,
            status: data.status,
            storageType: data.storageType,
            dbName: data.dbName,
          },
        });
      }
    } catch {
      // ignore
    }
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      // In case Authorization Bearer token is needed in cross-origin environments, check memory/session
      const storedToken = sessionStorage.getItem('terminalx_token');
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          set({
            user: data.user,
            token: storedToken,
            isAuthenticated: true,
            isCheckingAuth: false,
            dbStatus: data.dbStatus || null,
            error: null,
          });
          return true;
        }
      }

      // If /api/auth/me didn't authenticate, fetch dbStatus independently
      get().fetchDbStatus();

      set({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
      });
      return false;
    } catch (err: any) {
      console.warn('[TerminalX Auth]: Session verification failed:', err.message);
      get().fetchDbStatus();
      set({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
      });
      return false;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMessage = data.error || 'Invalid email or password.';
        set({ isLoading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }

      // Store token in sessionStorage for backup if 3P cookies are restricted
      if (data.token) {
        sessionStorage.setItem('terminalx_token', data.token);
      }

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg = 'Failed to connect to authentication server. Please check your network.';
      set({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMessage = data.error || 'Failed to create account.';
        set({ isLoading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }

      if (data.token) {
        sessionStorage.setItem('terminalx_token', data.token);
      }

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg = 'Failed to connect to authentication server.';
      set({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  logout: async () => {
    try {
      sessionStorage.removeItem('terminalx_token');
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },
}));
