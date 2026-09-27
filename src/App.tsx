import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CryptoSignal, NotificationItem, StrategyParams } from './types/crypto';
import { DEFAULT_PARAMS, DEFAULT_SYMBOLS, calculateIndicators, generateSignalFromBars } from './utils/indicators';
import { fetchOHLCV, fetch24hrTicker } from './utils/binanceApi';
import { playBuyAlert, playSellAlert, playCloseAlert } from './utils/audioAlerts';
import {
  requestNotificationPermission,
  sendBrowserPushNotification,
  getNotificationPermission,
} from './utils/pushNotifications';
import { Header } from './components/Header';
import { SummaryBar } from './components/SummaryBar';
import { SignalCard } from './components/SignalCard';
import { CandleChartModal } from './components/CandleChartModal';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { SettingsModal } from './components/SettingsModal';
import { FastApiCodeModal } from './components/FastApiCodeModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import {
  Search,
  Filter,
  RefreshCw,
  Bell,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  // Localization: Arabic (default as requested) & English
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const isAr = lang === 'ar';

  // Strategy Configuration & Symbols
  const [params, setParams] = useState<StrategyParams>(() => {
    const saved = localStorage.getItem('crypto_strategy_params');
    return saved ? JSON.parse(saved) : DEFAULT_PARAMS;
  });

  const [symbols, setSymbols] = useState<string[]>(() => {
    const saved = localStorage.getItem('crypto_watched_symbols');
    return saved ? JSON.parse(saved) : DEFAULT_SYMBOLS;
  });

  const [timeframe, setTimeframe] = useState<string>('4h');

  // Signals State
  const [signals, setSignals] = useState<CryptoSignal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Auto-refresh countdown (60 seconds)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(60);

  // Notification & Audio Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);

  // Filters & Search
  const [actionFilter, setActionFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'CLOSE' | 'WAIT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'adx' | 'change'>('default');

  // Modals & Views
  const [selectedChartSignal, setSelectedChartSignal] = useState<CryptoSignal | null>(null);
  const [selectedCalcSignal, setSelectedCalcSignal] = useState<CryptoSignal | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFastApiOpen, setIsFastApiOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isMobileSimulator, setIsMobileSimulator] = useState<boolean>(false);

  // Ref to track prior signals for alert triggering
  const prevSignalsRef = useRef<Map<string, string>>(new Map());
  const isFirstLoadRef = useRef<boolean>(true);

  // Push permission initialization
  useEffect(() => {
    setPushPermission(getNotificationPermission());
  }, []);

  const handleGrantPush = async () => {
    const granted = await requestNotificationPermission();
    setPushPermission(getNotificationPermission());
    if (granted) {
      setPushEnabled(true);
    }
  };

  // Fetch Signals Function
  const fetchAllSignals = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);

      try {
        // Try backend Express route first, fallback to client-side Binance API
        let calculatedSignals: CryptoSignal[] = [];

        try {
          const res = await fetch(
            `/api/signals?timeframe=${timeframe}&symbols=${encodeURIComponent(symbols.join(','))}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.signals && Array.isArray(data.signals)) {
              calculatedSignals = data.signals;
            }
          }
        } catch {
          // Backend offline or direct client fallback
        }

        // Fallback: Compute directly on client from Binance Futures/Spot API
        if (calculatedSignals.length === 0) {
          const promises = symbols.map(async (symbol) => {
            try {
              const [bars, ticker] = await Promise.all([
                fetchOHLCV(symbol, timeframe, 100),
                fetch24hrTicker(symbol),
              ]);
              const calculated = calculateIndicators(bars, params);
              return generateSignalFromBars(
                symbol,
                calculated,
                ticker.lastPrice,
                ticker.priceChangePercent,
                params
              );
            } catch (err) {
              console.error(`Error processing ${symbol}:`, err);
              return null;
            }
          });

          const results = await Promise.all(promises);
          calculatedSignals = results.filter((s): s is CryptoSignal => s !== null);
        }

        // Process Notifications and Audio Alerts on state changes
        if (!isFirstLoadRef.current) {
          calculatedSignals.forEach((sig) => {
            const prevAction = prevSignalsRef.current.get(sig.symbol);

            // Trigger when entering BUY, SELL, or CLOSE from another state
            if (prevAction && prevAction !== sig.action && sig.action !== 'WAIT') {
              const message =
                sig.action === 'BUY'
                  ? isAr
                    ? `إشارة شراء مؤكدة على ${sig.symbol} عند $${sig.entryPrice}`
                    : `Confirmed BUY signal on ${sig.symbol} at $${sig.entryPrice}`
                  : sig.action === 'SELL'
                    ? isAr
                      ? `إشارة بيع مؤكدة على ${sig.symbol} عند $${sig.entryPrice}`
                      : `Confirmed SELL signal on ${sig.symbol} at $${sig.entryPrice}`
                    : isAr
                      ? `تحذير إغلاق وضعف زخم على ${sig.symbol} (ADX=${sig.adx})`
                      : `Momentum exhaustion exit on ${sig.symbol} (ADX=${sig.adx})`;

              const newNotif: NotificationItem = {
                id: `${sig.id}-${Date.now()}`,
                timestamp: Date.now(),
                symbol: sig.symbol,
                action: sig.action,
                price: sig.currentPrice,
                sl: sig.stopLoss || undefined,
                tp1: sig.tp1 || undefined,
                adx: sig.adx,
                message,
                read: false,
              };

              setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
              setActiveToast(newNotif);

              // Sound Chime
              if (soundEnabled) {
                if (sig.action === 'BUY') playBuyAlert();
                else if (sig.action === 'SELL') playSellAlert();
                else if (sig.action === 'CLOSE') playCloseAlert();
              }

              // Browser Push
              if (pushEnabled) {
                sendBrowserPushNotification(sig, lang);
              }
            }
          });
        } else {
          isFirstLoadRef.current = false;
        }

        // Update tracking ref
        calculatedSignals.forEach((sig) => {
          prevSignalsRef.current.set(sig.symbol, sig.action);
        });

        setSignals(calculatedSignals);
        setLastUpdated(new Date());
        setRefreshCountdown(60);
      } catch (err) {
        console.error('Failed to fetch signals:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [symbols, timeframe, params, soundEnabled, pushEnabled, lang, isAr]
  );

  // Initial load and symbol/timeframe changes
  useEffect(() => {
    fetchAllSignals();
  }, [fetchAllSignals]);

  // Periodic Auto-refresh Timer
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchAllSignals();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllSignals]);

  // Dismiss toast after 5s
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Save Settings handlers
  const handleSaveParams = (newParams: StrategyParams) => {
    setParams(newParams);
    localStorage.setItem('crypto_strategy_params', JSON.stringify(newParams));
  };

  const handleSaveSymbols = (newSymbols: string[]) => {
    setSymbols(newSymbols);
    localStorage.setItem('crypto_watched_symbols', JSON.stringify(newSymbols));
  };

  // Filter & Search Logic
  const filteredSignals = useMemo(() => {
    let result = [...signals];

    // Filter by action
    if (actionFilter !== 'ALL') {
      result = result.filter((s) => s.action === actionFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.baseAsset.toLowerCase().includes(q) ||
          s.cleanSymbol.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'adx') {
      result.sort((a, b) => b.adx - a.adx);
    } else if (sortBy === 'change') {
      result.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    }

    return result;
  }, [signals, actionFilter, searchQuery, sortBy]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30"
    >
      {/* Top Header Contract */}
      <Header
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        onRefresh={() => fetchAllSignals(true)}
        isRefreshing={isRefreshing}
        refreshSeconds={refreshCountdown}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        pushEnabled={pushEnabled}
        onTogglePush={handleGrantPush}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFastApi={() => setIsFastApiOpen(true)}
        onOpenNotifications={() => {
          setIsNotificationsOpen(true);
          // Mark all as read
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        unreadNotificationsCount={unreadCount}
        isMobileSimulator={isMobileSimulator}
        onToggleMobileSimulator={() => setIsMobileSimulator(!isMobileSimulator)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      />

      {/* Main Container: Full Screen or Mobile Simulator */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {isMobileSimulator ? (
          /* Mobile App Simulator Container */
          <div className="flex flex-col items-center justify-center my-4">
            <div className="text-center mb-4">
              <span className="text-xs font-mono px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full inline-flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                {isAr ? 'معاينة تجربة تطبيق الموبايل (iOS / Android)' : 'Mobile App Simulation (iOS / Android)'}
              </span>
            </div>

            {/* Mobile Device Frame */}
            <div className="w-[390px] h-[810px] bg-[#0c101a] border-[8px] border-slate-700/80 rounded-[48px] shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-2" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              </div>

              {/* Status Bar */}
              <div className="pt-2 px-6 pb-1 flex items-center justify-between text-[11px] font-mono text-slate-400 z-20">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Mobile App Header */}
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-[#111726]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    CS
                  </div>
                  <span className="font-bold text-sm text-white">CryptoSignals</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                    {timeframe}
                  </span>
                  <button
                    onClick={() => fetchAllSignals(true)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Mobile App Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Mobile Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-[#151c2a] rounded-xl overflow-x-auto text-[11px]">
                  {(['ALL', 'BUY', 'SELL', 'CLOSE'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActionFilter(filter)}
                      className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                        actionFilter === filter
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {filter === 'ALL'
                        ? isAr
                          ? 'الكل'
                          : 'All'
                        : filter === 'BUY'
                          ? isAr
                            ? 'شراء 🟢'
                            : 'Buy 🟢'
                          : filter === 'SELL'
                            ? isAr
                              ? 'بيع 🔴'
                              : 'Sell 🔴'
                            : isAr
                              ? 'إغلاق ⚠️'
                              : 'Close ⚠️'}
                    </button>
                  ))}
                </div>

                {/* Mobile Cards List */}
                {isLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                    <span className="text-xs">{isAr ? 'جاري تحميل الإشارات...' : 'Loading signals...'}</span>
                  </div>
                ) : filteredSignals.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    {isAr ? 'لا توجد إشارات مطابقة' : 'No matching signals'}
                  </div>
                ) : (
                  filteredSignals.map((signal) => (
                    <SignalCard
                      key={signal.id}
                      signal={signal}
                      lang={lang}
                      onOpenChart={(sig) => setSelectedChartSignal(sig)}
                      onOpenCalculator={(sig) => setSelectedCalcSignal(sig)}
                    />
                  ))
                )}
              </div>

              {/* Mobile Bottom Navigation Bar */}
              <div className="py-2.5 px-6 bg-[#0c101a] border-t border-slate-800 flex items-center justify-between text-slate-400 text-[10px]">
                <div className="flex flex-col items-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>{isAr ? 'الإشارات' : 'Signals'}</span>
                </div>
                <div
                  className="flex flex-col items-center hover:text-white cursor-pointer"
                  onClick={() => setIsNotificationsOpen(true)}
                >
                  <Bell className="w-4 h-4" />
                  <span>{isAr ? 'التنبيهات' : 'Alerts'}</span>
                </div>
                <div
                  className="flex flex-col items-center hover:text-white cursor-pointer"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Filter className="w-4 h-4" />
                  <span>{isAr ? 'الإعدادات' : 'Config'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Full Desktop / Tablet Dashboard */
          <>
            {/* Quantitative Summary Metric Bar */}
            <SummaryBar signals={signals} lang={lang} timeframe={timeframe} />

            {/* Filter, Search & Controls Strip */}
            <div className="bg-[#0f1523] border border-slate-800/80 rounded-2xl p-3 sm:p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
              {/* Segmented Filter Buttons */}
              <div className="flex items-center gap-1.5 p-1 bg-[#151c2a] rounded-xl overflow-x-auto w-full md:w-auto">
                <button
                  onClick={() => setActionFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    actionFilter === 'ALL'
                      ? 'bg-slate-700/80 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isAr ? 'جميع العملات' : 'All Pairs'} ({signals.length})
                </button>

                <button
                  onClick={() => setActionFilter('BUY')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    actionFilter === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{isAr ? 'شراء (Long)' : 'Buy'}</span>
                  <span className="font-mono text-[11px]">
                    ({signals.filter((s) => s.action === 'BUY').length})
                  </span>
                </button>

                <button
                  onClick={() => setActionFilter('SELL')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    actionFilter === 'SELL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{isAr ? 'بيع (Short)' : 'Sell'}</span>
                  <span className="font-mono text-[11px]">
                    ({signals.filter((s) => s.action === 'SELL').length})
                  </span>
                </button>

                <button
                  onClick={() => setActionFilter('CLOSE')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    actionFilter === 'CLOSE'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-amber-400'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إغلاق (خروج)' : 'Close'}</span>
                  <span className="font-mono text-[11px]">
                    ({signals.filter((s) => s.action === 'CLOSE').length})
                  </span>
                </button>

                <button
                  onClick={() => setActionFilter('WAIT')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    actionFilter === 'WAIT'
                      ? 'bg-slate-700/80 text-slate-200'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isAr ? 'انتظار' : 'Wait'}</span>
                  <span className="font-mono text-[11px]">
                    ({signals.filter((s) => s.action === 'WAIT').length})
                  </span>
                </button>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={isAr ? 'بحث بالرمز (مثل BTC)...' : 'Search symbol...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#151c2a] border border-slate-700/80 rounded-xl py-1.5 pr-8 pl-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#151c2a] border border-slate-700/80 rounded-xl py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="default">{isAr ? 'الترتيب: الافتراضي' : 'Sort: Default'}</option>
                  <option value="adx">{isAr ? 'الأعلى زخماً (ADX)' : 'Highest ADX'}</option>
                  <option value="change">{isAr ? 'الأعلى تغيراً (%)' : 'Biggest 24h Move'}</option>
                </select>
              </div>
            </div>

            {/* Signals Grid View */}
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                <p className="text-sm font-medium text-slate-300">
                  {isAr
                    ? 'جاري جلب بيانات العقود الآجلة وحساب مؤشرات Supertrend و ADX...'
                    : 'Fetching Binance Futures klines & evaluating Supertrend + ADX...'}
                </p>
                <p className="text-xs text-slate-500">
                  {isAr ? 'يتم قراءة آخر شمعة مغلقة لضمان دقة الإشارة' : 'Analyzing last closed candle for non-repainting signals'}
                </p>
              </div>
            ) : filteredSignals.length === 0 ? (
              <div className="py-20 text-center bg-[#0f1523] border border-slate-800 rounded-2xl p-8">
                <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <h4 className="text-base font-semibold text-white mb-1">
                  {isAr ? 'لا توجد عملات مطابقة للتصفية المحددة' : 'No matching signals found'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  {isAr
                    ? 'جرب اختيار تصنيف آخر مثل "جميع العملات" أو تعديل معايير البحث'
                    : 'Try selecting "All Pairs" or adjusting your search criteria'}
                </p>
                <button
                  onClick={() => {
                    setActionFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  {isAr ? 'إعادة ضبط التصفية' : 'Reset Filters'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredSignals.map((signal) => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    lang={lang}
                    onOpenChart={(sig) => setSelectedChartSignal(sig)}
                    onOpenCalculator={(sig) => setSelectedCalcSignal(sig)}
                  />
                ))}
              </div>
            )}

            {/* Explanation & Strategy Documentation Banner */}
            <div className="mt-10 p-5 bg-[#0e1422] border border-slate-800/80 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm text-white">
                  {isAr ? 'شرح طريقة عمل الاستراتيجية الرياضية' : 'Strategy Mechanics & Quantitative Rules'}
                </h4>
              </div>
              <p className="text-xs leading-relaxed text-slate-400 mb-3">
                {isAr
                  ? 'يقرأ النظام بيانات الشموع المكتملة على منصة بينانس العامة. يحدد الاتجاه العام باستخدام مؤشر Supertrend (فترة 10 ومضاعف 3.0) ويتأكد من قوة الاندفاع والزخم عبر مؤشر ADX > 23 مع تقاطع خطوط الاتجاه (+DI > -DI للشراء أو -DI > +DI للبيع). عند تطابق الشروط يحسب النظام سعر الدخول والوقف بدقة (2 x ATR).'
                  : 'The system reads completed candlestick bars directly from Binance Futures public endpoints. Direction is determined by the Supertrend ratchet algorithm (period 10, multiplier 3.0). Momentum is validated via ADX >= 23 with directional dominance (+DI > -DI for Long, -DI > +DI for Short). Stop loss is automatically anchored at 2.0 x ATR.'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {isAr ? 'شراء (Long): Supertrend صاعد + ADX ≥ 23 + DI+ > DI-' : 'Long: Bullish ST + ADX ≥ 23 + DI+ > DI-'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  {isAr ? 'بيع (Short): Supertrend هابط + ADX ≥ 23 + DI- > DI+' : 'Short: Bearish ST + ADX ≥ 23 + DI- > DI+'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {isAr ? 'إغلاق (Close): ADX < 18 (استنزاف الزخم)' : 'Exit: ADX < 18 (Exhaustion)'}
                </span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Floating In-App Toast Notification */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#121929] border border-emerald-500/50 rounded-2xl p-4 shadow-2xl animate-bounce-subtle flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{activeToast.symbol}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  {activeToast.action}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeToast.message}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Candlestick & Technical Chart Modal */}
      {selectedChartSignal && (
        <CandleChartModal
          signal={selectedChartSignal}
          onClose={() => setSelectedChartSignal(null)}
          lang={lang}
        />
      )}

      {/* Position Sizing & Risk Management Modal */}
      {selectedCalcSignal && (
        <RiskCalculatorModal
          signal={selectedCalcSignal}
          onClose={() => setSelectedCalcSignal(null)}
          lang={lang}
        />
      )}

      {/* Strategy Parameters & Watchlist Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        params={params}
        onSaveParams={handleSaveParams}
        symbols={symbols}
        onSaveSymbols={handleSaveSymbols}
        lang={lang}
      />

      {/* FastAPI Python Backend Code Viewer Modal */}
      <FastApiCodeModal
        isOpen={isFastApiOpen}
        onClose={() => setIsFastApiOpen(false)}
        lang={lang}
      />

      {/* Alerts & Notifications History Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onClear={() => setNotifications([])}
        onGrantPush={handleGrantPush}
        pushPermission={pushPermission}
        lang={lang}
      />
    </div>
  );
}
