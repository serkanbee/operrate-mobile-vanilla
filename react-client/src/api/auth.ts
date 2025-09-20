import { httpFetch, tokens } from './httpClient';
import { setDriftFromHeaders } from '../utils/serverTime';
import { log, warn } from '../utils/logger';
// Device plugin is optional at build time; load dynamically if present

export async function login(email: string, password: string) {
  // Gather device info (best-effort)
  let deviceInfo: any = {};
  // Derive a simple device name similar to httpClient
  const deviceName = (() => {
    try {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS App';
      if (ua.includes('Android')) return 'Android App';
      return 'Mobile App';
    } catch { return 'Mobile App'; }
  })();
  try {
    // @vite-ignore keeps it optional for bundlers
    const mod: any = await import(/* @vite-ignore */ '@capacitor/device');
    const Device = mod?.Device || mod?.default;
    if (Device?.getInfo) {
      deviceInfo = await Device.getInfo();
    }
  } catch {}
  // Token system: use canonical versionless token endpoint
  let res: Response;
  try {
    res = await httpFetch('/api/auth/token/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'x-no-forced-logout': '1' },
      body: JSON.stringify({
        email,
        password,
        deviceId: (localStorage.getItem('deviceId') || null),
        deviceName,
        device: {
          platform: deviceInfo?.platform || undefined,
          operatingSystem: deviceInfo?.operatingSystem || undefined,
          osVersion: deviceInfo?.osVersion || undefined,
          model: deviceInfo?.model || undefined,
          manufacturer: deviceInfo?.manufacturer || undefined,
          isVirtual: deviceInfo?.isVirtual ?? undefined,
          uuid: deviceInfo?.uuid || undefined,
          appVersion: deviceInfo?.appVersion || undefined,
          appBuild: deviceInfo?.appBuild || undefined,
        }
      })
    }, false);
  } catch (err: any) {
    const em = String(err?.message || err || 'Login failed');
    // Surface clearer guidance for base URL or network issues
    if (em.includes('API base URL is not set')) throw new Error(em);
    throw new Error('Cannot reach the server. Check API Base URL in Settings and your connection.');
  }
  if (!res.ok) {
    const status = res.status;
    const ct = res.headers.get('content-type') || '';
    // Handle 403 first: prefer to surface blocked-account inline
    if (status === 403) {
      // Try JSON (don't swallow thrown errors)
      if (ct.includes('application/json')) {
        const data = await res.clone().json().catch(() => undefined as any);
        if (data) {
          const msg = data?.message || 'Your account has been blocked. Please contact your administrator.';
          if (data?.code === 'ACCOUNT_BLOCKED' || /blocked/i.test(String(msg))) {
            const err: any = new Error(msg);
            err.code = 'ACCOUNT_BLOCKED';
            throw err;
          }
          throw new Error(msg);
        }
      }
      // Fallback: text/html
      try {
        const t = await res.clone().text();
        if (/account\s+has\s+been\s+blocked/i.test(t)) {
          const err: any = new Error('Your account has been blocked. Please contact your administrator.');
          err.code = 'ACCOUNT_BLOCKED';
          throw err;
        }
      } catch {}
      throw new Error('Login failed (403)');
    }

    // Non-403 errors
    if (ct.includes('application/json')) {
      try {
        const data = await res.clone().json();
        throw new Error(data?.message || `Login failed (${status})`);
      } catch {}
    }
    throw new Error(`Login failed (${status})`);
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('Unexpected response (not JSON). Check API Base URL in Settings or dev proxy config.');
  }
  setDriftFromHeaders(res.headers);
  const data = await res.json();
  // Token flow: access + refresh
  if (data?.success && data.accessToken && data.refreshToken) {
    await tokens.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  log('auth.login ok; tokens set');
    return data;
  }
  warn('auth.login response unexpected', data);
  throw new Error(data?.message || 'Invalid login response from server');
}

export async function logout() {
  try {
    const { refreshToken } = await tokens.get();
    if (refreshToken) {
      await httpFetch('/api/auth/token/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      }, false);
      log('auth.logout posted to server (token/logout)');
    }
  } catch (e) {
    warn('auth.logout server call failed', e);
  }
  await tokens.clear();
  // Ensure any pending post-login toast (e.g., from password reset) cannot leak after logout
  try { localStorage.removeItem('postLoginToast'); } catch {}
  log('auth.logout cleared tokens');
}
