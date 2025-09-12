// Minimal fetch-based HTTP client with bearer auth and auto-refresh
// Uses secure storage for tokens (Keychain/Keystore with Preferences fallback).
import { getItem as secureGet, setItem as secureSet, removeItem as secureRemove } from './secureStore';
import { log, warn } from '../utils/logger';
import { setDriftFromHeaders } from '../utils/serverTime';
import { emitForcedLogout } from '../auth/authEvents';

let API_BASE_URL = localStorage.getItem('apiBaseUrl') || import.meta.env.VITE_API_BASE_URL || '';
const REFRESH_PATH = import.meta.env.VITE_REFRESH_PATH || '/api/auth/token/refresh';

// Generate and persist a stable deviceId for session tracking
function genUuid() {
  // RFC4122-ish, good enough for a client id
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
let DEVICE_ID = '';
try {
  DEVICE_ID = localStorage.getItem('deviceId') || '';
  if (!DEVICE_ID) {
    // Fallback if crypto unavailable
    const hasCrypto = typeof crypto !== 'undefined' && (crypto as any).getRandomValues;
    DEVICE_ID = hasCrypto ? genUuid() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem('deviceId', DEVICE_ID);
  }
} catch {}
const DEVICE_NAME = (() => {
  try {
    // Keep it short; server can also infer UA
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS App';
    if (ua.includes('Android')) return 'Android App';
    return 'Mobile App';
  } catch { return 'Mobile App'; }
})();

export function setApiBaseUrl(url: string) {
  API_BASE_URL = url || '';
  if (url) localStorage.setItem('apiBaseUrl', url);
  else localStorage.removeItem('apiBaseUrl');
  log('httpClient: setApiBaseUrl', API_BASE_URL);
}

export function getApiBaseUrl() {
  log('httpClient: getApiBaseUrl ->', API_BASE_URL);
  return API_BASE_URL;
}

export function setApiBaseUrlFromQr(raw: string) {
  try {
    const s = (raw || '').trim();
    if (!/^https?:\/\//i.test(s)) return false;
    const clean = s.replace(/\/$/, '');
    setApiBaseUrl(clean);
    return true;
  } catch {
    return false;
  }
}

type Tokens = { accessToken: string | null; refreshToken: string | null };

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

const tokenStore = {
  async get(): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      secureGet(ACCESS_KEY),
      secureGet(REFRESH_KEY)
    ]);
    return { accessToken, refreshToken };
  },
  async set(tokens: Partial<Tokens>): Promise<void> {
    const ops: Promise<any>[] = [];
    if (tokens.accessToken !== undefined && tokens.accessToken !== null) {
      ops.push(secureSet(ACCESS_KEY, tokens.accessToken));
    }
    if (tokens.refreshToken !== undefined && tokens.refreshToken !== null) {
      ops.push(secureSet(REFRESH_KEY, tokens.refreshToken));
    }
    await Promise.all(ops);
  },
  async clear(): Promise<void> {
    await Promise.all([secureRemove(ACCESS_KEY), secureRemove(REFRESH_KEY)]);
  }
};

async function refreshAccessToken(): Promise<boolean> {
  if (!REFRESH_PATH || REFRESH_PATH === 'disabled') return false;
  const { refreshToken } = await tokenStore.get();
  if (!refreshToken) return false;
  const path = REFRESH_PATH.startsWith('/') ? REFRESH_PATH : `/${REFRESH_PATH}`;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  setDriftFromHeaders(res.headers);
  if (!res.ok) return false;
  const data = await res.json();
  if (data?.success && data.accessToken) {
    await tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken || refreshToken });
    log('httpClient: refreshAccessToken success; new access set; refresh returned?', !!data.refreshToken);
    return true;
  }
  warn('httpClient: refreshAccessToken failed data', data);
  return false;
}

export async function httpFetch(input: string, init: RequestInit = {}, retry = true): Promise<Response> {
  if (!input.startsWith('http') && !API_BASE_URL) {
    const msg = 'API base URL is not set. Go to Settings and set API Base URL.';
    warn('httpFetch: blocked relative request because base URL is empty', input);
    throw new Error(msg);
  }
  const url = input.startsWith('http') ? input : `${API_BASE_URL}${input}`;
  const { accessToken } = await tokenStore.get();
  const headers: HeadersInit = {
    'x-capacitor': '1',
  'x-device-id': DEVICE_ID || '',
  'x-device-name': DEVICE_NAME,
    ...(init.headers || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
  const res = await fetch(url, { ...init, headers });
  log('httpFetch', { url, status: res.status });
  if (res.status === 403) {
    // Try to detect blocked account
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.clone().json();
        if (data?.code === 'ACCOUNT_BLOCKED') {
          emitForcedLogout({ reason: 'blocked', code: data.code, message: data.message || 'Your account has been blocked.' });
        }
      }
    } catch {}
    return res;
  }
  if (res.status !== 401 || !retry) return res;
  // try refresh once
  const ok = await refreshAccessToken();
  if (!ok) return res; // let caller handle 401
  const { accessToken: newAccess } = await tokenStore.get();
  const retryHeaders: HeadersInit = { 'x-capacitor': '1', 'x-device-id': DEVICE_ID || '', 'x-device-name': DEVICE_NAME, ...(init.headers || {}), ...(newAccess ? { Authorization: `Bearer ${newAccess}` } : {}) };
  log('httpFetch retry after refresh', { url, hadNewAccess: !!newAccess });
  const retryRes = await fetch(url, { ...init, headers: retryHeaders });
  if (retryRes.status === 401) {
    emitForcedLogout({ reason: 'unauthorized', message: 'Your session has expired. Please sign in again.' });
  }
  return retryRes;
}

export const tokens = tokenStore;
