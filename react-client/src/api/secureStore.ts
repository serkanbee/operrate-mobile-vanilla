// Secure storage abstraction.
// Prefers `capacitor-secure-storage-plugin` (Keychain/Keystore) when available; else uses @capacitor/preferences.
// To enable hardware-backed storage, install the plugin separately and sync native projects.

import { Preferences } from '@capacitor/preferences';
import { log, warn } from '../utils/logger';

let secure: any | null = null;
let secureReady = false;

async function ensureSecure() {
  if (secureReady) return secure;
  secureReady = true;
  // Try dynamic import; safe to ignore if the plugin isn’t installed
  try {
  const pluginId = 'capacitor-secure-storage-plugin';
  // @vite-ignore prevents bundlers from resolving an optional dependency at build time
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const mod: any = await import(/* @vite-ignore */ pluginId);
    secure = (mod && (mod.SecureStoragePlugin || (mod as any).default)) || null;
    log('secureStore: secure plugin loaded:', !!secure);
  } catch (e) { secure = null; warn('secureStore: secure plugin not available, using Preferences'); }
  return secure;
}

export async function setItem(key: string, value: string) {
  await ensureSecure();
  if (secure?.set) {
    try { await secure.set({ key, value }); log('secureStore.set', key, '(secure)'); return; } catch (e) { warn('secureStore.set fallback to Preferences', key); }
  }
  await Preferences.set({ key, value });
  log('secureStore.set', key, '(prefs)');
}

export async function getItem(key: string): Promise<string | null> {
  await ensureSecure();
  if (secure?.get) {
    try { const { value } = await secure.get({ key }); log('secureStore.get', key, '->', value ? 'present' : 'null', '(secure)'); return value ?? null; } catch (e) { warn('secureStore.get fallback to Preferences', key); }
  }
  const { value } = await Preferences.get({ key });
  log('secureStore.get', key, '->', value ? 'present' : 'null', '(prefs)');
  return value ?? null;
}

export async function removeItem(key: string) {
  await ensureSecure();
  if (secure?.remove) {
    try { await secure.remove({ key }); log('secureStore.remove', key, '(secure)'); return; } catch (e) { warn('secureStore.remove fallback to Preferences', key); }
  }
  await Preferences.remove({ key });
  log('secureStore.remove', key, '(prefs)');
}
