import React, { useEffect, useMemo, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonItem, IonInput, IonButton, IonText, IonIcon, IonToast } from '@ionic/react';
import { settingsOutline, eye, eyeOff } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './Login.css';
import { resetPassword as apiResetPassword } from '../api/account';
import { log, warn } from '../utils/logger';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorOpen, setErrorOpen] = useState(false);

  useEffect(() => {
    try {
      setEmail(sessionStorage.getItem('recoverEmail') || '');
      setCode(sessionStorage.getItem('recoverCode') || '');
    } catch {}
  }, []);

  // Password strength calculation similar to the web EJS implementation
  const { strengthPct, strengthText, strengthColor } = useMemo(() => {
    const pwd = newPassword || '';
    const checks = [
      { rx: /.{8,}/, msg: 'at least 8 characters' },
      { rx: /[a-z]/, msg: 'lowercase letter' },
      { rx: /[A-Z]/, msg: 'uppercase letter' },
      { rx: /\d/, msg: 'number' },
      { rx: /[@$!%*?&]/, msg: 'special character' }
    ];
    let score = 0;
    const missing: string[] = [];
    checks.forEach(({ rx, msg }) => { if (rx.test(pwd)) score++; else missing.push(msg); });
    const pct = (score / 5) * 100;
    let color = 'var(--opweb-text-muted)';
    if (pwd.length === 0) {
      color = 'var(--opweb-text-muted)';
    } else if (score <= 2) {
      color = '#e53935'; // danger
    } else if (score === 3) {
      color = '#ffc409'; // warning
    } else if (score === 4) {
      color = '#3dc2ff'; // info
    } else {
      color = '#2dd36f'; // success
    }
    const txt = pwd.length === 0
      ? 'Enter a password'
      : (score === 5 ? 'All requirements met' : `Missing: ${missing.join(', ')}`);
    return { strengthPct: pct, strengthText: txt, strengthColor: color };
  }, [newPassword]);

  const passwordsMatch = useMemo(() => (
    confirmPassword.length > 0 ? newPassword === confirmPassword : null
  ), [newPassword, confirmPassword]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorOpen(false);
    setErrorMsg('');
    if (!email || !code || !newPassword || !confirmPassword) { setErrorMsg('Fill all fields'); setErrorOpen(true); return; }
    if (newPassword !== confirmPassword) { setErrorMsg('Passwords do not match'); setErrorOpen(true); return; }
    setSubmitting(true);
    try {
      await apiResetPassword(email, code, newPassword);
      log('ResetPassword: success');
      history.replace('/login');
    } catch (err: any) {
      const msg = err?.message || 'Reset failed';
      warn('ResetPassword: failed', msg);
      setErrorMsg(msg);
      setErrorOpen(true);
    } finally { setSubmitting(false); }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
          <IonButtons slot="start"><IonBackButton defaultHref="/verify-code" text="" /></IonButtons>
          <IonButtons slot="end">
            <IonButton aria-label="Settings" onClick={() => history.push('/settings')}>
              <IonIcon slot="icon-only" icon={settingsOutline} style={{ color: 'var(--opweb-text)', fontSize: '22px' }} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="login-content center-page">
        <div className="login-shell centered">
          <img src="/assets/logo.svg" alt="Operrate logo" className="brand-logo" />
          <h2 className="login-title">Reset your password</h2>
          <IonText className="login-subtitle">Enter and confirm your new password</IonText>
          <form onSubmit={onSubmit} style={{ maxWidth: 440, margin: '20px auto 0', textAlign: 'left' }}>
            <div className="field">
              <div className="field-label">NEW PASSWORD</div>
              <IonItem className="login-input no-icon" lines="none">
                <IonInput
                  placeholder="Enter new password"
                  value={newPassword}
                  onIonInput={e=>setNewPassword((e as any).detail.value || '')}
                  type={showNewPassword ? 'text' : 'password'}
                />
                <IonButton slot="end" fill="clear" className="toggle-btn" aria-label={showNewPassword ? 'Hide password' : 'Show password'} onClick={() => setShowNewPassword(v => !v)}>
                  <IonIcon icon={showNewPassword ? eyeOff : eye} />
                </IonButton>
              </IonItem>
              {newPassword.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 4, background: 'var(--phoenix-border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${strengthPct}%`, height: '100%', background: strengthColor, transition: 'width 200ms ease' }} />
                  </div>
                  <small style={{ display: 'block', marginTop: 6, color: strengthColor }}>{strengthText}</small>
                </div>
              )}
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <div className="field-label">CONFIRM NEW PASSWORD</div>
              <IonItem className="login-input no-icon" lines="none">
                <IonInput
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onIonInput={e=>setConfirmPassword((e as any).detail.value || '')}
                  type={showConfirmPassword ? 'text' : 'password'}
                />
                <IonButton slot="end" fill="clear" className="toggle-btn" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword(v => !v)}>
                  <IonIcon icon={showConfirmPassword ? eyeOff : eye} />
                </IonButton>
              </IonItem>
              {passwordsMatch !== null && (
                <div style={{ marginTop: 6 }}>
                  {passwordsMatch ? (
                    <small style={{ color: '#2dd36f' }}>✓ Passwords match</small>
                  ) : (
                    <small style={{ color: '#e53935' }}>✗ Passwords do not match</small>
                  )}
                </div>
              )}
            </div>
            <IonButton expand="block" className="login-primary" type="submit" style={{ marginTop: 14 }} disabled={submitting}>{submitting ? 'Resetting…' : 'Reset password'}</IonButton>
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <IonButton fill="clear" size="small" onClick={() => history.replace('/login')}>Back to Sign In</IonButton>
            </div>
          </form>
  </div>
      </IonContent>
  {/* Error toast */}
  <IonToast isOpen={errorOpen} message={errorMsg} position="top" duration={2200} color="danger" onDidDismiss={() => setErrorOpen(false)} />
    </IonPage>
  );
};

export default ResetPassword;
