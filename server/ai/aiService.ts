/**
 * TerminalX - AI Financial Intelligence Orchestrator Service
 * Handles provider selection, fallback logic, multi-turn chat sessions,
 * and integration with quantitative portfolio context.
 */

import { AIProviderResponse, ChatMessage } from './providers/AIProvider.ts';
import { geminiProvider } from './providers/GeminiProvider.ts';
import { deterministicProvider } from './providers/DeterministicProvider.ts';
import { aiContextService, StructuredAIContext } from './aiContextService.ts';

export interface PromptShortcut {
  id: string;
  title: string;
  category: 'PORTFOLIO' | 'RISK' | 'TRADING' | 'MACRO' | 'NEWS';
  prompt: string;
  description: string;
}

export const PREBUILT_PROMPTS: PromptShortcut[] = [
  {
    id: 'health-check',
    title: 'Portfolio Health Check',
    category: 'PORTFOLIO',
    prompt: 'Run a full institutional health check on my portfolio: valuation, returns, allocation, and risk status.',
    description: 'Executive summary of portfolio valuation, open P&L, and health score',
  },
  {
    id: 'daily-pnl',
    title: 'Daily P&L Breakdown',
    category: 'PORTFOLIO',
    prompt: 'Why is my portfolio up or down today? Which holdings contributed most to today’s P&L?',
    description: 'Detailed attribution of today’s price moves and position contributions',
  },
  {
    id: 'risk-analysis',
    title: 'Risk Engine Audit',
    category: 'RISK',
    prompt: 'Explain my portfolio risk metrics: annualized volatility, Sharpe ratio, maximum drawdown, and 95% historical VaR.',
    description: 'Deep dive into volatility, Sharpe ratio, and Value-at-Risk parameters',
  },
  {
    id: 'benchmark-nifty',
    title: 'Performance vs NIFTY 50',
    category: 'PORTFOLIO',
    prompt: 'How did my portfolio perform against the NIFTY 50 benchmark this month? Am I generating alpha?',
    description: 'Normalized relative performance and market beta comparison',
  },
  {
    id: 'concentration-audit',
    title: 'Concentration & HHI Audit',
    category: 'RISK',
    prompt: 'How concentrated is my portfolio? Analyze my Herfindahl-Hirschman Index (HHI) and top position exposures.',
    description: 'Evaluate single-stock concentration risk and sector diversification',
  },
  {
    id: 'trade-review',
    title: 'Trade & Execution Review',
    category: 'TRADING',
    prompt: 'Summarize my recent trading activity, win rate, profit factor, and average winning vs losing trade sizes.',
    description: 'Order execution quality, trade cycle expectancy, and holding durations',
  },
  {
    id: 'rebalance-ideas',
    title: 'Allocation Rebalance Ideas',
    category: 'PORTFOLIO',
    prompt: 'What are some quantitative rebalancing ideas for my portfolio based on my cash ratio and sector weights?',
    description: 'Informational rebalancing insights to manage risk and cash drag',
  },
  {
    id: 'portfolio-news',
    title: 'Portfolio News Wire',
    category: 'NEWS',
    prompt: 'What news and regulatory dispatches are currently affecting my portfolio holdings?',
    description: 'Verified wire reports and developments for your owned securities',
  },
  {
    id: 'reliance-intel',
    title: 'RELIANCE Developments',
    category: 'NEWS',
    prompt: 'What are the latest verified developments and news dispatches around RELIANCE?',
    description: 'Corporate filings, operational updates, and market dispatches for RIL',
  },
  {
    id: 'upcoming-events',
    title: 'Corporate Actions & Events',
    category: 'NEWS',
    prompt: 'Are there any upcoming corporate events, earnings dates, or dividend ex-dates for my holdings?',
    description: 'Scheduled corporate actions and macroeconomic calendar for your portfolio',
  },
];

export class AIService {
  /**
   * Get active provider status and system configuration
   */
  public getStatus(): {
    activeProvider: 'gemini' | 'deterministic';
    geminiConfigured: boolean;
    configuredModel: string;
    deterministicAvailable: boolean;
    prebuiltPromptsCount: number;
  } {
    const isGeminiConfigured = geminiProvider.isConfigured;
    const preferredProvider = process.env.AI_PROVIDER || 'gemini';

    return {
      activeProvider: preferredProvider === 'gemini' && isGeminiConfigured ? 'gemini' : 'deterministic',
      geminiConfigured: isGeminiConfigured,
      configuredModel: process.env.AI_MODEL || 'gemini-3.8-flash',
      deterministicAvailable: true,
      prebuiltPromptsCount: PREBUILT_PROMPTS.length,
    };
  }

  /**
   * Get sanitized real-time context for inspection
   */
  public async getContext(userId: string): Promise<StructuredAIContext> {
    return aiContextService.buildContext(userId);
  }

  /**
   * Get available prompt shortcuts
   */
  public getPromptShortcuts(): PromptShortcut[] {
    return PREBUILT_PROMPTS;
  }

  /**
   * Core chat generation method: orchestrates context building, Gemini inference,
   * and seamless zero-hallucination deterministic fallback.
   */
  public async chat(
    userId: string,
    message: string,
    history: ChatMessage[] = []
  ): Promise<AIProviderResponse> {
    if (!message || !message.trim()) {
      throw new Error('User message is required');
    }

    // 1. Gather fresh quantitative context
    const context = await aiContextService.buildContext(userId);

    const preferredProvider = process.env.AI_PROVIDER || 'gemini';
    const canUseGemini = preferredProvider === 'gemini' && geminiProvider.isConfigured;

    // 2. If Gemini is configured and enabled, try it
    if (canUseGemini) {
      try {
        const response = await geminiProvider.generateResponse(message, history, context, userId);
        return response;
      } catch (err: any) {
        console.warn(
          '[AIService]: Gemini provider encountered an error. Falling back gracefully to Deterministic Financial Intelligence Engine.',
          err.message
        );
        // Fallback to deterministic provider below
      }
    }

    // 3. Deterministic Financial Intelligence Engine (Fallback / Default)
    const deterministicResponse = await deterministicProvider.generateResponse(
      message,
      history,
      context,
      userId
    );

    // Prefix with notice if fallback occurred because Gemini was configured but encountered an error
    if (canUseGemini) {
      deterministicResponse.message =
        `> **[NOTICE: Operating in Deterministic Financial Intelligence Mode]**  \n` +
        `> *External LLM was temporarily unavailable or rate-limited. Switched seamlessly to TerminalX zero-hallucination quantitative engine.*  \n\n` +
        deterministicResponse.message;
    }

    return deterministicResponse;
  }
}

export const aiService = new AIService();
