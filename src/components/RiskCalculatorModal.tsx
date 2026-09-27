import React, { useState } from 'react';
import { CryptoSignal } from '../types/crypto';
import { X, Calculator, ShieldCheck, DollarSign, Target, Percent } from 'lucide-react';

interface RiskCalculatorModalProps {
  signal: CryptoSignal | null;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  signal,
  onClose,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [accountBalance, setAccountBalance] = useState<number>(2000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [leverage, setLeverage] = useState<number>(5);

  if (!signal || !signal.entryPrice || !signal.stopLoss) return null;

  const entry = signal.entryPrice;
  const sl = signal.stopLoss;
  const tp1 = signal.tp1 || entry;
  const tp2 = signal.tp2 || entry;
  const tp3 = signal.tp3 || entry;

  const slDistancePct = Math.abs((entry - sl) / entry);
  const maxDollarRisk = accountBalance * (riskPercent / 100);

  // Position Size in USD = Max Risk / SL Distance %
  const positionSizeUsd = slDistancePct > 0 ? maxDollarRisk / slDistancePct : 0;
  const positionSizeCoins = entry > 0 ? positionSizeUsd / entry : 0;
  const marginRequired = leverage > 0 ? positionSizeUsd / leverage : positionSizeUsd;

  // Potential Profits
  const profitTp1 = Math.abs((tp1 - entry) / entry) * positionSizeUsd;
  const profitTp2 = Math.abs((tp2 - entry) / entry) * positionSizeUsd;
  const profitTp3 = Math.abs((tp3 - entry) / entry) * positionSizeUsd;

  const formatUsd = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0e1422] border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#121929]">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">
              {isAr ? `حاسبة إدارة المخاطر: ${signal.symbol}` : `Risk & Position Sizing: ${signal.symbol}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Signal Snapshot Row */}
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80 grid grid-cols-3 gap-2 text-xs font-mono tabular-nums text-center">
            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'الدخول' : 'Entry'}</span>
              <span className="text-white font-bold">${formatUsd(entry)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'وقف الخسارة' : 'Stop Loss'}</span>
              <span className="text-rose-400 font-bold">${formatUsd(sl)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'مسافة الوقف' : 'SL Distance'}</span>
              <span className="text-amber-400 font-bold">{(slDistancePct * 100).toFixed(2)}%</span>
            </div>
          </div>

          {/* User Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Account Balance */}
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                {isAr ? 'رصيد المحفظة ($)' : 'Account Balance ($)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  step="100"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full bg-[#151c2a] border border-slate-700 rounded-lg py-2 px-3 text-sm text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Risk Percentage */}
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                {isAr ? 'نسبة المخاطرة (%)' : 'Risk % per Trade'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.5"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Math.max(0.1, parseFloat(e.target.value) || 0))}
                  className="w-full bg-[#151c2a] border border-slate-700 rounded-lg py-2 px-3 text-sm text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Leverage */}
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                {isAr ? 'الرافعة المالية' : 'Leverage'}
              </label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value) || 1)}
                className="w-full bg-[#151c2a] border border-slate-700 rounded-lg py-2 px-3 text-sm text-white font-mono focus:border-amber-400 focus:outline-none"
              >
                <option value={1}>1x (Spot / Spot Margin)</option>
                <option value={2}>2x</option>
                <option value={5}>5x (Recommended)</option>
                <option value={10}>10x</option>
                <option value={20}>20x</option>
              </select>
            </div>
          </div>

          {/* Sizing Calculations Card */}
          <div className="bg-[#121929] p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {isAr ? 'أقصى خسارة مسموح بها عند ضرب الوقف:' : 'Max Loss if SL is Hit:'}
              </span>
              <span className="font-mono tabular-nums font-bold text-rose-400 text-sm">
                -${formatUsd(maxDollarRisk)} ({riskPercent}%)
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400">
                {isAr ? 'حجم المركز المطلوب (Position Size):' : 'Calculated Position Size:'}
              </span>
              <div className="text-right">
                <div className="font-mono tabular-nums font-bold text-white text-sm">
                  ${formatUsd(positionSizeUsd)}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  ≈ {positionSizeCoins.toFixed(4)} {signal.baseAsset}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {isAr ? 'الهامش المحجوز المطلوب (Margin):' : 'Margin Required from Balance:'}
              </span>
              <span className="font-mono tabular-nums font-bold text-emerald-400 text-sm">
                ${formatUsd(marginRequired)}
              </span>
            </div>
          </div>

          {/* Projected Target Returns */}
          <div>
            <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              {isAr ? 'الأرباح المتوقعة عند الأهداف:' : 'Expected Return at Targets:'}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono tabular-nums">
              <div className="bg-[#090d16] p-2.5 rounded-lg border border-emerald-500/20">
                <div className="text-[11px] text-emerald-400 font-semibold">TP1 (1.5R)</div>
                <div className="text-sm font-bold text-white mt-1">+${formatUsd(profitTp1)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  +{((profitTp1 / accountBalance) * 100).toFixed(1)}% {isAr ? 'نمو' : 'gain'}
                </div>
              </div>

              <div className="bg-[#090d16] p-2.5 rounded-lg border border-emerald-500/20">
                <div className="text-[11px] text-emerald-400 font-semibold">TP2 (2.5R)</div>
                <div className="text-sm font-bold text-white mt-1">+${formatUsd(profitTp2)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  +{((profitTp2 / accountBalance) * 100).toFixed(1)}% {isAr ? 'نمو' : 'gain'}
                </div>
              </div>

              <div className="bg-[#090d16] p-2.5 rounded-lg border border-emerald-500/20">
                <div className="text-[11px] text-emerald-400 font-semibold">TP3 (4.0R)</div>
                <div className="text-sm font-bold text-white mt-1">+${formatUsd(profitTp3)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  +{((profitTp3 / accountBalance) * 100).toFixed(1)}% {isAr ? 'نمو' : 'gain'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#121929] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            {isAr ? 'تم وفهمت المخاطرة' : 'Done & Got It'}
          </button>
        </div>
      </div>
    </div>
  );
};
