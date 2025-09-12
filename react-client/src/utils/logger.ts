const envFlag = (import.meta as any)?.env?.VITE_DEBUG_AUTH;

function isEnabled() {
  try {
    const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('debugAuth') : null;
    return ls === '1' || ls === 'true' || envFlag === '1' || envFlag === 'true';
  } catch { return !!envFlag; }
}

export function log(...args: any[]) {
  if (!isEnabled()) return;
  // eslint-disable-next-line no-console
  console.log('[auth]', ...args);
}

export function warn(...args: any[]) {
  if (!isEnabled()) return;
  // eslint-disable-next-line no-console
  console.warn('[auth]', ...args);
}

export function error(...args: any[]) {
  if (!isEnabled()) return;
  // eslint-disable-next-line no-console
  console.error('[auth]', ...args);
}
