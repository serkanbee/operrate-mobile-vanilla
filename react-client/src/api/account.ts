import { httpFetch } from './httpClient';
import { log } from '../utils/logger';

export async function requestPasswordReset(email: string) {
  const res = await httpFetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }, false);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Failed (${res.status})`);
  log('account.requestPasswordReset ok');
  return data;
}

export async function verifyEmail(email: string, code: string) {
  const res = await httpFetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  }, false);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Failed (${res.status})`);
  log('account.verifyEmail ok');
  return data;
}

export async function resendVerification(email: string) {
  const res = await httpFetch('/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }, false);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Failed (${res.status})`);
  log('account.resendVerification ok');
  return data;
}

export async function resetPassword(email: string, code: string, newPassword: string) {
  const res = await httpFetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword })
  }, false);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Failed (${res.status})`);
  log('account.resetPassword ok');
  return data;
}

export async function verifyReset(email: string, code: string) {
  const res = await httpFetch('/api/auth/verify-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  }, false);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Failed (${res.status})`);
  log('account.verifyReset ok');
  return data;
}
