import React from 'react';
import { NotificationItem } from '../types/crypto';
import { playBuyAlert, playSellAlert, playCloseAlert } from '../utils/audioAlerts';
import { X, Bell, Trash2, Volume2, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onClear: () => void;
  onGrantPush: () => void;
  pushPermission: NotificationPermission | 'unsupported';
  lang: 'ar' | 'en';
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onClear,
  onGrantPush,
  pushPermission,
  lang,
}) => {
  const isAr = lang === 'ar';

  if (!isOpen) return null;

  const playChime = (action: string) => {
    if (action === 'BUY') playBuyAlert();
    else if (action === 'SELL') playSellAlert();
    else if (action === 'CLOSE') playCloseAlert();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0e1422] border-l border-slate-700/80 w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#121929]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">
              {isAr ? 'سجل الإشعارات والتنبيهات' : 'Signal Alerts & Notifications'}
            </h3>
            {notifications.length > 0 && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                {notifications.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Push Notification Banner if not granted */}
        {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
          <div className="p-3 bg-cyan-950/40 border-b border-cyan-800/40 flex items-center justify-between text-xs">
            <div className="text-cyan-300 pr-2">
              {isAr
                ? 'فعل إشعارات المتصفح لتصلك الإشارات حتى عندما تكون خارج التطبيق'
                : 'Enable browser push notifications for background alerts'}
            </div>
            <button
              onClick={onGrantPush}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold shrink-0 transition-colors"
            >
              {isAr ? 'تفعيل' : 'Enable'}
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 p-6">
              <Bell className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-400">
                {isAr ? 'لا توجد إشعارات جديدة حالياً' : 'No signal alerts recorded yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {isAr
                  ? 'يقوم النظام بفحص السوق باستمرار وتوليد إشعار صوتي وفوري بمجرد ظهور إشارة شراء أو بيع'
                  : 'The quantitative scanner continuously scans and records signals as soon as criteria match'}
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const isBuy = item.action === 'BUY';
              const isSell = item.action === 'SELL';
              const isClose = item.action === 'CLOSE';

              let border = 'border-slate-800 bg-[#121929]';
              let badgeColor = 'text-slate-400 bg-slate-800';
              let icon = <Bell className="w-4 h-4" />;

              if (isBuy) {
                border = 'border-emerald-500/40 bg-emerald-950/20';
                badgeColor = 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30';
                icon = <TrendingUp className="w-4 h-4 text-emerald-400" />;
              } else if (isSell) {
                border = 'border-rose-500/40 bg-rose-950/20';
                badgeColor = 'text-rose-400 bg-rose-500/20 border border-rose-500/30';
                icon = <TrendingDown className="w-4 h-4 text-rose-400" />;
              } else if (isClose) {
                border = 'border-amber-500/40 bg-amber-950/20';
                badgeColor = 'text-amber-400 bg-amber-500/20 border border-amber-500/30';
                icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
              }

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${border} flex flex-col gap-2`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${badgeColor}`}>
                        {icon}
                        {item.action}
                      </span>
                      <span className="font-bold text-white text-sm">{item.symbol}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button
                        onClick={() => playChime(item.action)}
                        title={isAr ? 'إعادة تشغيل الصوت' : 'Play audio alert'}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>

                  {item.price > 0 && (
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums pt-1 border-t border-slate-800/60 text-slate-400">
                      <span>السعر: ${item.price.toFixed(4)}</span>
                      {item.sl && <span>الوقف: ${item.sl.toFixed(4)}</span>}
                      <span>ADX: {item.adx}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Clear All */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-[#121929] flex justify-between items-center">
            <span className="text-xs text-slate-500">
              {notifications.length} {isAr ? 'تنبيه مسجل' : 'alerts recorded'}
            </span>
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'مسح السجل' : 'Clear All'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
