// Tracks and computes server time drift based on headers sent by the API
// Headers used: x-server-time-utc (ISO), x-server-utc-offset-min (number)

let driftMs = 0; // serverNow = Date.now() + driftMs

function parseIntSafe(v: string | null): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function setDriftFromHeaders(headers: Headers | null | undefined) {
  try {
    if (!headers) return;
    const iso = headers.get('x-server-time-utc');
    const offMin = parseIntSafe(headers.get('x-server-utc-offset-min'));
    let serverMs: number | null = null;
    if (iso) {
      const t = Date.parse(iso);
      if (!Number.isNaN(t)) serverMs = t;
    }
    // Fallback: compute from local time and offset if provided
    if (serverMs === null && offMin !== null) {
      // Estimate server time by applying server's UTC offset to current UTC time
      const local = new Date();
      const localUtcMs = local.getTime() + local.getTimezoneOffset() * 60_000;
      serverMs = localUtcMs + offMin * 60_000;
    }
    if (serverMs !== null) {
      driftMs = serverMs - Date.now();
      try { localStorage.setItem('serverDriftMs', String(driftMs)); } catch {}
    }
  } catch {}
}

export function loadPersistedDrift() {
  try {
    const saved = localStorage.getItem('serverDriftMs');
    if (saved) {
      const n = parseInt(saved, 10);
      if (Number.isFinite(n)) driftMs = n;
    }
  } catch {}
}

export function getDriftMs() { return driftMs; }
export function serverNow(): Date { return new Date(Date.now() + driftMs); }

// Initialize from storage on module load
loadPersistedDrift();
