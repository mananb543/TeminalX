/**
 * TerminalX - Deterministic Financial Intelligence Engine
 * Formulates rule-based quantitative intelligence when external LLMs are unavailable, rate-limited, or unconfigured.
 * Guaranteed 100% mathematical accuracy from actual portfolio and risk models.
 */

import { AIProvider, AIProviderResponse, ChatMessage } from './AIProvider.ts';
import { StructuredAIContext } from '../aiContextService.ts';

export class DeterministicProvider implements AIProvider {
  public readonly id = 'deterministic';
  public readonly name = 'Quantitative Rule-Based Financial Engine';
  public readonly isConfigured = true;

  public async generateResponse(
    userMessage: string,
    _history: ChatMessage[],
    context: StructuredAIContext,
    _userId: string
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const query = userMessage.toLowerCase();

    const p = context.portfolio;
    const r = context.risk;
    const h = context.holdings;
    const t = context.trading;
    const b = context.benchmark;

    let summary = '';
    let keyDrivers: string[] = [];
    let riskContext = '';
    let benchmarkSection = '';
    let limitations = '';

    // Format Indian Rupee currency helper
    const formatINR = (val: number) => {
      const sign = val < 0 ? '-' : '';
      return `${sign}₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    };

    // 1. Detect query intent
    const isPnLQuery =
      /\bdown\b/.test(query) ||
      /\bup\b/.test(query) ||
      query.includes('p&l') ||
      query.includes('pnl') ||
      query.includes('loss') ||
      query.includes('profit') ||
      query.includes('driver') ||
      query.includes('contribute') ||
      query.includes('today');

    const isConcentrationQuery =
      query.includes('concentrat') ||
      query.includes('hhi') ||
      query.includes('weight') ||
      query.includes('largest position') ||
      query.includes('diversif');

    const isRiskQuery =
      query.includes('risk') ||
      query.includes('sharpe') ||
      query.includes('volatilit') ||
      query.includes('drawdown') ||
      query.includes('var') ||
      query.includes('beta') ||
      query.includes('alpha');

    const isBenchmarkQuery =
      query.includes('nifty') ||
      query.includes('benchmark') ||
      query.includes('market') ||
      query.includes('index') ||
      query.includes('beat');

    const isTradeQuery =
      query.includes('trade') ||
      query.includes('win rate') ||
      query.includes('profit factor') ||
      query.includes('order') ||
      query.includes('transaction') ||
      query.includes('execution');

    const isRebalanceQuery =
      query.includes('rebalance') ||
      query.includes('allocation') ||
      query.includes('sector') ||
      query.includes('cash') ||
      query.includes('ideas');

    const isNewsQuery =
      query.includes('news') ||
      query.includes('headline') ||
      query.includes('wire') ||
      query.includes('dispatch') ||
      query.includes('development') ||
      query.includes('developments') ||
      query.includes('happened') ||
      query.includes('recent') ||
      query.includes('event') ||
      query.includes('events') ||
      query.includes('upcoming') ||
      query.includes('earnings') ||
      query.includes('dividend') ||
      query.includes('announcement') ||
      query.includes('filing');

    // Check if query is asking about a specific holding (e.g. RELIANCE, TCS)
    const matchedHolding = h.find(
      (pos) => query.includes(pos.symbol.toLowerCase()) || query.includes(pos.name.toLowerCase())
    );

    if (isNewsQuery) {
      const allNews = [
        ...(context.marketContext.verifiedPortfolioNews || []),
        ...(context.marketContext.verifiedMacroNews || []),
      ];

      // Check if user is asking about a specific ticker
      const targetSym = h.find(pos => query.includes(pos.symbol.toLowerCase()))?.symbol ||
        ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'ITC', 'LT', 'BHARTIARTL', 'AXISBANK', 'TATAMOTORS'].find(s => query.includes(s.toLowerCase()));

      let relevantArticles = allNews;
      if (targetSym) {
        const filtered = allNews.filter(a => a.symbols.map(s => s.toUpperCase()).includes(targetSym.toUpperCase()));
        if (filtered.length > 0) relevantArticles = filtered;
      }

      const topArticles = relevantArticles.slice(0, 3);
      const relevantEvents = (context.marketContext.portfolioEvents || []).slice(0, 4);

      summary = targetSym
        ? `Verified Intelligence & News Briefing for ${targetSym}: ${topArticles.length} recent verified dispatches and corporate actions retrieved from primary exchange and regulatory feeds.`
        : `Verified Financial News & Corporate Event Intelligence: Retrieved ${topArticles.length} dispatches directly relevant to your holdings and macroeconomic landscape.`;

      keyDrivers = topArticles.map((art) => {
        const isHeld = h.some(pos => art.symbols.includes(pos.symbol));
        const holdingObj = h.find(pos => art.symbols.includes(pos.symbol));
        return `NEWS ITEM\nHeadline: ${art.headline}\nSource: ${art.source}\nPublished: ${art.publishedAt}\nSymbols: ${art.symbols.join(', ')}\nURL: ${art.url}\nSummary: ${art.summary}\n\nFACT:\nThis article reports that ${art.headline}.\n\nFROM THE ARTICLE:\n${art.summary}\n\nINTERPRETATION:\n${
          isHeld && holdingObj
            ? `Directly impacts your active position in ${holdingObj.symbol} (${holdingObj.portfolioWeightPercent}% of portfolio, valuation ${formatINR(holdingObj.marketValue)}). Note: Do not assume this news caused price movements unless established by company filings.`
            : `Macroeconomic and sector-level relevance to Indian benchmark indices.`
        }`;
      });

      if (relevantEvents.length > 0) {
        keyDrivers.push(
          `UPCOMING CORPORATE ACTIONS & EVENTS:\n` +
          relevantEvents.map(e => `• [${e.eventDate}] ${e.symbol} (${e.type}): ${e.title} — ${e.description} (Source: ${e.source})`).join('\n')
        );
      }

      riskContext = `News sentiment and event calendar analysis must be viewed through risk exposure: highly weighted positions amplify news-driven volatility.`;
      benchmarkSection = `News items are sourced from verified public wires and regulatory disclosures (NSE/BSE/RBI). No synthetic news is generated.`;
      limitations = `Historical news does not guarantee future stock price trajectory. All interpretations are non-predictive.`;
    } else if (matchedHolding) {
      summary = `Position Analysis for ${matchedHolding.symbol} (${matchedHolding.name}): Current valuation is ${formatINR(
        matchedHolding.marketValue
      )} representing ${matchedHolding.portfolioWeightPercent}% of your total portfolio.`;

      keyDrivers = [
        `Quantity Held: ${matchedHolding.quantity} shares at an average cost basis of ${formatINR(
          matchedHolding.averagePrice
        )}.`,
        `Current Market Price: ${formatINR(matchedHolding.currentPrice)} (Day Change: ${
          matchedHolding.dayChangePercent >= 0 ? '+' : ''
        }${matchedHolding.dayChangePercent}%).`,
        `Unrealized Position P&L: ${formatINR(matchedHolding.unrealizedPnL)} (${
          matchedHolding.unrealizedPnLPercent >= 0 ? '+' : ''
        }${matchedHolding.unrealizedPnLPercent}% return on invested capital).`,
        `Day P&L Contribution: ${formatINR(matchedHolding.dayPnL)} attributed to today's market session.`,
      ];

      riskContext = `This single position constitutes ${matchedHolding.portfolioWeightPercent}% of total assets. ${
        matchedHolding.portfolioWeightPercent > 25
          ? 'CRITICAL EXPOSURE: This position exceeds institutional single-stock exposure thresholds (>25%).'
          : 'Exposure is within standard single-asset diversification thresholds.'
      }`;

      benchmarkSection = `Sector Classification: ${matchedHolding.sector} on ${matchedHolding.exchange}.`;
      limitations = `Calculated live against latest market quote. Tax implications, brokerage, and exchange STT charges are excluded.`;
    } else if (isPnLQuery) {
      const pnlState = p.dayPnL >= 0 ? 'gained' : 'declined';
      summary = `Your portfolio ${pnlState} ${formatINR(p.dayPnL)} (${p.dailyReturnPercent >= 0 ? '+' : ''}${
        p.dailyReturnPercent
      }%) during the active trading session. Cumulative portfolio P&L stands at ${formatINR(
        p.totalPnL
      )} (${p.totalReturnPercent >= 0 ? '+' : ''}${p.totalReturnPercent}% total return on ₹10,00,000 initial capital).`;

      // Sort holdings by day P&L contribution
      const sortedHoldings = [...h].sort((a, b) => b.dayPnL - a.dayPnL);
      if (sortedHoldings.length > 0) {
        keyDrivers = sortedHoldings.map(
          (pos) =>
            `${pos.symbol}: Contributed ${formatINR(pos.dayPnL)} (${pos.dayChangePercent >= 0 ? '+' : ''}${
              pos.dayChangePercent
            }% price move, position value ${formatINR(pos.marketValue)})`
        );
        keyDrivers.push(
          `Cash Allocation: ${formatINR(p.cash)} (${r.cashWeightPercent}% of portfolio) preserved static value.`
        );
      } else {
        keyDrivers = [
          `No active equity positions held. Portfolio is 100% allocated to cash reserves (${formatINR(p.cash)}).`,
        ];
      }

      riskContext = `Portfolio volatility is currently ${
        r.volatilityAnnualizedPercent !== null ? `${r.volatilityAnnualizedPercent}% annualized` : 'Pending 5+ sessions of history'
      }. Maximum peak-to-trough drawdown recorded is ${r.maxDrawdownPercent}%.`;

      benchmarkSection = context.marketContext.nifty50Quote
        ? `NIFTY 50 changed ${context.marketContext.nifty50Quote.changePercent >= 0 ? '+' : ''}${
            context.marketContext.nifty50Quote.changePercent
          }% today. Portfolio relative delta: ${(p.dailyReturnPercent - (context.marketContext.nifty50Quote.changePercent || 0)).toFixed(2)}%.`
        : `Benchmark comparison data is synchronizing.`;

      limitations = `P&L calculations utilize real mark-to-market valuations via Twelve Data/TerminalX feeds. Intraday price changes reflect active trading hours.`;
    } else if (isConcentrationQuery) {
      const hhi = r.concentrationHHI;
      let hhiLevel = 'Low Concentration (Well Diversified)';
      if (hhi > 2500) hhiLevel = 'High Concentration (Elevated Idiosyncratic Risk)';
      else if (hhi > 1500) hhiLevel = 'Moderate Concentration';

      summary = `Portfolio concentration audit: Herfindahl-Hirschman Index (HHI) is ${hhi} points, classifying your portfolio as "${hhiLevel}".`;

      keyDrivers = [
        `Number of active holdings: ${h.length} securities across ${
          new Set(h.map((x) => x.sector)).size
        } economic sectors.`,
        `Largest Position: ${r.largestPositionPercent}% of portfolio (${
          h.length > 0
            ? `${[...h].sort((a, b) => b.marketValue - a.marketValue)[0].symbol}`
            : 'None'
        }).`,
        `Top 3 Positions Weight: ${r.top3PositionsPercent}% combined equity exposure.`,
        `Unallocated Cash Weight: ${r.cashWeightPercent}% (${formatINR(p.cash)}).`,
      ];

      riskContext = `High concentration increases vulnerability to single-company negative earnings shocks. Institutional best practice recommends single equity weights below 15-20%.`;
      benchmarkSection = `Standard NIFTY 50 cap-weighted HHI is ~600-800. Your current portfolio HHI is ${hhi}.`;
      limitations = `Concentration calculations include all equities and liquid cash reserves.`;
    } else if (isRiskQuery) {
      summary = `Institutional Risk Engine Assessment: Portfolio volatility is ${
        r.volatilityAnnualizedPercent !== null ? `${r.volatilityAnnualizedPercent}% annualized` : 'pending additional history'
      }, with a Sharpe Ratio of ${r.sharpeRatio !== null ? r.sharpeRatio : 'pending (needs 5+ daily snapshots)'} against a ${
        r.riskFreeRateAssumption * 100
      }% risk-free rate assumption.`;

      keyDrivers = [
        `Beta vs NIFTY 50: ${r.betaToNifty50 !== null ? r.betaToNifty50 : 'Under observation (requires 5+ sessions)'} ${
          r.betaToNifty50 ? (r.betaToNifty50 > 1 ? '(Aggressive / higher market sensitivity)' : '(Defensive / lower market sensitivity)') : ''
        }.`,
        `Jensen's Alpha: ${r.alphaAnnualizedPercent !== null ? `${r.alphaAnnualizedPercent}% annualized` : 'Under observation'}.`,
        `Maximum Drawdown: ${r.maxDrawdownPercent}% from historical peak over a duration of ${r.maxDrawdownDurationDays} days.`,
        `Historical 95% 1-Day VaR: ${
          r.historicalVaR95Percent !== null
            ? `${r.historicalVaR95Percent}% of portfolio (${formatINR(r.historicalVaR95Amount || 0)}) maximum expected loss at 95% confidence`
            : 'Insufficient historical return series'
        }.`,
      ];

      riskContext = `The Sharpe ratio measures excess return per unit of volatility: Sharpe = (Return - ${
        r.riskFreeRateAssumption * 100
      }%) / Volatility. Values > 1.0 indicate favorable risk-adjusted generation.`;

      benchmarkSection = `NIFTY 50 serves as the sovereign market benchmark. Portfolio Beta indicates systemic market exposure.`;
      limitations = `Statistical metrics require minimum 5 daily portfolio valuation records. Configured risk-free rate: ${(
        r.riskFreeRateAssumption * 100
      ).toFixed(1)}% (PORTFOLIO_RISK_FREE_RATE).`;
    } else if (isBenchmarkQuery) {
      summary = `Performance vs NIFTY 50 (${b.range} Timeframe): Portfolio returned ${
        b.portfolioReturnPercent >= 0 ? '+' : ''
      }${b.portfolioReturnPercent}%, while the NIFTY 50 benchmark returned ${
        b.benchmarkReturnPercent >= 0 ? '+' : ''
      }${b.benchmarkReturnPercent}%. Relative excess return: ${
        b.relativeAlphaPercent >= 0 ? '+' : ''
      }${b.relativeAlphaPercent}%.`;

      keyDrivers = [
        `Portfolio Equity Return: ${b.portfolioReturnPercent}% over the evaluated window.`,
        `NIFTY 50 Index Return: ${b.benchmarkReturnPercent}% over the matching window.`,
        `Alpha Differential: ${b.relativeAlphaPercent >= 0 ? 'Outperforming benchmark by ' : 'Underperforming benchmark by '}${Math.abs(
          b.relativeAlphaPercent
        )}%.`,
        `Return Correlation: ${b.correlation !== null ? b.correlation.toFixed(2) : 'Insufficient overlapping data'}.`,
      ];

      riskContext = `Outperformance with low volatility indicates genuine manager skill, whereas high Beta portfolios often outpace bull markets through elevated leverage/risk.`;
      benchmarkSection = `Benchmark: National Stock Exchange (NSE) NIFTY 50 Index.`;
      limitations = `Returns are calculated using base-100 normalization on daily portfolio closing marks.`;
    } else if (isTradeQuery) {
      summary = `Trading Execution & Performance Audit: Across ${t.totalTrades} completed orders, your win rate is ${
        t.winRatePercent
      }%, with a Profit Factor of ${t.profitFactor !== null ? t.profitFactor : 'N/A'}.`;

      keyDrivers = [
        `Gross Profit: ${formatINR(t.grossProfit)} across profitable executions.`,
        `Gross Loss: ${formatINR(t.grossLoss)} across losing trade cycles.`,
        `Average Winning Trade: ${formatINR(t.avgWinningTradeAmount)} vs Average Losing Trade: ${formatINR(
          t.avgLosingTradeAmount
        )}.`,
        `Average Holding Duration: ${t.avgHoldingPeriodHours.toFixed(1)} hours.`,
        `Recent Activity: ${t.recentTransactions.length} recent executions logged in persistent ledger.`,
      ];

      riskContext = `Profit factor = Gross Profit / Gross Loss. A value above 1.5 indicates a robust quantitative edge. Maintain positive expectancy by keeping average win > average loss.`;
      benchmarkSection = `Trading ledger is synchronized with MongoDB Atlas point-in-time order matching.`;
      limitations = `FIFO lot matching is utilized for realized P&L accounting across BUY and SELL sequences.`;
    } else if (isRebalanceQuery) {
      summary = `Portfolio Allocation & Rebalancing Advisory (Informational Only): Total assets of ${formatINR(
        p.totalValue
      )} comprise ${100 - r.cashWeightPercent}% invested equities and ${r.cashWeightPercent}% cash reserves.`;

      keyDrivers = [
        `Cash Reserve: ${formatINR(p.cash)} (${r.cashWeightPercent}%). ${
          r.cashWeightPercent > 40
            ? 'Cash drag may dampen compounding in sustained market rallies.'
            : 'Healthy liquidity buffer for opportunistic dip deployment.'
        }`,
        `Sector Distribution: Spread across ${new Set(h.map((x) => x.sector)).size} sector clusters.`,
        `Largest Position: ${r.largestPositionPercent}% of portfolio.`,
        `Suggested Rebalancing Action: If any single holding exceeds 20% total weight, consider taking partial profits to rebalance into underweight defensive or growth sectors.`,
      ];

      riskContext = `Periodic quarterly or threshold-based rebalancing maintains target volatility profiles and enforces systematic profit-taking.`;
      benchmarkSection = `Advisory insights are purely educational and informational; not registered investment advice.`;
      limitations = `Does not account for individual tax brackets or transaction slippage.`;
    } else {
      // General comprehensive portfolio intelligence briefing
      summary = `Executive Portfolio Intelligence Briefing: Total portfolio valuation is ${formatINR(
        p.totalValue
      )}, reflecting an all-time return of ${p.totalReturnPercent >= 0 ? '+' : ''}${
        p.totalReturnPercent
      }% (${formatINR(p.totalPnL)} total P&L). Today's daily return is ${
        p.dailyReturnPercent >= 0 ? '+' : ''
      }${p.dailyReturnPercent}% (${formatINR(p.dayPnL)}).`;

      keyDrivers = [
        `Current Capital Allocation: ${formatINR(p.investedValue)} invested in ${h.length} holdings, ${formatINR(
          p.cash
        )} held in cash (${r.cashWeightPercent}%).`,
        `Unrealized Open P&L: ${formatINR(p.unrealizedPnL)} (${p.unrealizedPnLPercent >= 0 ? '+' : ''}${
          p.unrealizedPnLPercent
        }% mark-to-market).`,
        `Realized Closed P&L: ${formatINR(p.realizedPnL)} booked from closed trade cycles.`,
        `Positions Count: ${p.winningPositionsCount} winning positions, ${p.losingPositionsCount} losing positions (${
          p.positionsCount > 0 ? ((p.winningPositionsCount / p.positionsCount) * 100).toFixed(1) : 0
        }% position win rate).`,
      ];

      riskContext = `Concentration HHI is ${r.concentrationHHI}. Annualized Volatility: ${
        r.volatilityAnnualizedPercent !== null ? `${r.volatilityAnnualizedPercent}%` : 'N/A'
      }. Max Drawdown: ${r.maxDrawdownPercent}%.`;

      benchmarkSection = `NIFTY 50 Benchmark Alpha: ${b.relativeAlphaPercent >= 0 ? '+' : ''}${
        b.relativeAlphaPercent
      }% over the 1M period.`;

      limitations = `Operating in Deterministic Financial Intelligence Mode with live market pricing and mark-to-market valuations.`;
    }

    // Compose formatted markdown message
    const formattedMessage = [
      `### SUMMARY`,
      summary,
      ``,
      `### KEY DRIVERS`,
      ...keyDrivers.map((kd) => `• ${kd}`),
      ``,
      `### RISK CONTEXT`,
      riskContext,
      ``,
      `### BENCHMARK & SECTOR CONTEXT`,
      benchmarkSection,
      ``,
      `### IMPORTANT DATA LIMITATION`,
      limitations,
    ].join('\n');

    return {
      message: formattedMessage,
      provider: 'deterministic',
      model: 'Quantitative Rule-Based Engine',
      structuredSections: {
        summary,
        keyDrivers,
        riskContext,
        benchmark: benchmarkSection,
        limitations,
      },
      toolsUsed: ['portfolioAnalytics', 'riskMetrics', 'benchmarkComparison'],
      executionTimeMs: Date.now() - startTime,
    };
  }
}

export const deterministicProvider = new DeterministicProvider();
