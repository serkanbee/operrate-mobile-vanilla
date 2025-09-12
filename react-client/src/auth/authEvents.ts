export type ForcedLogoutEvent = {
  reason: 'unauthorized' | 'blocked' | 'concurrent' | 'session_revoked' | string;
  code?: string;
  message?: string;
};

type Listener = (e: ForcedLogoutEvent) => void;
const listeners: Listener[] = [];

export function subscribeForcedLogout(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function emitForcedLogout(e: ForcedLogoutEvent) {
  for (const fn of [...listeners]) {
    try { fn(e); } catch {}
  }
}
