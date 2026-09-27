import { OHLCV } from '../types/crypto';

// In-memory cache for candles to prevent rate limits
const candleCache = new Map<string, { timestamp: number; bars: OHLCV[] }>();
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Fetch OHLCV candles from Binance Futures (fapi) or Binance Spot (api)
 */
export async function fetchOHLCV(symbol: string, interval = '4h', limit = 100): Promise<OHLCV[]> {
  const clean = symbol.replace('/', '').toUpperCase();
  const cacheKey = `${clean}-${interval}-${limit}`;
  const cached = candleCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.bars;
  }

  const endpoints = [
    `https://fapi.binance.com/fapi/v1/klines?symbol=${clean}&interval=${interval}&limit=${limit}`,
    `https://api.binance.com/api/v3/klines?symbol=${clean}&interval=${interval}&limit=${limit}`,
  ];

  let rawData: unknown = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        rawData = await res.json();
        break;
      }
    } catch {
      // Continue to next endpoint
    }
  }

  if (!Array.isArray(rawData)) {
    throw new Error(`Failed to fetch klines for ${symbol}`);
  }

  // Binance Kline format:
  // [0: Open time, 1: Open, 2: High, 3: Low, 4: Close, 5: Volume, 6: Close time, ...]
  const bars: OHLCV[] = rawData.map((item: any[]) => ({
    timestamp: Number(item[0]),
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
    volume: parseFloat(item[5]),
  }));

  candleCache.set(cacheKey, { timestamp: Date.now(), bars });
  return bars;
}

/**
 * Fetch 24hr ticker stats (price change percent and last price)
 */
export async function fetch24hrTicker(symbol: string): Promise<{ lastPrice: number; priceChangePercent: number }> {
  const clean = symbol.replace('/', '').toUpperCase();
  const endpoints = [
    `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${clean}`,
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${clean}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return {
          lastPrice: parseFloat(data.lastPrice || data.price || '0'),
          priceChangePercent: parseFloat(data.priceChangePercent || '0'),
        };
      }
    } catch {
      // Fallback
    }
  }

  return { lastPrice: 0, priceChangePercent: 0 };
}
