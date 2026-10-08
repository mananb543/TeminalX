/**
 * TerminalX - Client Authentication & API Service
 * Handles credentials-enabled communication with Express backend on port 3000
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  balance: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export const authService = {
  /**
   * Register a new user in MongoDB Atlas
   */
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // sends and receives HTTP-only cookies
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: 'Network error or backend unavailable' };
    }
  },

  /**
   * Login with email and password against MongoDB
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: 'Network error or backend unavailable' };
    }
  },

  /**
   * Logout and clear HTTP-only session cookie
   */
  async logout(): Promise<void> {
    try {
      sessionStorage.setItem('terminalx_logged_out', 'true');
      localStorage.setItem('terminalx_logged_out', 'true');
      sessionStorage.removeItem('terminalx_token');
      localStorage.removeItem('terminalx_token');
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('[TerminalX Auth]: Logout request failed:', err);
    }
  },

  /**
   * Check current session status and retrieve user details from MongoDB
   */
  async getMe(): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        return { success: false, error: 'Session expired or not logged in' };
      }

      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: 'Network error' };
    }
  },

  /**
   * Fetch authenticated user's portfolio and holdings from MongoDB
   */
  async getPortfolio(): Promise<any> {
    try {
      const res = await fetch('/api/trading/portfolio', {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Submit paper order to MongoDB backend
   */
  async submitOrder(orderData: {
    symbol: string;
    type: string;
    orderType: string;
    quantity: number;
    limitPrice?: number;
  }): Promise<{ success: boolean; message?: string; error?: string; data?: any }> {
    try {
      const res = await fetch('/api/trading/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orderData),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Order execution failed' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: 'Network error while executing order' };
    }
  },
};
