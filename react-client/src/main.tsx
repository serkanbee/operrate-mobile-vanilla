import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { Capacitor } from '@capacitor/core';
import { log } from './utils/logger';
import { getApiBaseUrl, setApiBaseUrl } from './api/httpClient';

// Native-first diagnostics: enable auth debug logs automatically on device/simulator,
// and make sure API base URL is initialized early.
(() => {
  try {
    if (Capacitor.isNativePlatform()) {
      localStorage.setItem('debugAuth', '1');
      // If a Vite env base URL exists and no explicit override was stored, set it.
      const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
      const hasStored = !!localStorage.getItem('apiBaseUrl');
      if (envUrl && !hasStored) setApiBaseUrl(envUrl);
    }
  } catch {}
})();

// Log basic boot info and probe secure storage once at startup for native consoles
(async () => {
  try {
    const platform = Capacitor.getPlatform();
    log('boot: platform', platform, 'native?', Capacitor.isNativePlatform());
    log('boot: API base URL', getApiBaseUrl());
    // Trigger secure store probe (logs which backend is used)
    try {
      const { getItem } = await import('./api/secureStore');
      await getItem('__probe__');
    } catch {}
  } catch {}
})();

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);