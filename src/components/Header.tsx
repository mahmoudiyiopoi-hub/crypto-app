import React from 'react';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Sliders,
  Code2,
  Smartphone,
  Monitor,
  Globe,
  Radio,
} from 'lucide-react';
import brandImg from '../assets/images/crypto_signals_brand_1790461350834.jpg';

interface HeaderProps {
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  refreshSeconds: number;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  pushEnabled: boolean;
  onTogglePush: () => void;
  onOpenSettings: () => void;
  onOpenFastApi: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  isMobileSimulator: boolean;
  onToggleMobileSimulator: () => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timeframe,
  onTimeframeChange,
  onRefresh,
  isRefreshing,
  refreshSeconds,
  autoRefresh,
  onToggleAutoRefresh,
  soundEnabled,
  onToggleSound,
  pushEnabled,
  onTogglePush,
  onOpenSettings,
  onOpenFastApi,
  onOpenNotifications,
  unreadNotificationsCount,
  isMobileSimulator,
  onToggleMobileSimulator,
  lang,
  onToggleLang,
}) => {
  const isAr = lang === 'ar';
  const timeframes = ['15m', '1h', '4h', '1d'];

  return (
    <header className="sticky top-0 z-40 bg-[#0d121c]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single text element / Clean Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <img
              src={brandImg}
              alt="CryptoSignals Pro"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Zero-broken image policy fallback
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                CryptoSignals Pro
                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  {isAr ? 'مباشر' : 'LIVE'}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isAr ? 'نظام إشارات Supertrend + ADX' : 'Supertrend + ADX Engine'}
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation & Functional Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Timeframe Segmented Control */}
          <div className="flex items-center bg-[#151c2a] p-1 rounded-lg border border-slate-800">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  timeframe === tf
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Refresh Timer & Manual Trigger */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title={isAr ? 'تحديث الإشارات الآن' : 'Refresh signals now'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#151c2a] hover:bg-[#1c2638] rounded-lg border border-slate-800 transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`}
            />
            {autoRefresh && (
              <span className="font-mono tabular-nums text-[11px] text-slate-400 hidden sm:inline">
                {refreshSeconds}s
              </span>
            )}
          </button>
        </div>

        {/* Zone 3: Primary Action Suite */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notifications History Bell */}
          <button
            onClick={onOpenNotifications}
            title={isAr ? 'سجل الإشعارات' : 'Notification History'}
            className="relative p-2 text-slate-300 hover:text-white bg-[#151c2a] hover:bg-[#1c2638] rounded-lg border border-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Sound Alert Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? (isAr ? 'كتم التنبيهات الصوتية' : 'Mute sound alerts') : (isAr ? 'تفعيل التنبيهات الصوتية' : 'Enable sound alerts')}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-[#151c2a] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Browser Push Notifications Toggle */}
          <button
            onClick={onTogglePush}
            title={pushEnabled ? (isAr ? 'إشعارات المتصفح مفعلة' : 'Push notifications active') : (isAr ? 'تفعيل إشعارات المتصفح' : 'Enable push notifications')}
            className={`p-2 rounded-lg border transition-colors hidden sm:flex ${
              pushEnabled
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-[#151c2a] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {pushEnabled ? <Bell className="w-4 h-4 text-cyan-400" /> : <BellOff className="w-4 h-4" />}
          </button>

          {/* FastAPI Backend Code View Modal */}
          <button
            onClick={onOpenFastApi}
            title={isAr ? 'كود FastAPI Backend' : 'FastAPI Backend Code'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg shadow-sm transition-all"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">FastAPI</span>
          </button>

          {/* Settings Config */}
          <button
            onClick={onOpenSettings}
            title={isAr ? 'إعدادات الاستراتيجية' : 'Strategy Settings'}
            className="p-2 text-slate-300 hover:text-white bg-[#151c2a] hover:bg-[#1c2638] rounded-lg border border-slate-800 transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Mobile Simulator View Toggle */}
          <button
            onClick={onToggleMobileSimulator}
            title={isMobileSimulator ? (isAr ? 'عرض الشاشة الكاملة' : 'Full Screen View') : (isAr ? 'معاينة تطبيق الموبايل' : 'Mobile App View')}
            className={`p-2 rounded-lg border transition-colors hidden lg:flex ${
              isMobileSimulator
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-[#151c2a] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {isMobileSimulator ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </button>

          {/* Language Toggle (AR / EN) */}
          <button
            onClick={onToggleLang}
            className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-[#151c2a] hover:bg-[#1c2638] rounded-lg border border-slate-800 transition-colors"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>
      </div>
    </header>
  );
};
