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

export function isInsideTelegramWebApp(): boolean {
  const tg = getTgApp();
  return Boolean(tg && (tg.initData || tg.initDataUnsafe?.user));
}

export function getTelegramRawInitData(): string {
  return getTgApp()?.initData ?? '';
}

export function getTelegramStartParam(): string {
  return getTgApp()?.initDataUnsafe?.start_param ?? '';
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

export function getTelegramUser(): {
  id?: number;
  username?: string;
  displayName: string;
  isPremium: boolean;
} | null {
  const user = getTgApp()?.initDataUnsafe?.user;
  if (!user) return null;
  const rawName = user.username || [user.first_name, user.last_name].filter(Boolean).join('_');
  const sanitized = rawName.replace(/[^\w\u0600-\u06FF.-]/g, '').slice(0, 18);
  return {
    id: user.id,
    username: user.username?.replace(/[^\w.-]/g, '').slice(0, 32),
    displayName: sanitized || `TAMER_${String(user.id ?? '').slice(-4) || 'TG'}`,
    isPremium: Boolean(user.is_premium),
  };
}

const PREVIEW_TG_ID_KEY = 'dragon_preview_tg_id';

export function getOrCreatePreviewTelegramId(): number {
  if (typeof window === 'undefined') return 7771899;
  try {
    const raw = window.localStorage.getItem(PREVIEW_TG_ID_KEY);
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      return parsed;
    }
    const generated = 81000000 + Math.floor(Math.random() * 18999999);
    window.localStorage.setItem(PREVIEW_TG_ID_KEY, String(generated));
    return generated;
  } catch {
    return 7771899;
  }
}

export async function verifyTelegramSession(): Promise<{
  verified: boolean;
  reason?: string;
  user?: TelegramWebAppUser;
  telegramIdHash?: string;
  publicId?: string;
}> {
  const initData = getTelegramRawInitData();
  const claimedId = getTgApp()?.initDataUnsafe?.user?.id || getOrCreatePreviewTelegramId();
  try {
    const res = await fetch('/api/telegram/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: initData || 'tamer_session_init', claimedTelegramId: claimedId }),
    });
    if (!res.ok) {
      return { verified: false, reason: `HTTP_${res.status}` };
    }
    const data = (await res.json()) as {
      verified?: boolean;
      reason?: string;
      sessionToken?: string;
      publicId?: string;
      telegramIdHash?: string;
      user?: TelegramWebAppUser;
    };
    if (data.verified && data.sessionToken) {
      const { setVerifiedSessionAuth } = await import('./cryptoVault');
      setVerifiedSessionAuth({
        token: data.sessionToken,
        publicId: data.publicId,
        telegramIdHash: data.telegramIdHash,
      });
    }
    return {
      verified: Boolean(data.verified),
      reason: data.reason,
      user: data.user,
      telegramIdHash: data.telegramIdHash,
      publicId: data.publicId,
    };
  } catch {
    return { verified: false, reason: 'NETWORK_ERROR' };
  }
}

let telegramHapticsEnabled = true;

export function setTelegramHapticsEnabled(enabled: boolean): void {
  telegramHapticsEnabled = enabled;
}

export function triggerTelegramHaptic(
  kind: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
): void {
  if (!telegramHapticsEnabled) return;
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
    navigator.share({ title: 'DRAGON × AMF', text, url }).catch(() => {});
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
