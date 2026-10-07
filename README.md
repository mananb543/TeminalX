# TERMINALX
> **Markets. Data. Intelligence. — Institutional-Grade Financial Terminal & Paper Trading Platform**

TerminalX is a full-stack, production-hardened paper trading platform and financial analytics terminal engineered for Indian and global equities. Inspired by institutional suites (Bloomberg Terminal, Koyfin, Zerodha Kite, TradingView), TerminalX pairs real-time market data visualization and quantitative risk modeling with an automated alerting engine, a multi-turn AI financial intelligence analyst, and simulated order execution.

> **DISCLAIMER**: TerminalX is strictly an educational simulation and paper-trading platform. All cash balances (default: ₹10,00,000 INR virtual capital), portfolio holdings, and order executions are entirely simulated with zero real financial liability. TerminalX does not execute live orders on any securities exchange or broker.

---

## 🏛 System Architecture

TerminalX is architected as a high-throughput, modular TypeScript application:

```
terminalx/
├── client/                         # Frontend Application (React 19 + TypeScript + Vite)
│   ├── app/                        # Workspace views (Dashboard, Markets, StockDetail,
│   │                               #   Portfolio, Orders, Analytics, Intelligence, News, Alerts)
│   ├── components/                 # High-density institutional UI widgets & charts
│   ├── lib/                        # Typed API clients (alertClient, marketClient, etc.)
│   └── stores/                     # Zustand state management (authStore, tradingStore)
├── server/                         # Backend Application (Node.js + Express + TypeScript)
│   ├── ai/                         # AI Financial Intelligence Engine (Gemini & Deterministic)
│   ├── alerts/                     # Automated Alerts Engine & Background Scheduler
│   ├── analytics/                  # Quantitative Portfolio & Risk Analytics Engine
│   ├── config/                     # Environment validation & MongoDB Atlas configuration
│   ├── controllers/                # HTTP request handlers & validation
│   ├── market/                     # Market Data Provider Abstraction (Demo & Twelve Data)
│   ├── middleware/                 # Security headers, rate limiting, logging, auth, errors
│   ├── models/                     # Mongoose schemas & compound database indexes
│   ├── news/                       # Financial News Wire & Corporate Actions Provider
│   ├── routes/                     # Authenticated and public Express API routes
│   └── services/                   # Storage abstraction (Atlas + Resilient In-Memory)
├── tests/                          # Automated regression & verification test suites
├── server.ts                       # Full-stack server entry point with Vite middleware
└── package.json                    # Dependencies & build scripts
```

---

## ⚡ Core Engines & Capabilities

### 1. Market Data Engine (Stage 3)
- Unified provider interface (`MarketDataProvider`) with seamless switching between deterministic **Demo Provider** and live **Twelve Data Provider**.
- In-memory candle caching, quote batching, and request deduplication.
- Coverage across Indian Equities (NSE/BSE), Benchmark Indices (NIFTY 50, SENSEX), Global Indices, Currencies (USD/INR), and Commodities.
- Interactive TradingView `lightweight-charts` v5 with technical overlays (SMA 20/50/200, EMA 21, Bollinger Bands, RSI 14, MACD).

### 2. Paper Trading & Position Ledger (Stage 2)
- Real-time BUY/SELL execution with strict balance checks and cost-basis reconciliation.
- Support for **MARKET** and **LIMIT** order types.
- Atomic position updates with validation against overdrafts and overselling.
- User-isolated order audit ledger and transaction history.

### 3. Quantitative Risk & Portfolio Analytics (Stage 4)
- Mark-to-market portfolio valuation and daily P&L attribution.
- Annualized Volatility, Sharpe Ratio, and 95% Historical Value-at-Risk (VaR).
- Peak-to-trough Maximum Drawdown calculation and NIFTY 50 benchmark beta/alpha comparison.
- Herfindahl-Hirschman Index (HHI) position concentration analysis.
- Graceful handling of empty or insufficient historical data without fabricating numerical metrics.

### 4. AI Financial Intelligence Engine (Stage 5)
- Server-side integration with Google Gemini (`gemini-3.8-flash`) via the modern `@google/genai` SDK.
- Zero-leak architecture: API credentials never enter client bundles.
- Tool-augmented function calling with real-time portfolio context transparency.
- High-precision **Deterministic Financial Intelligence Engine** fallback if external LLM APIs are offline or unconfigured.

### 5. Financial News & Corporate Action Calendar (Stage 6)
- Multi-channel financial news wire with sentiment scoring (Positive, Neutral, Negative) and category tagging.
- User-scoped portfolio news personalized to currently held securities.
- Forward-looking corporate event calendar tracking upcoming Earnings dates, Dividend ex-dates, and Board meetings.

### 6. Automated Alerts & Scheduled Monitoring (Stage 7)
- 8 alert rule types: `PRICE`, `PRICE_CHANGE`, `PORTFOLIO_PNL`, `PORTFOLIO_DRAWDOWN`, `RISK`, `WATCHLIST`, `NEWS`, `EVENT`.
- 7 logical operators including state-machine crossing triggers (`CROSSES_ABOVE`, `CROSSES_BELOW`).
- Intelligent deduplication, configurable cooldown windows, and quote grouping across rules.
- Background singleton scheduler running periodic evaluations on a safe 45-second cadence.
- In-app incident notification ledger with unread counters and badge indicators.

### 7. Production Hardening & Security (Stage 8)
- Strict HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, HSTS).
- Multi-tier in-memory rate limiting across authentication, order submission, and AI queries.
- Structured request logging with unique tracing IDs (`X-Request-Id`).
- Comprehensive input validation rejecting non-finite numbers, malformed symbols, and parameter pollution.
- Graceful shutdown handling (`SIGTERM`/`SIGINT`) with in-flight connection draining, scheduler halting, and MongoDB connection cleanup.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Lucide Icons, Lightweight Charts v5, Recharts.
- **Backend**: Node.js, Express, TypeScript (`tsx`), Mongoose / MongoDB Atlas, Bcryptjs, JsonWebToken.
- **AI & Data**: `@google/genai`, Twelve Data REST API.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- npm 9+ installed

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment configuration:
```bash
cp .env.example .env
```

Configure your environment variables as needed:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `3000` | Port for the full-stack server |
| `NODE_ENV` | Optional | `development` | Environment mode (`development` or `production`) |
| `MONGODB_URI` | Optional | `""` | MongoDB Atlas connection string. If omitted, uses resilient in-memory storage. |
| `MONGODB_DB_NAME` | Optional | `terminalx` | Database name |
| `JWT_SECRET` | Required (Prod) | `""` | Secret key for signing authentication tokens |
| `JWT_EXPIRES_IN` | Optional | `7d` | Token expiration duration |
| `MARKET_DATA_PROVIDER`| Optional | `demo` | Market data source: `demo` or `real` |
| `MARKET_DATA_API_KEY` | Optional | `""` | Twelve Data API key (only required when provider is `real`) |
| `AI_PROVIDER` | Optional | `gemini` | Intelligence engine: `gemini` or `deterministic` |
| `GEMINI_API_KEY` | Optional | `""` | Google Gemini API key (enables real-time LLM inference) |
| `NEWS_PROVIDER` | Optional | `demo` | Financial news source: `demo` or `real` |
| `NEWS_API_KEY` | Optional | `""` | News API key (only required when provider is `real`) |

> **Note on Demo Mode**: TerminalX runs out of the box with zero external API keys. When external keys are omitted, TerminalX automatically leverages its built-in market data and deterministic quantitative engines.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the automated test suites:

```bash
# Run TypeScript compilation check
npm run lint

# Run Stage 8 regression & verification suite
npm test

# Build production bundle
npm run build
```

---

## 🔒 Security Best Practices

1. **Authentication**: All user passwords are encrypted using `bcrypt` with salt rounds. Tokens are issued via JWT with 7-day expiration.
2. **Multi-User Isolation**: Every database query on user assets (holdings, transactions, alerts, notifications) is strictly scoped to the verified JWT session claims (`req.userId`).
3. **No Secret Leaks**: Secrets and credentials are never emitted in API responses, client bundles, or structured server logs.
4. **Input Defense**: All numeric quantities, order sides, prices, and query parameters undergo strict server-side validation.

---

## 📄 License
MIT License. Developed for educational, quantitative research, and engineering portfolio demonstration purposes.
