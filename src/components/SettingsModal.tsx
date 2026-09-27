import React, { useState } from 'react';
import { StrategyParams } from '../types/crypto';
import { DEFAULT_PARAMS, DEFAULT_SYMBOLS } from '../utils/indicators';
import { playBuyAlert, playSellAlert, playCloseAlert } from '../utils/audioAlerts';
import { X, Sliders, RotateCcw, Volume2, Plus, Trash2, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: StrategyParams;
  onSaveParams: (params: StrategyParams) => void;
  symbols: string[];
  onSaveSymbols: (symbols: string[]) => void;
  lang: 'ar' | 'en';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  params,
  onSaveParams,
  symbols,
  onSaveSymbols,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [localParams, setLocalParams] = useState<StrategyParams>({ ...params });
  const [localSymbols, setLocalSymbols] = useState<string[]>([...symbols]);
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAddSymbol = () => {
    let sym = newSymbolInput.trim().toUpperCase();
    if (!sym) return;
    if (!sym.includes('/')) {
      sym = `${sym}/USDT`;
    }
    if (!localSymbols.includes(sym)) {
      setLocalSymbols([...localSymbols, sym]);
      setNewSymbolInput('');
    }
  };

  const handleRemoveSymbol = (symToRemove: string) => {
    setLocalSymbols(localSymbols.filter((s) => s !== symToRemove));
  };

  const handleResetDefaults = () => {
    setLocalParams({ ...DEFAULT_PARAMS });
    setLocalSymbols([...DEFAULT_SYMBOLS]);
  };

  const handleSave = () => {
    onSaveParams(localParams);
    onSaveSymbols(localSymbols);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const presetSymbols = [
    'DOGE/USDT',
    'SUI/USDT',
    'PEPE/USDT',
    'LINK/USDT',
    'NEAR/USDT',
    'RENDER/USDT',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0e1422] border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#121929] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">
              {isAr ? 'إعدادات الاستراتيجية والتنبيهات' : 'Strategy & Alert Settings'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Section 1: Quantitative Indicators Parameters */}
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
              {isAr ? 'معايير المؤشرات الفنية (Indicators)' : 'Technical Indicator Parameters'}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* ATR Period */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  {isAr ? 'فترة ATR (ATR Period):' : 'ATR Period:'}
                </label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={localParams.atrPeriod}
                  onChange={(e) =>
                    setLocalParams({ ...localParams, atrPeriod: parseInt(e.target.value) || 10 })
                  }
                  className="w-full bg-[#151c2a] border border-slate-700 rounded-lg py-2 px-3 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Supertrend Multiplier */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  {isAr ? 'مضاعف السوبر تريند (Multiplier):' : 'Supertrend Multiplier:'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="10"
                  value={localParams.supertrendMult}
                  onChange={(e) =>
                    setLocalParams({
                      ...localParams,
                      supertrendMult: parseFloat(e.target.value) || 3.0,
                    })
                  }
                  className="w-full bg-[#151c2a] border border-slate-700 rounded-lg py-2 px-3 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* ADX Period */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  {isAr ? 'فترة مؤشر ADX (ADX Period):' : 'ADX Period:'}
                </label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={localParams.adxPeriod}
                  onChange={(e) =>
                    setLocalParams({ ...localParams, adxPeriod: parseInt(e.target.value) || 14 })
                  }
                  className="w-full bg-[#151c2a] border border-slate-700 rounded-lg py-2 px-3 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* SL Multiplier */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  {isAr ? 'مضاعف الوقف (SL Multiplier):' : 'Stop Loss Multiplier (x ATR):'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="5"
                  value={localParams.slMultiplier}
                  onChange={(e) =>
                    setLocalParams({
                      ...localParams,
                      slMultiplier: parseFloat(e.target.value) || 2.0,
                    })
                  }
                  className="w-full bg-[#151c2a] border border-slate-700 rounded-lg py-2 px-3 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* ADX Entry Threshold */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  {isAr ? 'حد دخول الزخم (ADX Entry ≥):' : 'ADX Entry Threshold (≥):'}
                </label>
                <input
                  type="number"
                  step="1"
                  min="15"
                  max="40"
                  value={localParams.adxEntry}
                  onChange={(e) =>
                    setLocalParams({
                      ...localParams,
                      adxEntry: parseFloat(e.target.value) || 23.0,
                    })
                  }
                  className="w-full bg-[#151c2a] border border-slate-700 rounded-lg py-2 px-3 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* ADX Exit Threshold */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  {isAr ? 'حد خروج الزخم (ADX Exit <):' : 'ADX Exit Threshold (<):'}
                </label>
                <input
                  type="number"
                  step="1"
                  min="10"
                  max="25"
                  value={localParams.adxExit}
                  onChange={(e) =>
                    setLocalParams({
                      ...localParams,
                      adxExit: parseFloat(e.target.value) || 18.0,
                    })
                  }
                  className="w-full bg-[#151c2a] border border-slate-700 rounded-lg py-2 px-3 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Audio Alert Testing */}
          <div className="bg-[#121929] p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-2">
              <Volume2 className="w-4 h-4" />
              <span>{isAr ? 'اختبار نغمات التنبيه الصوتي (Sound Test)' : 'Test Audio Synthesizer'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              {isAr
                ? 'نظام التنبيه مبني بمكتبة Web Audio API لتشغيل نغمات فورية دون تحميل ملفات خارجية.'
                : 'Zero-latency synthesized audio chimes built with native Web Audio API.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => playBuyAlert()}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                {isAr ? 'نغمة الشراء 🟢 (Buy Sound)' : 'Buy Chime 🟢'}
              </button>
              <button
                type="button"
                onClick={() => playSellAlert()}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-lg hover:bg-rose-500/30 transition-colors"
              >
                {isAr ? 'نغمة البيع 🔴 (Sell Sound)' : 'Sell Chime 🔴'}
              </button>
              <button
                type="button"
                onClick={() => playCloseAlert()}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                {isAr ? 'نغمة الإغلاق ⚠️ (Close Sound)' : 'Close Chime ⚠️'}
              </button>
            </div>
          </div>

          {/* Section 3: Watched Cryptocurrency Pairs */}
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
              {isAr ? 'العملات المراقبة (Watchlist)' : 'Monitored Crypto Symbols'}
            </div>

            {/* Add symbol input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder={isAr ? 'مثال: DOGE أو SOL/USDT' : 'e.g. DOGE or SUI/USDT'}
                value={newSymbolInput}
                onChange={(e) => setNewSymbolInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                className="flex-1 bg-[#151c2a] border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:border-emerald-500 focus:outline-none uppercase font-mono"
              />
              <button
                type="button"
                onClick={handleAddSymbol}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إضافة' : 'Add'}</span>
              </button>
            </div>

            {/* Quick add popular presets */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 text-xs text-slate-400">
              <span className="text-[11px]">{isAr ? 'إضافة سريعة:' : 'Quick Presets:'}</span>
              {presetSymbols.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    if (!localSymbols.includes(p)) setLocalSymbols([...localSymbols, p]);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
                >
                  +{p.replace('/USDT', '')}
                </button>
              ))}
            </div>

            {/* Current symbols list */}
            <div className="flex flex-wrap gap-2 p-3 bg-[#090d16] rounded-xl border border-slate-800">
              {localSymbols.map((sym) => (
                <div
                  key={sym}
                  className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-[#151c2a] border border-slate-700 text-xs font-mono text-white"
                >
                  <span>{sym}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSymbol(sym)}
                    className="text-slate-400 hover:text-rose-400 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-800 bg-[#121929] flex items-center justify-between sticky bottom-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'استعادة الافتراضيات' : 'Reset Defaults'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-md"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : null}
              <span>{savedSuccess ? (isAr ? 'تم الحفظ!' : 'Saved!') : isAr ? 'حفظ وتطبيق' : 'Save & Apply'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
