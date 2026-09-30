# TERMINALX
> **Markets. Data. Intelligence.**

TerminalX is an institutional-grade paper trading platform and financial terminal engineered for Indian and global financial markets. Inspired by professional trading platforms like Bloomberg Terminal and modern fintech suites (Zerodha Kite, TradingView, Koyfin), TerminalX provides low-latency market data visualization, technical indicator calculations, Level 2 order books, and real-time virtual trade execution with zero financial risk.

Designed and developed as a 3rd-year Information Technology engineering portfolio project demonstrating full-stack engineering, financial data modeling, modular state management, and modern component architecture.

---

## 🎯 Product Concept & Core Features (Stage 1)

TerminalX enables students, quantitative enthusiasts, and traders to simulate positions using virtual capital (default starting balance: **₹10,00,000 INR**).

### Implemented in Stage 1
- **Top Live Market Ticker**: Streaming major benchmarks including **NIFTY 50**, **SENSEX**, **USD/INR**, **S&P 500**, and **NASDAQ** with real-time percentage change flash.
- **Institutional Workspace Shell**: Collapsible left sidebar navigation, top market bar, and high-density viewport optimized for financial data analysis.
- **Interactive Candlestick Charts**: Powered by TradingView **Lightweight Charts v5** featuring intraday and daily historical candles, volume histogram, and timeframes (`1D`, `5D`, `1M`, `6M`, `1Y`, `5Y`).
- **Mathematical Technical Indicators**:
  - Simple Moving Averages: **SMA 20**, **SMA 50**, **SMA 200**
  - Exponential Moving Average: **EMA 21**
  - **Bollinger Bands** (20-period, 2σ)
  - **Relative Strength Index (RSI 14)**
  - MACD indicator calculation logic
- **Paper Trading Execution Engine**:
  - Live BUY and SELL order placement with real-time balance validation
  - Support for **MARKET** and **LIMIT** order types
  - Dynamic position tracking, cost basis reconciliation, and unrealized/realized P&L calculations
  - Full execution notification toasts and trade audit history
- **Level 2 Market Depth (Order Book)**: 6-level bid/ask depth visualization with spread tracking and liquidity bars.
- **Portfolio & Risk Analytics**: Recharts equity curve visualization, asset allocation breakdowns, and quantitative risk metrics (Sharpe ratio, win rate, profit factor, maximum drawdown).
- **Multi-Asset Market Explorer**: Cross-asset coverage spanning Indian Equities, Benchmark Indices, Global Indices, Forex Currencies, and Commodities with sorting and instant search.
- **Instant Command Search Modal**: Global keyboard shortcut (`/`) to lookup securities by symbol or company name.
- **Financial News Feed**: Market dispatches categorized by Macro, Earnings, Markets, and Commodities with algorithmic sentiment scoring.
- **Demo Mode**: Full operational fidelity without requiring third-party API keys or paid subscriptions.

---

## 💻 Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 with custom dark institutional palette
- **Typography**: Plus Jakarta Sans (Interface) & JetBrains Mono (Financial Telemetry)
- **Financial Charts**: TradingView `lightweight-charts` v5
- **Portfolio Analytics**: `recharts`
- **State Management**: `zustand` for client UI and paper trading simulation
- **Icons**: `lucide-react`

### Backend Architecture
- **Runtime**: Node.js + Express + TypeScript (`tsx`)
- **Database Architecture**: MongoDB & Mongoose schemas (prepared modularly for Stage 2)
- **Security**: JWT & bcrypt password hashing structure

---

## 📂 Project Structure

```
terminalx/
├── client/                     # Frontend Application
│   ├── app/                    # Page Views & Routes
│   │   ├── DashboardPage.tsx
│   │   ├── StockDetailPage.tsx
│   │   ├── MarketsView.tsx
│   │   ├── WatchlistPage.tsx
│   │   ├── PortfolioPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── IntelligencePage.tsx
│   │   ├── NewsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── LoginPage.tsx
│   ├── components/             # Modular UI Components
│   │   ├── common/             # CommandSearchModal, Skeletons
│   │   ├── dashboard/          # Metric cards, Portfolio chart, Watchlist table
│   │   ├── layout/             # Sidebar, TopMarketBar
│   │   ├── markets/            # Multi-asset grid & table
│   │   └── stock/              # TradingChart, OrderPanel, OrderBook, Header
│   ├── lib/                    # Client services & formatters
│   │   ├── formatters.ts       # Indian Rupee (INR) and USD number formatting
│   │   └── marketService.ts    # Client market data abstraction
│   ├── stores/                 # Zustand state stores
│   │   └── tradingStore.ts     # Virtual balance (₹10L), holdings, orders
│   └── types/                  # TypeScript interface contracts
│       ├── market.ts
│       └── trading.ts
│
├── server/                     # Backend API & Services
│   ├── config/                 # Database & environment configuration
│   ├── controllers/            # Request handlers (Market, Trading, Auth)
│   ├── middleware/             # Auth guard & centralized error handling
│   ├── models/                 # Mongoose domain models (User, Holding, Order, etc.)
│   ├── routes/                 # Express API routes
│   ├── services/               # Market data & paper trading engine
│   └── utils/                  # Mathematical technical indicators (SMA, EMA, RSI)
│
├── .env.example                # Environment variables template
├── index.html                  # HTML entry point with web fonts
├── metadata.json               # Application metadata
├── package.json                # Dependencies and build scripts
├── README.md                   # Project documentation
├── tsconfig.json               # TypeScript compiler config
└── vite.config.ts              # Vite bundler configuration
```

---

## ⚙️ Local Setup & Installation

### Prerequisites
- Node.js (version 18 or higher)
- npm or pnpm

### 1. Clone the repository
```bash
git clone https://github.com/your-username/terminalx.git
cd terminalx
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Start Development Server
```bash
npm run dev
```
The terminal interface will be accessible at `http://localhost:3000`.

---

## 🛡️ Demo Mode

TerminalX Stage 1 runs in **High-Fidelity Demo Mode** out of the box:
- No external paid API keys or financial subscriptions are required.
- Realistic quotes, historical candles, and Level 2 market depth are generated via `marketService` abstraction.
- Paper trades execute instantly against synthetic live bid/ask spreads.
- Virtual cash can be reset back to **₹10,00,000 INR** at any time via Settings or the top bar.

---

## 🗺️ Engineering Roadmap

- [x] **Stage 1: Core Terminal & Paper Trading Engine** (Completed)
  - Institutional dark UI shell, Lightweight Charts candlestick engine, Level 2 order book, client paper trading store, simulated order execution, INR currency formatters, and complete route scaffolding.
- [ ] **Stage 2: Persistent Database & Authentication** (Upcoming)
  - Connect MongoDB with Mongoose models, implement user registration/login with bcrypt password hashing and JWT token verification.
- [ ] **Stage 3: Advanced Trading Engine & Execution Logic**
  - Stop-loss orders, trailing stops, limit order book matching, margin calculations, and real-time execution worker.
- [ ] **Stage 4: Custom Watchlists & Screener**
  - Multi-watchlist creation, real-time volume breakout screener, and advanced technical scanner.
- [ ] **Stage 5: TerminalX Intelligence AI Engine**
  - Conversational market analysis powered by Google Gemini 2.5 API, multimodal chart analysis, earnings report summarization, and macroeconomic sentiment synthesis.

---

## 📄 License
This project is open-source under the MIT License.
