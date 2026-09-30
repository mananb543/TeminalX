import React, { useState } from 'react';
import { Brain, Sparkles, TrendingUp, AlertTriangle, ShieldCheck, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export const IntelligencePage: React.FC = () => {
  const [selectedStock, setSelectedStock] = useState('RELIANCE');
  const [promptInput, setPromptInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);

  const intelligenceSignals = [
    {
      symbol: 'RELIANCE',
      signal: 'BULLISH CONTINUATION',
      confidence: '82%',
      reason: '20-day moving average cleanly crossed 50-day SMA with 18% surge in volume relative to 30-day baseline.',
      horizon: 'Swing (5-10 Days)',
    },
    {
      symbol: 'TCS',
      signal: 'CONSOLIDATION ACCUMULATION',
      confidence: '74%',
      reason: 'RSI stabilized around 49.3 with repeated bounce off the ₹4,150 institutional support boundary.',
      horizon: 'Medium Term',
    },
    {
      symbol: 'CRUDE OIL',
      signal: 'BEARISH PRESSURE',
      confidence: '78%',
      reason: 'Persistent resistance below $74/bbl amidst upward revision in non-OPEC global refining capacity.',
      horizon: 'Short Term',
    },
  ];

  const handleSimulatedQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setAnalyzing(true);
    setTimeout(() => {
      setActiveAnalysis(
        `AI Market Synthesis for "${promptInput}": Based on current market liquidity, historical volatility compression, and open interest distribution across NSE derivative strikes, technical momentum suggests positive continuation with critical stop-loss at previous swing low.`
      );
      setAnalyzing(false);
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#F5F7FA] font-mono tracking-tight">
              TerminalX Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] text-[10px] font-mono font-semibold">
              PREVIEW · STAGE 1
            </span>
          </div>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Institutional market reasoning, technical pattern detection, and macro sentiment analysis
          </p>
        </div>
      </div>

      {/* Hero AI Interactive Query Box */}
      <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-mono text-[#00C2FF] mb-2">
          <Brain className="w-4 h-4" />
          <span>MARKET REASONING ENGINE (GEMINI INTEGRATION STAGE 5 ARCHITECTURE)</span>
        </div>

        <form onSubmit={handleSimulatedQuery} className="mt-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask an analytical question (e.g. 'Analyze breakout probability for RELIANCE' or 'What is driving IT margins?')..."
              className="flex-1 bg-[#11161D] border border-[#1B222C] focus:border-[#00C2FF] rounded px-4 py-2.5 text-xs font-mono text-[#F5F7FA] placeholder-[#505A66] focus:outline-none"
            />
            <button
              type="submit"
              disabled={analyzing}
              className="px-4 py-2.5 rounded bg-[#00C2FF] hover:bg-[#00A8DE] text-[#07090C] text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              {analyzing ? (
                <>
                  <Zap className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <span>Run Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {activeAnalysis && (
          <div className="mt-4 p-3.5 rounded bg-[#11161D] border border-[#00C2FF]/30 text-xs font-mono text-[#F5F7FA] leading-relaxed animate-in fade-in">
            <div className="flex items-center gap-2 text-[#00C2FF] font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Synthesized Market Report:</span>
            </div>
            {activeAnalysis}
          </div>
        )}
      </div>

      {/* Quantitative Signals Radar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {intelligenceSignals.map((sig, i) => (
          <div
            key={i}
            className="p-4 rounded-lg bg-[#0D1117] border border-[#1B222C] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#1B222C]">
                <span className="font-mono font-bold text-sm text-[#F5F7FA]">{sig.symbol}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161D26] text-[#00C2FF]">
                  {sig.confidence} Confidence
                </span>
              </div>

              <div className="mt-2.5">
                <span
                  className={`text-xs font-mono font-bold ${
                    sig.signal.includes('BULLISH')
                      ? 'text-[#22C55E]'
                      : sig.signal.includes('BEARISH')
                      ? 'text-[#EF4444]'
                      : 'text-[#F59E0B]'
                  }`}
                >
                  {sig.signal}
                </span>
                <p className="text-xs text-[#8B949E] mt-1.5 leading-relaxed">{sig.reason}</p>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-[#1B222C] text-[11px] font-mono text-[#505A66] flex justify-between">
              <span>Horizon:</span>
              <span className="text-[#8B949E]">{sig.horizon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Architecture Roadmap Notice */}
      <div className="p-4 rounded-lg bg-[#0D1117] border border-[#1B222C] text-xs">
        <div className="flex items-center gap-2 text-[#F5F7FA] font-mono font-semibold mb-1">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span>Stage 5 AI Architecture Roadmap</span>
        </div>
        <p className="text-[#8B949E] leading-relaxed">
          The full conversational TerminalX Intelligence Assistant powered by Google Gemini 2.5 Flash / Pro with server-side proxying and real-time live market grounding will be activated in Stage 5, following database persistence (Stage 2), real-time order matching (Stage 3), and technical screener indexing (Stage 4).
        </p>
      </div>
    </div>
  );
};
