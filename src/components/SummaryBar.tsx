import React from 'react';
import { CryptoSignal } from '../types/crypto';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Activity } from 'lucide-react';

interface SummaryBarProps {
  signals: CryptoSignal[];
  lang: 'ar' | 'en';
  timeframe: string;
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ signals, lang, timeframe }) => {
  const isAr = lang === 'ar';

  const longCount = signals.filter((s) => s.action === 'BUY').length;
  const shortCount = signals.filter((s) => s.action === 'SELL').length;
  const closeCount = signals.filter((s) => s.action === 'CLOSE').length;
  const waitCount = signals.filter((s) => s.action === 'WAIT').length;

  const avgAdx =
    signals.length > 0
      ? (signals.reduce((acc, s) => acc + (s.adx || 0), 0) / signals.length).toFixed(1)
      : '0.0';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 mb-6">
      {/* Long Signals */}
      <div className="bg-[#101726] border border-emerald-500/30 rounded-xl p-3 sm:p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
          <span>{isAr ? 'صفقات شراء (Long)' : 'Long Signals'}</span>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-400">
          {longCount}
        </div>
        <div className="text-[11px] text-emerald-500/80 mt-0.5">
          {isAr ? 'Supertrend صاعد + ADX ≥ 23' : 'Bullish ST + ADX ≥ 23'}
        </div>
      </div>

      {/* Short Signals */}
      <div className="bg-[#101726] border border-rose-500/30 rounded-xl p-3 sm:p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
          <span>{isAr ? 'صفقات بيع (Short)' : 'Short Signals'}</span>
          <TrendingDown className="w-4 h-4 text-rose-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-rose-400">
          {shortCount}
        </div>
        <div className="text-[11px] text-rose-500/80 mt-0.5">
          {isAr ? 'Supertrend هابط + ADX ≥ 23' : 'Bearish ST + ADX ≥ 23'}
        </div>
      </div>

      {/* Early Exit / Momentum Warnings */}
      <div className="bg-[#101726] border border-amber-500/30 rounded-xl p-3 sm:p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
          <span>{isAr ? 'تحذير إغلاق' : 'Close Alerts'}</span>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-400">
          {closeCount}
        </div>
        <div className="text-[11px] text-amber-500/80 mt-0.5">
          {isAr ? 'ضعف زخم (ADX < 18)' : 'Weak momentum ADX < 18'}
        </div>
      </div>

      {/* Waiting / Watching */}
      <div className="bg-[#101726] border border-slate-800 rounded-xl p-3 sm:p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
          <span>{isAr ? 'قيد المراقبة' : 'Monitoring'}</span>
          <Clock className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-300">
          {waitCount}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {isAr ? 'في انتظار اكتمال الشروط' : 'Waiting for criteria'}
        </div>
      </div>

      {/* Momentum Pulse / Avg ADX */}
      <div className="col-span-2 sm:col-span-1 bg-[#101726] border border-slate-800 rounded-xl p-3 sm:p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
          <span>{isAr ? 'متوسط الزخم' : 'Average ADX'}</span>
          <Activity className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-cyan-400">
          {avgAdx}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {Number(avgAdx) >= 23
            ? isAr
              ? 'سوق ذو اتجاه قوي 🔥'
              : 'Strong Trending Market'
            : isAr
              ? 'سوق متذبذب / هادئ'
              : 'Ranging / Low Momentum'}
        </div>
      </div>
    </div>
  );
};
