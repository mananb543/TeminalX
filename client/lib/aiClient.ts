/**
 * TerminalX - Client AI Service
 * Connects frontend workspace with backend AI Financial Intelligence endpoints.
 */

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: 'gemini' | 'deterministic';
  model?: string;
  toolsUsed?: string[];
  executionTimeMs?: number;
}

export interface PromptShortcutItem {
  id: string;
  title: string;
  category: 'PORTFOLIO' | 'RISK' | 'TRADING' | 'MACRO';
  prompt: string;
  description: string;
}

export interface AIStatusData {
  activeProvider: 'gemini' | 'deterministic';
  geminiConfigured: boolean;
  configuredModel: string;
  deterministicAvailable: boolean;
  prebuiltPromptsCount: number;
}

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem('terminalx_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const clientAIService = {
  async getStatus(): Promise<AIStatusData> {
    const res = await fetch('/api/ai/status', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch AI status: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  },

  async getPrompts(): Promise<PromptShortcutItem[]> {
    const res = await fetch('/api/ai/prompts', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch prompt shortcuts: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  },

  async getContext(): Promise<any> {
    const res = await fetch('/api/ai/context', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch AI context: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  },

  async chat(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{
    message: string;
    provider: 'gemini' | 'deterministic';
    model: string;
    toolsUsed?: string[];
    executionTimeMs: number;
  }> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ message, history }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'AI request failed' }));
      throw new Error(err.error || `AI error (${res.status})`);
    }

    const json = await res.json();
    return json.data;
  },
};
