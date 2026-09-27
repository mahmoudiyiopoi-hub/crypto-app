import { CryptoSignal } from '../types/crypto';

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  return false;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function sendBrowserPushNotification(signal: CryptoSignal, lang: 'ar' | 'en' = 'ar'): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const isAr = lang === 'ar';
  let title = '';
  let body = '';

  if (signal.action === 'BUY') {
    title = isAr ? `🟢 توصية شراء: ${signal.symbol}` : `🟢 BUY Signal: ${signal.symbol}`;
    body = isAr
      ? `سعر الدخول: $${signal.entryPrice} | وقف الخسارة: $${signal.stopLoss} | هدف 1: $${signal.tp1} (ADX: ${signal.adx})`
      : `Entry: $${signal.entryPrice} | SL: $${signal.stopLoss} | TP1: $${signal.tp1} (ADX: ${signal.adx})`;
  } else if (signal.action === 'SELL') {
    title = isAr ? `🔴 توصية بيع: ${signal.symbol}` : `🔴 SELL Signal: ${signal.symbol}`;
    body = isAr
      ? `سعر الدخول: $${signal.entryPrice} | وقف الخسارة: $${signal.stopLoss} | هدف 1: $${signal.tp1} (ADX: ${signal.adx})`
      : `Entry: $${signal.entryPrice} | SL: $${signal.stopLoss} | TP1: $${signal.tp1} (ADX: ${signal.adx})`;
  } else if (signal.action === 'CLOSE') {
    title = isAr ? `⚠️ إشارة إغلاق: ${signal.symbol}` : `⚠️ CLOSE Signal: ${signal.symbol}`;
    body = isAr
      ? `ضعف قوة الزخم (ADX=${signal.adx} < 18). يرجى تأمين الأرباح أو إغلاق المركز.`
      : `Momentum exhaustion (ADX=${signal.adx} < 18). Lock profits or close position.`;
  } else {
    return;
  }

  try {
    const notif = new Notification(title, {
      body,
      tag: `${signal.symbol}-${signal.action}-${signal.timestamp}`,
      badge: '/vite.svg',
      icon: '/vite.svg',
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (err) {
    console.error('Failed to dispatch notification', err);
  }
}
