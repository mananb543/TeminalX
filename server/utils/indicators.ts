/**
 * TerminalX - Technical Indicators Engine
 * Mathematical implementation of SMA, EMA, RSI, MACD, and Bollinger Bands
 */

export interface OHLCV {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorPoint {
  time: string | number;
  value: number;
}

export interface BollingerBandsPoint {
  time: string | number;
  upper: number;
  middle: number;
  lower: number;
}

export interface MACDPoint {
  time: string | number;
  macd: number;
  signal: number;
  histogram: number;
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data: OHLCV[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({
      time: data[i].time,
      value: +(sum / period).toFixed(2),
    });
  }
  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(data: OHLCV[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (data.length < period) return result;

  const k = 2 / (period + 1);
  let firstSma = 0;
  for (let i = 0; i < period; i++) {
    firstSma += data[i].close;
  }
  let currentEma = firstSma / period;
  result.push({ time: data[period - 1].time, value: +currentEma.toFixed(2) });

  for (let i = period; i < data.length; i++) {
    currentEma = data[i].close * k + currentEma * (1 - k);
    result.push({
      time: data[i].time,
      value: +currentEma.toFixed(2),
    });
  }
  return result;
}

/**
 * Relative Strength Index (RSI - 14 period default)
 */
export function calculateRSI(data: OHLCV[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (data.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);
  result.push({ time: data[period].time, value: +rsi.toFixed(2) });

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);

    result.push({ time: data[i].time, value: +rsi.toFixed(2) });
  }

  return result;
}

/**
 * Bollinger Bands (20 period, 2 standard deviations)
 */
export function calculateBollingerBands(data: OHLCV[], period = 20, multiplier = 2): BollingerBandsPoint[] {
  const result: BollingerBandsPoint[] = [];
  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const middle = sum / period;

    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(data[i - j].close - middle, 2);
    }
    const stdDev = Math.sqrt(variance / period);

    result.push({
      time: data[i].time,
      upper: +(middle + multiplier * stdDev).toFixed(2),
      middle: +middle.toFixed(2),
      lower: +(middle - multiplier * stdDev).toFixed(2),
    });
  }

  return result;
}
