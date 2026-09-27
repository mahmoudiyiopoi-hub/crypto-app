export type SignalAction = 'BUY' | 'SELL' | 'CLOSE' | 'WAIT';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CalculatedBar extends OHLCV {
  tr?: number;
  atr?: number;
  plusDm?: number;
  minusDm?: number;
  plusDi?: number;
  minusDi?: number;
  dx?: number;
  adx?: number;
  basicUpper?: number;
  basicLower?: number;
  finalUpper?: number;
  finalLower?: number;
  supertrend?: number;
  trendDir?: 1 | -1; // 1 = bullish, -1 = bearish
}

export interface StrategyParams {
  atrPeriod: number;
  supertrendMult: number;
  adxPeriod: number;
  adxEntry: number;
  adxExit: number;
  slMultiplier: number;
  timeframe: string;
}

export interface CryptoSignal {
  id: string;
  symbol: string;
  cleanSymbol: string;
  baseAsset: string;
  quoteAsset: string;
  action: SignalAction;
  titleAr: string;
  titleEn: string;
  reasonAr: string;
  reasonEn: string;
  closePrice: number;
  currentPrice: number;
  change24h: number;
  entryPrice: number | null;
  stopLoss: number | null;
  slPercent: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  riskReward: number;
  atr: number;
  adx: number;
  plusDi: number;
  minusDi: number;
  supertrend: number;
  trendDir: 1 | -1;
  timestamp: number;
  formattedTime: string;
}

export interface NotificationItem {
  id: string;
  timestamp: number;
  symbol: string;
  action: SignalAction;
  price: number;
  sl?: number;
  tp1?: number;
  adx: number;
  message: string;
  read: boolean;
}
