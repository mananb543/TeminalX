/**
 * TerminalX - Deterministic Demo News & Event Provider
 * Provides curated, realistic financial news dispatches and corporate actions
 * for Indian equities, benchmark indices, and macroeconomic developments.
 */

import { NewsArticle, MarketEvent, NewsProvider, EventFilterParams } from './NewsProvider.ts';

export const DEMO_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'art-rel-01',
    headline: 'Reliance Industries Plans Mega Clean Energy Expansion at Jamnagar Complex',
    summary: 'RIL announces targeted commissioning schedules for its 20GW solar module manufacturing facility and advanced energy storage giga-factory at Dhirubhai Ambani Green Energy Giga Complex.',
    source: 'The Economic Times',
    url: 'https://economictimes.indiatimes.com/industry/energy/oil-gas/reliance-industries-clean-energy-jamnagar/articleshow/108920114.cms',
    publishedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    symbols: ['RELIANCE'],
    categories: ['CORPORATE', 'STOCKS', 'ENERGY'],
    language: 'en',
    sentiment: 'POSITIVE',
  },
  {
    id: 'art-rbi-02',
    headline: 'RBI Monetary Policy Committee Maintains Benchmark Repo Rate at 6.50% with Disinflation Focus',
    summary: 'Reserve Bank of India Governor retains the policy stance focused on withdrawal of accommodation, citing robust domestic economic resilience and food price vigilance.',
    source: 'Financial Express',
    url: 'https://www.financialexpress.com/policy/economy-rbi-monetary-policy-committee-repo-rate-decision-3449102/',
    publishedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    symbols: ['NIFTY 50', 'NIFTY BANK', 'SBIN', 'HDFCBANK'],
    categories: ['ECONOMY', 'MARKET'],
    language: 'en',
    sentiment: 'NEUTRAL',
  },
  {
    id: 'art-tcs-03',
    headline: 'TCS Signs Multi-Billion Dollar Multi-Year Digital Transformation Pact with European Tier-1 Financial Institution',
    summary: 'Tata Consultancy Services expands cloud modernization and artificial intelligence enterprise workflows under an expanded 7-year strategic engagement.',
    source: 'Mint',
    url: 'https://www.livemint.com/companies/news/tcs-bags-multi-year-deal-european-bank-enterprise-ai-11712839210291.html',
    publishedAt: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    symbols: ['TCS', 'INFY'],
    categories: ['TECHNOLOGY', 'CORPORATE'],
    language: 'en',
    sentiment: 'POSITIVE',
  },
  {
    id: 'art-hdfc-04',
    headline: 'HDFC Bank Deposits Grow 16.5% YoY in Latest Operational Disclosure',
    summary: 'Private sector banking giant posts robust retail deposit mobilization and steady credit-deposit ratio glidepath following post-merger operational harmonization.',
    source: 'Business Standard',
    url: 'https://www.business-standard.com/companies/news/hdfc-bank-q4-updates-advances-deposits-growth-124040400122_1.html',
    publishedAt: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    symbols: ['HDFCBANK', 'NIFTY BANK'],
    categories: ['EARNINGS', 'STOCKS'],
    language: 'en',
    sentiment: 'POSITIVE',
  },
  {
    id: 'art-infy-05',
    headline: 'Infosys Expands Generative AI Collaboration Framework for Telecom and Media Enterprises',
    summary: 'Infosys Topaz platform integrates localized enterprise LLMs to streamline customer service automation and network diagnostic telemetry.',
    source: 'The Hindu BusinessLine',
    url: 'https://www.thehindubusinessline.com/info-tech/infosys-topaz-generative-ai-telecom-partnership/article68021942.ece',
    publishedAt: new Date(Date.now() - 320 * 60 * 1000).toISOString(),
    symbols: ['INFY'],
    categories: ['TECHNOLOGY', 'STOCKS'],
    language: 'en',
    sentiment: 'POSITIVE',
  },
  {
    id: 'art-icici-06',
    headline: 'ICICI Bank Reports Consistent Net Interest Margin Resiliency and Asset Quality Improvement',
    summary: 'Brokerages maintain overweight ratings as retail lending quality and provision coverage remain in the highest quartile among domestic private lenders.',
    source: 'Moneycontrol',
    url: 'https://www.moneycontrol.com/news/business/earnings/icici-bank-asset-quality-nim-performance-analysis-12582910.html',
    publishedAt: new Date(Date.now() - 400 * 60 * 1000).toISOString(),
    symbols: ['ICICIBANK', 'NIFTY BANK'],
    categories: ['EARNINGS', 'STOCKS'],
    language: 'en',
    sentiment: 'POSITIVE',
  },
  {
    id: 'art-sbin-07',
    headline: 'State Bank of India Raises Capital via Tier-II Bonds at Competitive 7.38% Coupon Rate',
    summary: 'Indias largest lender successfully prices its non-convertible debenture issuance with institutional oversubscription of over 3.5 times the base size.',
    source: 'Reuters India',
    url: 'https://www.reuters.com/world/india/state-bank-india-raises-capital-tier-2-bonds-738-coupon-2024-03-22/',
    publishedAt: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
    symbols: ['SBIN'],
    categories: ['CORPORATE', 'STOCKS'],
    language: 'en',
    sentiment: 'NEUTRAL',
  },
  {
    id: 'art-tata-08',
    headline: 'Tata Motors Commercial Vehicles and Passenger EV Units Announce Demerger Scheme Timeline',
    summary: 'Board of directors approves composite scheme of arrangement to demerge commercial and passenger business verticals into two independent listed entities on NSE and BSE.',
    source: 'The Economic Times',
    url: 'https://economictimes.indiatimes.com/industry/auto/auto-news/tata-motors-demerger-scheme-board-approval/articleshow/108221940.cms',
    publishedAt: new Date(Date.now() - 600 * 60 * 1000).toISOString(),
    symbols: ['TATAMOTORS'],
    categories: ['CORPORATE', 'STOCKS'],
    language: 'en',
    sentiment: 'POSITIVE',
  },
  {
    id: 'art-bharti-09',
    headline: 'Bharti Airtel ARPU Increases to ₹208 on 5G Data Adoption and Premium Plan Migration',
    summary: 'Telecom operator registers sustained average revenue per user (ARPU) expansion alongside broadband and enterprise connectivity additions across key circles.',
    source: 'Mint',
    url: 'https://www.livemint.com/companies/news/bharti-airtel-arpu-growth-5g-telecom-subscriber-base-117112039401.html',
    publishedAt: new Date(Date.now() - 720 * 60 * 1000).toISOString(),
    symbols: ['BHARTIARTL'],
    categories: ['EARNINGS', 'STOCKS'],
    language: 'en',
    sentiment: 'POSITIVE',
  },
  {
    id: 'art-itc-10',
    headline: 'ITC Hotels Demerger Receives Approval from Stock Exchanges and Institutional Shareholders',
    summary: 'Conglomerate progresses towards listing ITC Hotels Limited as a separate listed hospitality pure-play with 40% direct holding retained by parent ITC.',
    source: 'Business Standard',
    url: 'https://www.business-standard.com/companies/news/itc-hotels-demerger-shareholder-nod-regulatory-clearance-124040200888_1.html',
    publishedAt: new Date(Date.now() - 840 * 60 * 1000).toISOString(),
    symbols: ['ITC'],
    categories: ['CORPORATE', 'STOCKS'],
    language: 'en',
    sentiment: 'NEUTRAL',
  },
  {
    id: 'art-lt-11',
    headline: 'Larsen & Toubro Secures Ultra-Mega Power Transmission Contract in Middle East Corridor',
    summary: 'L&T Hydrocarbon and Power Transmission vertical bags EPC orders valued between ₹5,000 crore to ₹10,000 crore for regional grid interconnection.',
    source: 'Financial Express',
    url: 'https://www.financialexpress.com/business/industry-larsen-and-toubro-mega-order-middle-east-transmission-3441920/',
    publishedAt: new Date(Date.now() - 960 * 60 * 1000).toISOString(),
    symbols: ['LT'],
    categories: ['CORPORATE', 'STOCKS'],
    language: 'en',
    sentiment: 'POSITIVE',
  },
  {
    id: 'art-axis-12',
    headline: 'Axis Bank Integrates Unified Lending Management System to Accelerate SME Approvals',
    summary: 'Axis Bank rolls out end-to-end paperless SME financing architecture reducing turnaround times to under 48 hours for verified credit applicants.',
    source: 'Moneycontrol',
    url: 'https://www.moneycontrol.com/news/business/banks/axis-bank-digital-sme-lending-platform-rollout-12502911.html',
    publishedAt: new Date(Date.now() - 1100 * 60 * 1000).toISOString(),
    symbols: ['AXISBANK', 'NIFTY BANK'],
    categories: ['CORPORATE', 'STOCKS'],
    language: 'en',
    sentiment: 'POSITIVE',
  },
  {
    id: 'art-macro-13',
    headline: 'India CPI Inflation Moderates to 4.85% Led by Core Disinflation',
    summary: 'Ministry of Statistics & Programme Implementation data reveals consumer price index cooling within the Reserve Bank of India tolerance band.',
    source: 'The Hindu',
    url: 'https://www.thehindu.com/business/Economy/india-retail-cpi-inflation-moderates-core-inflation/article68058201.ece',
    publishedAt: new Date(Date.now() - 1200 * 60 * 1000).toISOString(),
    symbols: ['NIFTY 50', 'SENSEX'],
    categories: ['ECONOMY', 'MARKET'],
    language: 'en',
    sentiment: 'POSITIVE',
  },
  {
    id: 'art-oil-14',
    headline: 'Crude Oil Pulls Back as Brent Consolidates Near $73/bbl Amid Inventory Build',
    summary: 'Energy futures retreat slightly as global refining throughput balances geopolitical risk premiums, offering cost respite to Indian state refiners.',
    source: 'Bloomberg Markets',
    url: 'https://www.bloomberg.com/news/articles/2024-04-08/oil-retreats-as-middle-east-tensions-balance-us-inventory-build',
    publishedAt: new Date(Date.now() - 1350 * 60 * 1000).toISOString(),
    symbols: ['CRUDE OIL', 'RELIANCE'],
    categories: ['COMMODITIES', 'GLOBAL MARKETS'],
    language: 'en',
    sentiment: 'NEUTRAL',
  },
];

export const DEMO_MARKET_EVENTS: MarketEvent[] = [
  {
    id: 'evt-rel-01',
    type: 'EARNINGS',
    title: 'Reliance Industries Q4 FY25 Financial Results & Board Meeting',
    symbol: 'RELIANCE',
    eventDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Board of Directors meeting to approve audited standalone and consolidated financial results for the quarter and financial year, and recommend dividend.',
    source: 'NSE Corporate Filing',
    url: 'https://www.nseindia.com/companies-listing/corporate-filings-board-meetings',
    metadata: { exchange: 'NSE', quarter: 'Q4 FY25', purpose: 'Financial Results & Dividend' },
  },
  {
    id: 'evt-tcs-02',
    type: 'DIVIDEND',
    title: 'TCS Final Dividend Ex-Date & Record Date',
    symbol: 'TCS',
    eventDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Ex-dividend date for final dividend of ₹28 per equity share of ₹1 face value.',
    source: 'BSE Corporate Announcement',
    url: 'https://www.bseindia.com/corporates/ann.html',
    metadata: { dividendAmount: 28, faceValue: 1, type: 'Final Dividend' },
  },
  {
    id: 'evt-infy-03',
    type: 'EARNINGS',
    title: 'Infosys Limited Q4 FY25 Earnings Call & Guidance Release',
    symbol: 'INFY',
    eventDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Quarterly investor conference call to discuss business performance and constant currency revenue guidance for fiscal year 2026.',
    source: 'Infosys Investor Relations',
    url: 'https://www.infosys.com/investors.html',
    metadata: { time: '16:00 IST', webcast: true },
  },
  {
    id: 'evt-hdfc-04',
    type: 'DIVIDEND',
    title: 'HDFC Bank Dividend Declaration & Annual General Meeting',
    symbol: 'HDFCBANK',
    eventDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Ex-dividend date for proposed dividend of ₹19.50 per share subject to shareholder approval at AGM.',
    source: 'NSE Corporate Action',
    url: 'https://www.nseindia.com/companies-listing/corporate-actions',
    metadata: { dividendAmount: 19.5, currency: 'INR' },
  },
  {
    id: 'evt-rbi-05',
    type: 'ECONOMIC_EVENT',
    title: 'Reserve Bank of India Monetary Policy Committee (MPC) Bi-Monthly Review',
    symbol: 'NIFTY 50',
    eventDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'RBI MPC policy announcement regarding policy repo rate, SDF rate, MSF rate, and economic growth forecasts.',
    source: 'Reserve Bank of India',
    url: 'https://www.rbi.org.in/',
    metadata: { category: 'Monetary Policy', country: 'India' },
  },
  {
    id: 'evt-tata-06',
    type: 'CORPORATE_ACTION',
    title: 'Tata Motors Commercial Vehicles & Passenger EV Demerger NCLT Hearing',
    symbol: 'TATAMOTORS',
    eventDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'National Company Law Tribunal (NCLT) Mumbai bench hearing on composite scheme of arrangement for demerger.',
    source: 'BSE Corporate Filing',
    url: 'https://www.bseindia.com/corporates/ann.html',
    metadata: { court: 'NCLT Mumbai', type: 'Scheme of Demerger' },
  },
  {
    id: 'evt-itc-07',
    type: 'CORPORATE_ACTION',
    title: 'ITC Hotels Separate Listing Scheme Record Date',
    symbol: 'ITC',
    eventDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Record date for determination of eligible ITC shareholders to receive 1 share in ITC Hotels for every 10 shares held in ITC.',
    source: 'NSE Corporate Action',
    url: 'https://www.nseindia.com/companies-listing/corporate-actions',
    metadata: { swapRatio: '1:10', newEntity: 'ITC Hotels Limited' },
  },
  {
    id: 'evt-nifty-08',
    type: 'MAJOR_INDEX_EVENT',
    title: 'NSE NIFTY 50 & NIFTY BANK Derivatives Monthly Expiry Settlement',
    symbol: 'NIFTY 50',
    eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Last Thursday monthly derivative contracts expiry and institutional index physical/cash settlement.',
    source: 'National Stock Exchange of India',
    url: 'https://www.nseindia.com/products-services/equity-derivatives',
    metadata: { contractType: 'Monthly Futures & Options' },
  },
];

export class DemoNewsProvider implements NewsProvider {
  readonly id = 'demo' as const;
  readonly name = 'TerminalX Institutional Wire (Demo)';

  async getMarketNews(limit = 20): Promise<NewsArticle[]> {
    return DEMO_NEWS_ARTICLES.slice(0, limit);
  }

  async getCompanyNews(symbol: string, limit = 10): Promise<NewsArticle[]> {
    const cleanSym = symbol.toUpperCase().trim();
    const matched = DEMO_NEWS_ARTICLES.filter((art) =>
      art.symbols.some((s) => s.toUpperCase() === cleanSym)
    );
    if (matched.length > 0) {
      return matched.slice(0, limit);
    }
    return DEMO_NEWS_ARTICLES.slice(0, Math.min(3, limit));
  }

  async searchNews(query: string, limit = 20): Promise<NewsArticle[]> {
    const cleanQ = query.toLowerCase().trim();
    if (!cleanQ) {
      return DEMO_NEWS_ARTICLES.slice(0, limit);
    }

    const matched = DEMO_NEWS_ARTICLES.filter(
      (art) =>
        art.headline.toLowerCase().includes(cleanQ) ||
        art.summary.toLowerCase().includes(cleanQ) ||
        art.symbols.some((s) => s.toLowerCase().includes(cleanQ)) ||
        art.categories.some((c) => c.toLowerCase().includes(cleanQ)) ||
        art.source.toLowerCase().includes(cleanQ)
    );

    return matched.slice(0, limit);
  }

  async getArticleById(id: string): Promise<NewsArticle | null> {
    const found = DEMO_NEWS_ARTICLES.find((a) => a.id === id);
    return found ? { ...found } : null;
  }

  async getEvents(params?: EventFilterParams): Promise<MarketEvent[]> {
    let events = [...DEMO_MARKET_EVENTS];

    if (params?.symbol) {
      const sym = params.symbol.toUpperCase().trim();
      events = events.filter((e) => e.symbol.toUpperCase() === sym);
    }

    if (params?.type) {
      events = events.filter((e) => e.type === params.type);
    }

    if (params?.upcomingOnly) {
      const today = new Date().toISOString().split('T')[0];
      events = events.filter((e) => e.eventDate >= today);
    }

    if (params?.from) {
      events = events.filter((e) => e.eventDate >= params.from!);
    }

    if (params?.to) {
      events = events.filter((e) => e.eventDate <= params.to!);
    }

    events.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    const limit = params?.limit || 20;
    return events.slice(0, limit);
  }

  async getCompanyEvents(symbol: string): Promise<MarketEvent[]> {
    return this.getEvents({ symbol, upcomingOnly: false, limit: 10 });
  }
}
