/**
 * TerminalX - AI Provider Architecture
 * Interface and abstractions for financial intelligence models and deterministic engines.
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AIProviderResponse {
  message: string;
  provider: 'gemini' | 'deterministic';
  model: string;
  structuredSections?: {
    summary?: string;
    keyDrivers?: string[];
    riskContext?: string;
    benchmark?: string;
    limitations?: string;
  };
  toolsUsed?: string[];
  executionTimeMs: number;
}

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  providerName?: string;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly isConfigured: boolean;
  
  generateResponse(
    userMessage: string,
    history: ChatMessage[],
    context: any,
    userId: string
  ): Promise<AIProviderResponse>;
}
