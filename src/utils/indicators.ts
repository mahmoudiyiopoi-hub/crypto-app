import { CalculatedBar, CryptoSignal, OHLCV, StrategyParams } from '../types/crypto';

export const DEFAULT_PARAMS: StrategyParams = {
  atrPeriod: 10,
  supertrendMult: 3.0,
  adxPeriod: 14,
  adxEntry: 23.0,
  adxExit: 18.0,
  slMultiplier: 2.0,
  timeframe: '4h',
};

export const DEFAULT_SYMBOLS = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'BNB/USDT',
  'XRP/USDT',
  'ADA/USDT',
  'AVAX/USDT',
];

/**
 * Calculates True Range for OHLCV series
 */
export function calculateTrueRange(bars: OHLCV[]): number[] {
  const tr: number[] = new Array(bars.length);
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      tr[i] = bars[i].high - bars[i].low;
    } else {
      const hl = bars[i].high - bars[i].low;
      const hc = Math.abs(bars[i].high - bars[i - 1].close);
      const lc = Math.abs(bars[i].low - bars[i - 1].close);
      tr[i] = Math.max(hl, hc, lc);
    }
  }
  return tr;
}

/**
 * Wilder's Moving Average (RMA) used by ATR and ADX
 */
export function calculateWilderRMA(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  if (values.length < period) return result;

  // Initial SMA for first 'period' values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  result[period - 1] = sum / period;

  // Wilder's smoothing: RMA_t = (RMA_{t-1} * (period - 1) + val_t) / period
  for (let i = period; i < values.length; i++) {
    result[i] = (result[i - 1] * (period - 1) + values[i]) / period;
  }

  return result;
}

/**
 * Calculates Full Technical Indicators for series of bars:
 * - ATR (length = atrPeriod)
 * - Supertrend (length = atrPeriod, multiplier = supertrendMult)
 * - DMI & ADX (length = adxPeriod)
 */
export function calculateIndicators(
  rawBars: OHLCV[],
  params: StrategyParams = DEFAULT_PARAMS
): CalculatedBar[] {
  if (!rawBars || rawBars.length === 0) return [];

  const n = rawBars.length;
  const bars: CalculatedBar[] = rawBars.map((b) => ({ ...b }));

  // 1. Calculate True Range & Directional Movement (+DM, -DM)
  const trList: number[] = new Array(n).fill(0);
  const plusDmList: number[] = new Array(n).fill(0);
  const minusDmList: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      trList[i] = bars[i].high - bars[i].low;
      plusDmList[i] = 0;
      minusDmList[i] = 0;
    } else {
      const hDiff = bars[i].high - bars[i - 1].high;
      const lDiff = bars[i - 1].low - bars[i].low;

      const hl = bars[i].high - bars[i].low;
      const hc = Math.abs(bars[i].high - bars[i - 1].close);
      const lc = Math.abs(bars[i].low - bars[i - 1].close);
      trList[i] = Math.max(hl, hc, lc);

      plusDmList[i] = hDiff > lDiff && hDiff > 0 ? hDiff : 0;
      minusDmList[i] = lDiff > hDiff && lDiff > 0 ? lDiff : 0;
    }
  }

  // 2. Wilder smoothing for ATR (atrPeriod)
  const atrValues = calculateWilderRMA(trList, params.atrPeriod);

  // 3. Wilder smoothing for DMI & ADX (adxPeriod)
  const smoothedTr = calculateWilderRMA(trList, params.adxPeriod);
  const smoothedPlusDm = calculateWilderRMA(plusDmList, params.adxPeriod);
  const smoothedMinusDm = calculateWilderRMA(minusDmList, params.adxPeriod);

  const dxList: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    bars[i].tr = trList[i];
    bars[i].atr = atrValues[i];

    if (i >= params.adxPeriod - 1 && smoothedTr[i] > 0) {
      const pDi = (100 * smoothedPlusDm[i]) / smoothedTr[i];
      const mDi = (100 * smoothedMinusDm[i]) / smoothedTr[i];
      bars[i].plusDi = pDi;
      bars[i].minusDi = mDi;

      const diSum = pDi + mDi;
      const diDiff = Math.abs(pDi - mDi);
      dxList[i] = diSum === 0 ? 0 : (100 * diDiff) / diSum;
    } else {
      bars[i].plusDi = 0;
      bars[i].minusDi = 0;
      dxList[i] = 0;
    }
  }

  // ADX is Wilder RMA of DX
  const adxValues = calculateWilderRMA(dxList, params.adxPeriod);
  for (let i = 0; i < n; i++) {
    bars[i].adx = adxValues[i] || 0;
  }

  // 4. Supertrend calculation (identical to pandas_ta.supertrend)
  for (let i = 0; i < n; i++) {
    const hl2 = (bars[i].high + bars[i].low) / 2;
    const atr = bars[i].atr || 0;
    const mult = params.supertrendMult;

    const basicUpper = hl2 + mult * atr;
    const basicLower = hl2 - mult * atr;
    bars[i].basicUpper = basicUpper;
    bars[i].basicLower = basicLower;

    if (i === 0) {
      bars[i].finalUpper = basicUpper;
      bars[i].finalLower = basicLower;
      bars[i].supertrend = basicLower;
      bars[i].trendDir = 1;
      continue;
    }

    const prevFinalUpper = bars[i - 1].finalUpper ?? basicUpper;
    const prevFinalLower = bars[i - 1].finalLower ?? basicLower;
    const prevClose = bars[i - 1].close;

    // Ratchet upper band down unless price exceeded previous upper band
    const finalUpper =
      basicUpper < prevFinalUpper || prevClose > prevFinalUpper
        ? basicUpper
        : prevFinalUpper;

    // Ratchet lower band up unless price dropped below previous lower band
    const finalLower =
      basicLower > prevFinalLower || prevClose < prevFinalLower
        ? basicLower
        : prevFinalLower;

    bars[i].finalUpper = finalUpper;
    bars[i].finalLower = finalLower;

    const prevTrend = bars[i - 1].trendDir ?? 1;
    let currentTrend: 1 | -1 = prevTrend;
    let st = 0;

    if (prevTrend === 1) {
      if (bars[i].close < finalLower) {
        currentTrend = -1;
        st = finalUpper;
      } else {
        currentTrend = 1;
        st = finalLower;
      }
    } else {
      if (bars[i].close > finalUpper) {
        currentTrend = 1;
        st = finalLower;
      } else {
        currentTrend = -1;
        st = finalUpper;
      }
    }

    bars[i].trendDir = currentTrend;
    bars[i].supertrend = st;
  }

  return bars;
}

/**
 * Generate signal according to user's Python logic:
 * Reading last closed candle (bars[bars.length - 2]):
 *
 * if trend_dir == 1 and adx >= ADX_ENTRY and p_di > m_di: BUY (Long)
 * elif trend_dir == -1 and adx >= ADX_ENTRY and m_di > p_di: SELL (Short)
 * elif adx < ADX_EXIT: CLOSE (Weak momentum)
 * else: WAIT
 */
export function generateSignalFromBars(
  symbol: string,
  bars: CalculatedBar[],
  currentPrice: number,
  change24h: number = 0,
  params: StrategyParams = DEFAULT_PARAMS
): CryptoSignal | null {
  if (!bars || bars.length < 2) return null;

  // Last closed bar is index length - 2 (since the very last bar is currently open and fluctuating)
  const lastClosed = bars[bars.length - 2];
  const close = lastClosed.close;
  const atr = lastClosed.atr || 0;
  const adx = lastClosed.adx || 0;
  const pDi = lastClosed.plusDi || 0;
  const mDi = lastClosed.minusDi || 0;
  const trendDir = lastClosed.trendDir || 1;
  const supertrend = lastClosed.supertrend || 0;

  const [baseAsset, quoteAsset] = symbol.includes('/')
    ? symbol.split('/')
    : [symbol.replace('USDT', ''), 'USDT'];

  const cleanSymbol = `${baseAsset}${quoteAsset}`;

  let action: CryptoSignal['action'] = 'WAIT';
  let titleAr = 'انتظار (مراقبة)';
  let titleEn = 'WAIT (Monitoring)';
  let reasonAr = 'لا تتطابق شروط الدخول مع معايير الاستراتيجية الحالية';
  let reasonEn = 'Market conditions do not meet entry criteria';
  let entryPrice: number | null = null;
  let stopLoss: number | null = null;
  let slPercent: number | null = null;
  let tp1: number | null = null;
  let tp2: number | null = null;
  let tp3: number | null = null;

  const slDelta = params.slMultiplier * atr;

  // 1. Long Entry Condition
  if (trendDir === 1 && adx >= params.adxEntry && pDi > mDi) {
    action = 'BUY';
    titleAr = '🟢 إشارة شراء (Long)';
    titleEn = '🟢 Buy Signal (Long)';
    reasonAr = `ترند صاعد مؤكد (Supertrend) مع قوة زخم عالية (ADX = ${adx.toFixed(1)} ≥ ${params.adxEntry}) وتفوق المشترين (+DI > -DI)`;
    reasonEn = `Confirmed bullish trend with high momentum (ADX = ${adx.toFixed(1)} ≥ ${params.adxEntry}) and +DI > -DI`;
    entryPrice = close;
    stopLoss = close - slDelta;
    slPercent = -((close - stopLoss) / close) * 100;
    tp1 = close + 1.5 * slDelta;
    tp2 = close + 2.5 * slDelta;
    tp3 = close + 4.0 * slDelta;
  }
  // 2. Short Entry Condition
  else if (trendDir === -1 && adx >= params.adxEntry && mDi > pDi) {
    action = 'SELL';
    titleAr = '🔴 إشارة بيع (Short)';
    titleEn = '🔴 Sell Signal (Short)';
    reasonAr = `ترند هابط مؤكد (Supertrend) مع قوة زخم عالية (ADX = ${adx.toFixed(1)} ≥ ${params.adxEntry}) وتفوق البائعين (-DI > +DI)`;
    reasonEn = `Confirmed bearish trend with high momentum (ADX = ${adx.toFixed(1)} ≥ ${params.adxEntry}) and -DI > +DI`;
    entryPrice = close;
    stopLoss = close + slDelta;
    slPercent = -((stopLoss - close) / close) * 100;
    tp1 = close - 1.5 * slDelta;
    tp2 = close - 2.5 * slDelta;
    tp3 = close - 4.0 * slDelta;
  }
  // 3. Early Exit Condition (Momentum Exhaustion)
  else if (adx < params.adxExit) {
    action = 'CLOSE';
    titleAr = '⚠️ إغلاق (ضعف الزخم)';
    titleEn = '⚠️ Close (Weak Momentum)';
    reasonAr = `ضعف ملحوظ في زخم الاتجاه (ADX = ${adx.toFixed(1)} < ${params.adxExit})، يوصى بالخروج أو تأمين الأرباح`;
    reasonEn = `Trend momentum has exhausted (ADX = ${adx.toFixed(1)} < ${params.adxExit}), take profit or tighten stop`;
  } else {
    // In WAIT condition, explain why
    if (adx < params.adxEntry) {
      reasonAr = `قوة الزخم الحالية (ADX = ${adx.toFixed(1)}) أقل من حد الدخول المطلوب (${params.adxEntry})`;
      reasonEn = `Current momentum (ADX = ${adx.toFixed(1)}) is below threshold (${params.adxEntry})`;
    } else if (trendDir === 1 && pDi <= mDi) {
      reasonAr = 'الترند صاعد ولكن المشترين لم يحسموا السيطرة بعد (+DI ≤ -DI)';
      reasonEn = 'Trend is bullish but +DI is not greater than -DI';
    } else if (trendDir === -1 && mDi <= pDi) {
      reasonAr = 'الترند هابط ولكن البائعين لم يحسموا السيطرة بعد (-DI ≤ +DI)';
      reasonEn = 'Trend is bearish but -DI is not greater than +DI';
    }
  }

  const d = new Date(lastClosed.timestamp);
  const formattedTime = d.toLocaleDateString('ar-EG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id: `${cleanSymbol}-${lastClosed.timestamp}-${action}`,
    symbol,
    cleanSymbol,
    baseAsset,
    quoteAsset,
    action,
    titleAr,
    titleEn,
    reasonAr,
    reasonEn,
    closePrice: close,
    currentPrice: currentPrice || close,
    change24h,
    entryPrice: entryPrice ? Number(entryPrice.toFixed(4)) : null,
    stopLoss: stopLoss ? Number(stopLoss.toFixed(4)) : null,
    slPercent: slPercent ? Number(slPercent.toFixed(2)) : null,
    tp1: tp1 ? Number(tp1.toFixed(4)) : null,
    tp2: tp2 ? Number(tp2.toFixed(4)) : null,
    tp3: tp3 ? Number(tp3.toFixed(4)) : null,
    riskReward: 1.5,
    atr: Number(atr.toFixed(4)),
    adx: Number(adx.toFixed(2)),
    plusDi: Number(pDi.toFixed(2)),
    minusDi: Number(mDi.toFixed(2)),
    supertrend: Number(supertrend.toFixed(4)),
    trendDir,
    timestamp: lastClosed.timestamp,
    formattedTime,
  };
}
