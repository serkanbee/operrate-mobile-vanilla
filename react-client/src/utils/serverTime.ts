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
    const serverTz = headers.get('x-server-tz');
    const businessTz = headers.get('x-business-tz');
    const businessTime = headers.get('x-business-time');
    const businessOffMin = parseIntSafe(headers.get('x-business-utc-offset-min'));
    
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
      try { 
        localStorage.setItem('serverDriftMs', String(driftMs));
        if (serverTz) localStorage.setItem('serverTz', serverTz);
        if (businessTz) localStorage.setItem('businessTz', businessTz);
        if (businessTime) localStorage.setItem('businessTime', businessTime);
        if (businessOffMin !== null) localStorage.setItem('businessOffsetMin', String(businessOffMin));
      } catch {}
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

// Get stored timezone information
export function getServerTz(): string {
  try {
    return localStorage.getItem('serverTz') || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getBusinessTz(): string {
  try {
    return localStorage.getItem('businessTz') || getServerTz();
  } catch {
    return 'UTC';
  }
}

// Format date in business timezone (client-side)
export function formatBusinessTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const businessTz = getBusinessTz();
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: businessTz,
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  } catch (e) {
    return 'Invalid Date';
  }
}

// Format date in server timezone (client-side)
export function formatServerTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const serverTz = getServerTz();
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: serverTz,
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  } catch (e) {
    return 'Invalid Date';
  }
}

// Get current time in business timezone
export function nowInBusinessTz(): Date {
  return new Date(Date.now() + driftMs);
}

// Initialize from storage on module load
loadPersistedDrift();
