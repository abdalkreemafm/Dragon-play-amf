export interface TelegramWebAppUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramHapticFeedback {
  impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred?: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged?: () => void;
}

interface TelegramWebAppInstance {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramWebAppUser;
    start_param?: string;
  };
  platform?: string;
  colorScheme?: 'light' | 'dark';
  viewportHeight?: number;
  viewportStableHeight?: number;
  isExpanded?: boolean;
  ready?: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
  onEvent?: (eventType: string, callback: () => void) => void;
  offEvent?: (eventType: string, callback: () => void) => void;
  HapticFeedback?: TelegramHapticFeedback;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebAppInstance;
    };
  }
}

function getTgApp(): TelegramWebAppInstance | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export function initTelegramWebApp(): () => void {
  const tg = getTgApp();

  const updateViewportCss = () => {
    const height = tg?.viewportStableHeight || window.innerHeight;
    if (height > 0) {
      document.documentElement.style.setProperty('--tg-viewport-stable-height', `${height}px`);
    }
  };

  updateViewportCss();

  if (tg) {
    try {
      tg.ready?.();
      tg.expand?.();
      tg.disableVerticalSwipes?.();
      tg.setHeaderColor?.('#0b0d14');
      tg.setBackgroundColor?.('#0b0d14');
    } catch {
      // Ignore partial WebApp SDK implementations
    }
    tg.onEvent?.('viewportChanged', updateViewportCss);
  }

  window.addEventListener('resize', updateViewportCss, { passive: true });

  return () => {
    tg?.offEvent?.('viewportChanged', updateViewportCss);
    window.removeEventListener('resize', updateViewportCss);
  };
}

export function getTelegramUser(): { id?: number; displayName: string; isPremium: boolean } | null {
  const user = getTgApp()?.initDataUnsafe?.user;
  if (!user) return null;
  const rawName = user.username || [user.first_name, user.last_name].filter(Boolean).join('_');
  const sanitized = rawName.replace(/[^\w\u0600-\u06FF.-]/g, '').slice(0, 18);
  return {
    id: user.id,
    displayName: sanitized || `TAMER_${String(user.id ?? '').slice(-4) || 'TG'}`,
    isPremium: Boolean(user.is_premium),
  };
}

export function triggerTelegramHaptic(
  kind: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
): void {
  const haptics = getTgApp()?.HapticFeedback;
  if (!haptics) return;
  try {
    if (kind === 'success' || kind === 'warning' || kind === 'error') {
      haptics.notificationOccurred?.(kind);
    } else {
      haptics.impactOccurred?.(kind);
    }
  } catch {
    // Ignore unsupported platform haptics
  }
}

export function shareViaTelegram(text: string, url: string): boolean {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const tg = getTgApp();
  if (tg?.openTelegramLink) {
    try {
      tg.openTelegramLink(shareUrl);
      return true;
    } catch {
      // Fall through to navigator share / clipboard
    }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    navigator.share({ title: 'DRAGON × DMD', text, url }).catch(() => {});
    return true;
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(`${text}\n${url}`).catch(() => {});
    return true;
  }
  return false;
}

export function openExternalLink(url: string): void {
  const tg = getTgApp();
  if (url.startsWith('https://t.me/') && tg?.openTelegramLink) {
    tg.openTelegramLink(url);
    return;
  }
  if (tg?.openLink) {
    tg.openLink(url);
    return;
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).catch(() => {});
  }
}
