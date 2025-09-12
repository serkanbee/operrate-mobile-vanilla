import { httpFetch, tokens } from './httpClient';
import { setDriftFromHeaders } from '../utils/serverTime';
import { log, warn } from '../utils/logger';
// Device plugin is optional at build time; load dynamically if present

export async function login(email: string, password: string) {
  // Gather device info (best-effort)
  let deviceInfo: any = {};
  try {
    // @vite-ignore keeps it optional for bundlers
    const mod: any = await import(/* @vite-ignore */ '@capacitor/device');
    const Device = mod?.Device || mod?.default;
    if (Device?.getInfo) {
      deviceInfo = await Device.getInfo();
    }
  } catch {}
  // v2-only: use versionless token endpoint
  const res = await httpFetch('/api/auth/token/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      deviceId: (localStorage.getItem('deviceId') || null),
      deviceName: 'Mobile App',
      device: {
        platform: deviceInfo?.platform || undefined,
        operatingSystem: deviceInfo?.operatingSystem || undefined,
        osVersion: deviceInfo?.osVersion || undefined,
        model: deviceInfo?.model || undefined,
        manufacturer: deviceInfo?.manufacturer || undefined,
        isVirtual: deviceInfo?.isVirtual ?? undefined
      }
    })
  }, false);
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('Unexpected response (not JSON). Check API Base URL in Settings or dev proxy config.');
  }
  setDriftFromHeaders(res.headers);
  const data = await res.json();
  // v2 flow only: access + refresh
  if (data?.success && data.accessToken && data.refreshToken) {
    await tokens.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    log('auth.login ok (v2); tokens set');
    return data;
  }
  warn('auth.login response unexpected', data);
  throw new Error(data?.message || 'Invalid login response from server');
}

export async function logout() {
  const { refreshToken } = await tokens.get();
  try {
    // v2-only logout: revoke refresh session server-side
    await httpFetch('/api/auth/token/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(refreshToken ? { 'x-refresh-token': refreshToken } : {})
      },
      body: JSON.stringify({ refreshToken })
    }, false);
    log('auth.logout posted to server (token/logout)');
  } catch (e) {
    warn('auth.logout server call failed', e);
  }
  await tokens.clear();
  log('auth.logout cleared tokens');
}
