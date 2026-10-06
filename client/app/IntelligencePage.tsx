/**
 * TerminalX - Stage 5 AI Financial Intelligence Workspace
 * Institutional-grade conversational financial intelligence engine powered by
 * Google Gemini 3.8 Flash and TerminalX Deterministic Quantitative Fallback.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Sparkles,
  Send,
  RotateCcw,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Activity,
  Layers,
  ChevronRight,
  Info,
  Cpu,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Database,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { clientAIService, ChatMessageItem, PromptShortcutItem, AIStatusData } from '../lib/aiClient.ts';
import { formatINR } from '../lib/formatters.ts';

export const IntelligencePage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('Initializing analysis...');
  const [status, setStatus] = useState<AIStatusData | null>(null);
  const [prompts, setPrompts] = useState<PromptShortcutItem[]>([]);
  const [contextData, setContextData] = useState<any>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  // Initial load: fetch status, prompt shortcuts, and real context
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [statusRes, promptsRes, contextRes] = await Promise.all([
        clientAIService.getStatus().catch(() => null),
        clientAIService.getPrompts().catch(() => []),
        clientAIService.getContext().catch(() => null),
      ]);

      if (statusRes) setStatus(statusRes);
      if (promptsRes) setPrompts(promptsRes);
      if (contextRes) {
        setContextData(contextRes);

        // Prepopulate welcoming briefing message if message list is empty
        if (messages.length === 0) {
          const welcomeMsg: ChatMessageItem = {
            id: 'welcome-brief',
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            provider: statusRes?.activeProvider || 'deterministic',
            model: statusRes?.configuredModel || 'Quantitative Engine',
            content: `### SUMMARY
TerminalX Financial Intelligence is active and grounded in your live portfolio telemetry.

• **Total Portfolio Value**: ${formatINR(contextRes.portfolio.totalValue)}
• **Active Equity Positions**: ${contextRes.portfolio.positionsCount} holdings (${formatINR(contextRes.portfolio.investedValue)})
• **Cash Reserves**: ${formatINR(contextRes.portfolio.cash)} (${contextRes.risk.cashWeightPercent}% weight)
• **Cumulative Total Return**: ${contextRes.portfolio.totalReturnPercent >= 0 ? '+' : ''}${contextRes.portfolio.totalReturnPercent}% (${formatINR(contextRes.portfolio.totalPnL)})
• **Annualized Volatility**: ${contextRes.risk.volatilityAnnualizedPercent !== null ? `${contextRes.risk.volatilityAnnualizedPercent}%` : 'Observing (5+ sessions)'}
• **95% 1-Day VaR**: ${contextRes.risk.historicalVaR95Percent !== null ? `${contextRes.risk.historicalVaR95Percent}% (${formatINR(contextRes.risk.historicalVaR95Amount)})` : 'Calculating from daily marks'}

### READY FOR REASONING
Ask analytical questions about your P&L drivers, single-stock risk exposure, concentration (HHI), Sharpe ratio, or benchmark performance against NIFTY 50. Select a pre-built workflow below or type a query.`,
          };
          setMessages([welcomeMsg]);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isSubmitting) return;

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsSubmitting(true);

    // Dynamic loading status messages
    setLoadingStep('Accessing mark-to-market positions...');
    const step1 = setTimeout(() => setLoadingStep('Evaluating institutional risk metrics & beta...'), 500);
    const step2 = setTimeout(() => setLoadingStep('Synthesizing quantitative intelligence...'), 1100);

    try {
      // Build history for backend
      const historyPayload = newMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const response = await clientAIService.chat(text, historyPayload);

      clearTimeout(step1);
      clearTimeout(step2);

      const assistantMsg: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: response.provider,
        model: response.model,
        toolsUsed: response.toolsUsed,
        executionTimeMs: response.executionTimeMs,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      clearTimeout(step1);
      clearTimeout(step2);

      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `**Intelligence Error**: ${err.message || 'Unable to complete AI synthesis. Please retry.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
      setLoadingStep('Analysis ready');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear the current intelligence conversation?')) {
      setMessages([]);
      loadInitialData();
    }
  };

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportChat = () => {
    const textData = messages
      .map(
        (m) =>
          `[${m.timestamp}] ${m.role.toUpperCase()}${m.provider ? ` (${m.provider}/${m.model})` : ''}:\n${m.content}\n\n`
      )
      .join('----------------------------------------\n\n');

    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminalx_intelligence_export_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Structured Markdown Renderer for institutional terminal styling
  const renderStructuredContent = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-2 text-xs leading-relaxed font-mono">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Heading 3 (### SUMMARY, etc.)
          if (trimmed.startsWith('### ')) {
            const headingText = trimmed.replace('### ', '');
            let color = 'text-[#00C2FF] border-[#00C2FF]/30';
            if (headingText.includes('RISK')) color = 'text-[#F59E0B] border-[#F59E0B]/30';
            if (headingText.includes('LIMITATION')) color = 'text-[#8B949E] border-[#8B949E]/30';
            if (headingText.includes('DRIVER')) color = 'text-[#22C55E] border-[#22C55E]/30';

            return (
              <div
                key={idx}
                className={`pt-2.5 pb-1 font-bold tracking-wider uppercase text-[11px] border-b ${color} flex items-center gap-1.5`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                <span>{headingText}</span>
              </div>
            );
          }

          // Notice Blockquote
          if (trimmed.startsWith('> ')) {
            return (
              <div
                key={idx}
                className="p-2.5 my-1.5 rounded bg-[#161D26] border-l-2 border-[#00C2FF] text-[11px] text-[#8B949E] italic"
              >
                {trimmed.replace('> ', '').replace(/\*\*/g, '')}
              </div>
            );
          }

          // Bullet Point
          if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletText = trimmed.replace(/^[•\-\*]\s*/, '');
            // Highlight bold segments
            const parts = bulletText.split(/(\*\*.*?\*\*)/g);

            return (
              <div key={idx} className="flex items-start gap-2 pl-1 text-[#F5F7FA]">
                <span className="text-[#00C2FF] shrink-0 mt-0.5">•</span>
                <span>
                  {parts.map((p, pIdx) => {
                    if (p.startsWith('**') && p.endsWith('**')) {
                      return (
                        <strong key={pIdx} className="text-[#F5F7FA] font-bold">
                          {p.slice(2, -2)}
                        </strong>
                      );
                    }
                    return <span key={pIdx}>{p}</span>;
                  })}
                </span>
              </div>
            );
          }

          // Blank line
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          // Standard paragraph with bold formatting
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={idx} className="text-[#D0D7DE]">
              {parts.map((p, pIdx) => {
                if (p.startsWith('**') && p.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="text-[#F5F7FA] font-bold">
                      {p.slice(2, -2)}
                    </strong>
                  );
                }
                return <span key={pIdx}>{p}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  const filteredPrompts =
    activeCategory === 'ALL' ? prompts : prompts.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-4 font-mono">
      {/* 1. Header Bar with Institutional Status & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2 border-b border-[#1B222C]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#F5F7FA] tracking-tight flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#00C2FF]" />
              <span>TerminalX Financial Intelligence</span>
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${
                status?.activeProvider === 'gemini'
                  ? 'bg-[#00C2FF]/10 border-[#00C2FF]/40 text-[#00C2FF]'
                  : 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E]'
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span>
                {status?.activeProvider === 'gemini'
                  ? 'GEMINI 3.8 FLASH'
                  : 'DETERMINISTIC QUANT ENGINE'}
              </span>
            </span>
          </div>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Institutional portfolio analytics, risk attribution, and real-time market reasoning
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContextModal(true)}
            className="px-2.5 py-1.5 rounded bg-[#11161D] border border-[#1B222C] hover:border-[#00C2FF]/50 text-[#8B949E] hover:text-[#00C2FF] text-xs flex items-center gap-1.5 transition-colors"
            title="Inspect Quantitative Telemetry"
          >
            <Database className="w-3.5 h-3.5 text-[#00C2FF]" />
            <span>Context Inspector</span>
          </button>

          <button
            onClick={handleExportChat}
            className="px-2.5 py-1.5 rounded bg-[#11161D] border border-[#1B222C] hover:border-[#8B949E] text-[#8B949E] hover:text-[#F5F7FA] text-xs flex items-center gap-1.5 transition-colors"
            title="Export Conversation"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleClearChat}
            className="px-2.5 py-1.5 rounded bg-[#11161D] border border-[#1B222C] hover:border-[#EF4444]/50 text-[#8B949E] hover:text-[#EF4444] text-xs flex items-center gap-1.5 transition-colors"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* 2. Top Quantitative Telemetry Strip */}
      {contextData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
          <div className="p-2.5 bg-[#0D1117] border border-[#1B222C] rounded">
            <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block">Total Equity</span>
            <span className="font-bold text-[#F5F7FA]">{formatINR(contextData.portfolio.totalValue)}</span>
          </div>
          <div className="p-2.5 bg-[#0D1117] border border-[#1B222C] rounded">
            <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block">Cash Buffer</span>
            <span className="font-bold text-[#00C2FF]">{contextData.risk.cashWeightPercent}%</span>
          </div>
          <div className="p-2.5 bg-[#0D1117] border border-[#1B222C] rounded">
            <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block">Today's P&L</span>
            <span
              className={`font-bold ${
                contextData.portfolio.dayPnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}
            >
              {contextData.portfolio.dayPnL >= 0 ? '+' : ''}
              {formatINR(contextData.portfolio.dayPnL)}
            </span>
          </div>
          <div className="p-2.5 bg-[#0D1117] border border-[#1B222C] rounded">
            <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block">Sharpe Ratio</span>
            <span className="font-bold text-[#F5F7FA]">
              {contextData.risk.sharpeRatio !== null ? contextData.risk.sharpeRatio : 'N/A (<5d)'}
            </span>
          </div>
          <div className="p-2.5 bg-[#0D1117] border border-[#1B222C] rounded">
            <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block">95% Hist VaR</span>
            <span className="font-bold text-[#F59E0B]">
              {contextData.risk.historicalVaR95Percent !== null
                ? `${contextData.risk.historicalVaR95Percent}%`
                : 'Pending'}
            </span>
          </div>
          <div className="p-2.5 bg-[#0D1117] border border-[#1B222C] rounded">
            <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block">HHI Score</span>
            <span className="font-bold text-[#F5F7FA]">{contextData.risk.concentrationHHI}</span>
          </div>
        </div>
      )}

      {/* 3. Pre-Built Financial Workflow Shortcuts */}
      <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg p-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#1B222C] mb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#F5F7FA]">
            <Sparkles className="w-3.5 h-3.5 text-[#00C2FF]" />
            <span>QUANTITATIVE INTELLIGENCE WORKFLOWS</span>
          </div>
          <div className="flex items-center gap-1">
            {['ALL', 'PORTFOLIO', 'RISK', 'NEWS', 'TRADING'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#00C2FF]/20 text-[#00C2FF] border border-[#00C2FF]/40'
                    : 'text-[#8B949E] hover:text-[#F5F7FA]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {filteredPrompts.slice(0, 8).map((p) => (
            <button
              key={p.id}
              onClick={() => handleSendMessage(p.prompt)}
              disabled={isSubmitting}
              className="text-left p-2.5 rounded bg-[#11161D] border border-[#1B222C] hover:border-[#00C2FF]/50 hover:bg-[#161D26] transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#F5F7FA] group-hover:text-[#00C2FF]">
                  <span>{p.title}</span>
                  <ArrowUpRight className="w-3 h-3 text-[#505A66] group-hover:text-[#00C2FF] transition-colors" />
                </div>
                <p className="text-[11px] text-[#8B949E] mt-1 line-clamp-2 leading-snug">
                  {p.description}
                </p>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-[#505A66] mt-2 block font-semibold">
                {p.category}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Conversational Chat Feed */}
      <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg min-h-[460px] max-h-[580px] flex flex-col overflow-hidden">
        {/* Chat Feed Scroll Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] font-mono flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{msg.content}</span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded bg-[#11161D] border border-[#00C2FF]/40 text-[#00C2FF] flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-lg p-3.5 text-xs ${
                    isUser
                      ? 'bg-[#00C2FF]/15 border border-[#00C2FF]/40 text-[#F5F7FA]'
                      : 'bg-[#11161D] border border-[#1B222C] text-[#F5F7FA]'
                  }`}
                >
                  {/* Assistant Message Metadata Header */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#1B222C] text-[10px] text-[#8B949E]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#00C2FF]">
                          {msg.provider === 'gemini'
                            ? `GEMINI 3.8 FLASH`
                            : `QUANTITATIVE RULE ENGINE`}
                        </span>
                        {msg.executionTimeMs && (
                          <span className="text-[#505A66]">({msg.executionTimeMs}ms)</span>
                        )}
                        {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-[#161D26] text-[#22C55E]">
                            Tools: {msg.toolsUsed.join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{msg.timestamp}</span>
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="hover:text-[#F5F7FA] text-[#8B949E] transition-colors"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-[#22C55E]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message Content */}
                  {isUser ? (
                    <p className="font-mono whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    renderStructuredContent(msg.content)
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded bg-[#00C2FF]/20 border border-[#00C2FF]/40 text-[#00C2FF] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold font-mono">YOU</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Submitting Loading State */}
          {isSubmitting && (
            <div className="flex gap-3 justify-start animate-in fade-in">
              <div className="w-7 h-7 rounded bg-[#11161D] border border-[#00C2FF]/40 text-[#00C2FF] flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-lg bg-[#11161D] border border-[#1B222C] text-xs text-[#8B949E] flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00C2FF]" />
                <span className="text-[#00C2FF] font-semibold">{loadingStep}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 5. Prompt Input Box */}
        <div className="p-3 bg-[#07090C] border-t border-[#1B222C]">
          <div className="flex items-end gap-2 bg-[#11161D] border border-[#1B222C] focus-within:border-[#00C2FF] rounded-lg p-2 transition-all">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask an analytical question (e.g. 'Why is my portfolio down today?', 'How concentrated am I?', 'Explain my Sharpe ratio')..."
              rows={2}
              disabled={isSubmitting}
              className="flex-1 bg-transparent border-0 focus:outline-none text-xs text-[#F5F7FA] placeholder-[#505A66] resize-none font-mono"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isSubmitting}
              className="px-4 py-2 rounded bg-[#00C2FF] hover:bg-[#00A8DE] disabled:opacity-30 disabled:hover:bg-[#00C2FF] text-[#07090C] font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#505A66] mt-1.5 px-1">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>Real portfolio data telemetry grounded · No hallucinations</span>
          </div>
        </div>
      </div>

      {/* 6. Context Inspector Modal */}
      {showContextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-4 border-b border-[#1B222C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#00C2FF]" />
                <h3 className="font-bold text-sm text-[#F5F7FA]">Real-Time AI Quantitative Context Inspector</h3>
              </div>
              <button
                onClick={() => setShowContextModal(false)}
                className="text-[#8B949E] hover:text-[#F5F7FA] text-xs px-2 py-1 rounded bg-[#11161D] border border-[#1B222C]"
              >
                Close (ESC)
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs">
              <p className="text-[#8B949E] text-[11px] mb-3">
                This exact structured quantitative payload is assembled server-side and supplied to the AI engine on every turn. All private tokens, passwords, and database IDs are completely excluded.
              </p>
              <pre className="p-3 bg-[#07090C] border border-[#1B222C] rounded text-[#22C55E] overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(contextData, null, 2)}
              </pre>
            </div>

            <div className="p-3 border-t border-[#1B222C] flex justify-end bg-[#07090C]">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(contextData, null, 2));
                  alert('Telemetry JSON copied to clipboard.');
                }}
                className="px-3 py-1.5 rounded bg-[#00C2FF] text-[#07090C] font-bold text-xs hover:bg-[#00A8DE] transition-colors"
              >
                Copy Context JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
