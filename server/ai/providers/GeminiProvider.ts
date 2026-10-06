/**
 * TerminalX - Gemini AI Provider
 * Native server-side integration using @google/genai SDK with function calling,
 * multi-turn conversation support, and structured quantitative outputs.
 */

import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIProviderResponse, ChatMessage } from './AIProvider.ts';
import { StructuredAIContext } from '../aiContextService.ts';
import { AI_FUNCTION_DECLARATIONS, executeAITool } from '../tools/aiTools.ts';

export class GeminiProvider implements AIProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini Financial Intelligence';
  private aiClient: GoogleGenAI | null = null;
  private currentApiKey: string | null = null;
  private readonly defaultModel = 'gemini-3.8-flash';

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (key && key !== this.currentApiKey) {
      this.currentApiKey = key;
      this.aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  public get isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  public async generateResponse(
    userMessage: string,
    history: ChatMessage[],
    context: StructuredAIContext,
    userId: string
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();
    this.initClient();

    if (!this.aiClient || !this.isConfigured) {
      throw new Error('GEMINI_API_KEY or AI_API_KEY is not configured');
    }

    const modelName = process.env.AI_MODEL || this.defaultModel;

    // Structured institutional system prompt
    const systemInstruction = `You are TerminalX Financial Intelligence, an institutional-grade quantitative portfolio analyst and risk strategist.
You are embedded directly within the TerminalX Trading Terminal for Indian and global equities.

You have access to the user's REAL live portfolio, market data, and risk metrics provided in the system context and via available tool functions.

STRICT OPERATIONAL RULES:
1. NEVER hallucinate, simulate, or invent portfolio figures, share quantities, cash balances, or market prices.
2. Ground all answers strictly in the provided quantitative context or execute tool functions if more granular data is required.
3. If data is limited (e.g. fewer than 5 trading days of history for Sharpe ratio or VaR), explicitly state the data limitation under "IMPORTANT DATA LIMITATION".
4. Always format Indian stock amounts in Indian Rupees (₹) using the Indian numbering system (e.g. ₹10,00,000, ₹4,200).
5. For analytical questions (e.g. "Why is my portfolio down?", "How concentrated am I?", "Explain my Sharpe ratio"), format your response using these clear section headers:
   ### SUMMARY
   (Executive 1-2 sentence bottom line)

   ### KEY DRIVERS
   (Bulleted breakdown attributing performance, positions, or risk factors with exact numbers)

   ### RISK CONTEXT
   (Volatility, Sharpe, Beta, Drawdown, or VaR implications)

   ### BENCHMARK & SECTOR CONTEXT
   (Comparison with NIFTY 50 and relevant economic sector)

   ### IMPORTANT DATA LIMITATION
   (Assumptions, number of observations, risk-free rate assumption at 6.0%)

6. WHEN REPORTING OR ANALYZING FINANCIAL NEWS & CORPORATE EVENTS:
   - NEVER fabricate news, headlines, publishers, dates, events, or URLs.
   - Ground all news in verified articles from context or tools (getLatestMarketNews, getCompanyNews, searchNews, getPortfolioNews, getUpcomingEvents, getCompanyEvents).
   - When citing articles, structure them cleanly:
     NEWS ITEM
     Headline: <Headline>
     Source: <Publisher>
     Published: <Timestamp>
     Symbols: <Symbols>
     URL: <URL>
     Summary: <Summary>
   - Rigorously distinguish between verified reports, direct citations, and analytical deduction:
     FACT: This article reports X.
     FROM THE ARTICLE: The article states Y.
     INTERPRETATION: This could be relevant to the portfolio because Z.
   - Do NOT claim that an article or headline caused a stock move unless the source explicitly establishes that relationship.

CURRENT REAL-TIME CONTEXT:
${JSON.stringify(context, null, 2)}
`;

    // Map conversation history
    const contents: any[] = [];

    // Append past messages (limit last 8 messages for token economy)
    const recentHistory = history.slice(-8);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    // Add current user prompt
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const toolsUsed: string[] = [];

    const callWithRetry = async (targetContents: any[]) => {
      let currentModel = modelName;
      let lastErr: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await this.aiClient!.models.generateContent({
            model: currentModel,
            contents: targetContents,
            config: {
              systemInstruction,
              tools: [{ functionDeclarations: AI_FUNCTION_DECLARATIONS }],
              temperature: 0.2, // low temperature for quantitative rigor
            },
          });
        } catch (err: any) {
          lastErr = err;
          const is503 =
            err?.status === 503 ||
            err?.message?.includes('503') ||
            err?.message?.includes('high demand');
          if (is503 && attempt < 2) {
            if (currentModel === 'gemini-3.8-flash') {
              currentModel = 'gemini-flash-latest';
            }
            await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    };

    // First call to Gemini with retry
    let response = await callWithRetry(contents);

    // Check for function calls
    let functionCalls = response.functionCalls;

    // Handle tool execution loop (up to 3 sequential tool iterations)
    let iterations = 0;
    while (functionCalls && functionCalls.length > 0 && iterations < 3) {
      iterations++;
      const candidateContent = response.candidates?.[0]?.content;
      if (candidateContent) {
        contents.push(candidateContent);
      }

      const functionResponseParts: any[] = [];

      for (const call of functionCalls) {
        const toolName = call.name;
        if (!toolName) continue;
        toolsUsed.push(toolName);
        try {
          const result = await executeAITool(toolName, (call.args as Record<string, any>) || {}, userId);
          functionResponseParts.push({
            functionResponse: {
              name: toolName,
              response: { result },
            },
          });
        } catch (err: any) {
          functionResponseParts.push({
            functionResponse: {
              name: toolName,
              response: { error: err.message || 'Tool execution failed' },
            },
          });
        }
      }

      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });

      // Query Gemini again with tool responses
      response = await callWithRetry(contents);

      functionCalls = response.functionCalls;
    }

    const outputText = response.text || 'Analysis completed with no direct text response.';

    return {
      message: outputText,
      provider: 'gemini',
      model: modelName,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

export const geminiProvider = new GeminiProvider();
