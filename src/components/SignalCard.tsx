import React, { useState } from 'react';
import { CryptoSignal } from '../types/crypto';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  LineChart,
  Calculator,
  Copy,
  Check,
  ShieldAlert,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface SignalCardProps {
  signal: CryptoSignal;
  lang: 'ar' | 'en';
  onOpenChart: (signal: CryptoSignal) => void;
  onOpenCalculator: (signal: CryptoSignal) => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  lang,
  onOpenChart,
  onOpenCalculator,
}) => {
  const [copied, setCopied] = useState(false);
  const isAr = lang === 'ar';

  const isBuy = signal.action === 'BUY';
  const isSell = signal.action === 'SELL';
  const isClose = signal.action === 'CLOSE';
  const isWait = signal.action === 'WAIT';

  const formatPrice = (val?: number | null) => {
    if (val === undefined || val === null) return '-';
    if (val >= 1000) {
      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (val >= 1) {
      return val.toFixed(4);
    } else {
      return val.toFixed(6);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = isAr
      ? `📈 إشارة تداول ${signal.symbol}\n` +
        `الحالة: ${signal.titleAr}\n` +
        `سعر الدخول: $${formatPrice(signal.entryPrice)}\n` +
        `وقف الخسارة (SL): $${formatPrice(signal.stopLoss)} (${signal.slPercent}%)\n` +
        `الهدف الأول (TP1): $${formatPrice(signal.tp1)}\n` +
        `الهدف الثاني (TP2): $${formatPrice(signal.tp2)}\n` +
        `الهدف الثالث (TP3): $${formatPrice(signal.tp3)}\n` +
        `قوة الزخم (ADX): ${signal.adx} | الاتجاه: ${signal.trendDir === 1 ? 'صاعد ⬆️' : 'هابط ⬇️'}\n` +
        `الوقت: ${signal.formattedTime}`
      : `📈 Signal Alert ${signal.symbol}\n` +
        `Status: ${signal.titleEn}\n` +
        `Entry: $${formatPrice(signal.entryPrice)}\n` +
        `Stop Loss (SL): $${formatPrice(signal.stopLoss)} (${signal.slPercent}%)\n` +
        `TP 1: $${formatPrice(signal.tp1)}\n` +
        `TP 2: $${formatPrice(signal.tp2)}\n` +
        `TP 3: $${formatPrice(signal.tp3)}\n` +
        `ADX: ${signal.adx} | Trend: ${signal.trendDir === 1 ? 'Bullish ⬆️' : 'Bearish ⬇️'}\n` +
        `Time: ${signal.formattedTime}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Card border and glow colors according to action
  let borderClass = 'border-slate-800 bg-[#0f1523] hover:border-slate-700';
  let badgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
  let badgeIcon = <Clock className="w-3.5 h-3.5" />;

  if (isBuy) {
    borderClass =
      'border-emerald-500/50 bg-gradient-to-b from-[#0e1d20] to-[#0d1624] shadow-[0_0_20px_rgba(16,185,129,0.08)]';
    badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold';
    badgeIcon = <TrendingUp className="w-3.5 h-3.5" />;
  } else if (isSell) {
    borderClass =
      'border-rose-500/50 bg-gradient-to-b from-[#221016] to-[#0d1624] shadow-[0_0_20px_rgba(244,63,94,0.08)]';
    badgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold';
    badgeIcon = <TrendingDown className="w-3.5 h-3.5" />;
  } else if (isClose) {
    borderClass =
      'border-amber-500/40 bg-gradient-to-b from-[#1f1910] to-[#0d1624] shadow-[0_0_20px_rgba(245,158,11,0.06)]';
    badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold';
    badgeIcon = <AlertTriangle className="w-3.5 h-3.5" />;
  }

  // ADX progress percentage (max 50)
  const adxPercent = Math.min(100, (signal.adx / 50) * 100);

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 relative overflow-hidden group ${borderClass}`}
    >
      {/* Top Row: Coin Identity & Real-Time Price */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center font-bold text-sm text-white border border-slate-700/60 shadow-inner">
              {signal.baseAsset}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-wide">
                  {signal.symbol}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  Binance
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                {signal.formattedTime}
              </div>
            </div>
          </div>

          {/* Current Live Price & 24h change */}
          <div className="text-right">
            <div className="font-mono tabular-nums font-bold text-base sm:text-lg text-white">
              ${formatPrice(signal.currentPrice)}
            </div>
            <div
              className={`text-xs font-mono tabular-nums flex items-center justify-end gap-0.5 ${
                signal.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {signal.change24h >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {signal.change24h >= 0 ? '+' : ''}
              {signal.change24h.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Action Status Banner */}
        <div className="mb-4">
          <div
            className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${badgeClass}`}
          >
            <div className="flex items-center gap-2">
              {badgeIcon}
              <span>{isAr ? signal.titleAr : signal.titleEn}</span>
            </div>

            {/* Quick trend badge */}
            <span className="text-[11px] font-mono opacity-90">
              {signal.trendDir === 1
                ? isAr
                  ? 'ترند صاعد ⬆️'
                  : 'Bullish ⬆️'
                : isAr
                  ? 'ترند هابط ⬇️'
                  : 'Bearish ⬇️'}
            </span>
          </div>
        </div>

        {/* Trade Parameters (If BUY or SELL) */}
        {(isBuy || isSell) && (
          <div className="bg-[#090d16]/70 rounded-xl p-3 border border-slate-800/80 mb-4 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">
                  {isAr ? 'سعر الدخول:' : 'Entry Price:'}
                </span>
                <span className="font-mono tabular-nums font-bold text-white text-sm">
                  ${formatPrice(signal.entryPrice)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  {isAr ? 'وقف الخسارة (SL):' : 'Stop Loss (SL):'}
                </span>
                <span className="font-mono tabular-nums font-bold text-rose-400 text-sm">
                  ${formatPrice(signal.stopLoss)}{' '}
                  <span className="text-[10px] opacity-80">({signal.slPercent}%)</span>
                </span>
              </div>
            </div>

            {/* Take Profit Targets */}
            <div className="pt-2 border-t border-slate-800/60">
              <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-400" />
                {isAr ? 'أهداف جني الأرباح (TP):' : 'Take Profit Targets:'}
              </div>
              <div className="grid grid-cols-3 gap-1.5 font-mono tabular-nums text-center">
                <div className="bg-[#121929] p-1.5 rounded-lg border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400 font-semibold">TP1 (1.5R)</div>
                  <div className="text-xs text-white font-bold">${formatPrice(signal.tp1)}</div>
                </div>
                <div className="bg-[#121929] p-1.5 rounded-lg border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400 font-semibold">TP2 (2.5R)</div>
                  <div className="text-xs text-white font-bold">${formatPrice(signal.tp2)}</div>
                </div>
                <div className="bg-[#121929] p-1.5 rounded-lg border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400 font-semibold">TP3 (4.0R)</div>
                  <div className="text-xs text-white font-bold">${formatPrice(signal.tp3)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Technical Indicators Sub-Row: ADX & DMI */}
        <div className="bg-[#090d16]/50 rounded-xl p-3 border border-slate-800/60 mb-4 space-y-2">
          {/* ADX Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400">
                {isAr ? 'قوة الزخم (ADX 14):' : 'Trend Momentum (ADX 14):'}
              </span>
              <span
                className={`font-mono tabular-nums font-bold ${
                  signal.adx >= 23
                    ? 'text-emerald-400'
                    : signal.adx < 18
                      ? 'text-rose-400'
                      : 'text-amber-400'
                }`}
              >
                {signal.adx}
                {signal.adx >= 23 && (
                  <span className="text-[10px] text-emerald-400 ml-1 font-normal">
                    {isAr ? '(قوي ≥ 23)' : '(Strong ≥ 23)'}
                  </span>
                )}
                {signal.adx < 18 && (
                  <span className="text-[10px] text-rose-400 ml-1 font-normal">
                    {isAr ? '(ضعيف < 18)' : '(Weak < 18)'}
                  </span>
                )}
              </span>
            </div>
            {/* Progress Bar with 23 Marker */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
              {/* Marker at 23/50 = 46% */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                style={{ left: '46%' }}
                title="Entry Threshold: 23"
              />
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  signal.adx >= 23
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                    : signal.adx < 18
                      ? 'bg-rose-500'
                      : 'bg-amber-400'
                }`}
                style={{ width: `${adxPercent}%` }}
              />
            </div>
          </div>

          {/* DMI Indicators: +DI vs -DI and Supertrend */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">DMI (+DI / -DI):</span>
              <span className="font-mono tabular-nums text-slate-300">
                <span className="text-emerald-400">{signal.plusDi}</span> /{' '}
                <span className="text-rose-400">{signal.minusDi}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Supertrend:</span>
              <span className="font-mono tabular-nums text-slate-300">
                ${formatPrice(signal.supertrend)}
              </span>
            </div>
          </div>
        </div>

        {/* Reason / Strategy Rationale Box */}
        <p className="text-[11px] leading-relaxed text-slate-400 mb-4 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
          {isAr ? signal.reasonAr : signal.reasonEn}
        </p>
      </div>

      {/* Action Footer Suite */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
        {/* Open Candlestick Chart */}
        <button
          onClick={() => onOpenChart(signal)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-200 hover:text-white bg-[#151c2a] hover:bg-[#1f293d] rounded-xl border border-slate-700/80 transition-all shadow-sm"
        >
          <LineChart className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isAr ? 'الشارت الفني' : 'Chart'}</span>
        </button>

        {/* Open Position / Risk Calculator */}
        {(isBuy || isSell) && (
          <button
            onClick={() => onOpenCalculator(signal)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-200 hover:text-white bg-[#151c2a] hover:bg-[#1f293d] rounded-xl border border-slate-700/80 transition-all shadow-sm"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'حاسبة اللوت' : 'Calculator'}</span>
          </button>
        )}

        {/* Copy Signal to Clipboard */}
        <button
          onClick={handleCopy}
          title={isAr ? 'نسخ التوصية بالكامل' : 'Copy signal details'}
          className={`p-2 rounded-xl border transition-all ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-[#151c2a] hover:bg-[#1f293d] text-slate-400 hover:text-slate-200 border-slate-700/80'
          }`}
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
