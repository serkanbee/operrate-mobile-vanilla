import React, { useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonItem, IonInput, IonButton, IonText, IonIcon, IonToast } from '@ionic/react';
import { settingsOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './Login.css';
import { requestPasswordReset } from '../api/account';
import { log, warn } from '../utils/logger';
import FullScreenDots from '../components/FullScreenDots';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [valid, setValid] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorOpen, setErrorOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showDots, setShowDots] = useState(false);
  const history = useHistory();

  // Safety: auto-clear dots if something stalls (e.g., navigation fails)
  React.useEffect(() => {
    if (!showDots) return;
    const failSafe = setTimeout(() => setShowDots(false), 5000); // 5s fallback
    return () => clearTimeout(failSafe);
  }, [showDots]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorOpen(false);
    setErrorMsg('');
    const eaddr = (email || '').trim();
    const isValid = /.+@.+\..+/.test(eaddr);
    if (!isValid) { setErrorMsg('Enter a valid email'); setErrorOpen(true); return; }
    setSubmitting(true);
    try {
      await requestPasswordReset(eaddr);
      try { sessionStorage.setItem('recoverEmail', eaddr); } catch {}
  // Non-enumeration: always show the same confirmation toast
  setInfoOpen(true);
  log('ForgotPassword: request sent');
  // Show brief handoff overlay, navigate immediately (no fixed delay = less risk of being stuck)
  setShowDots(true);
  // Use replace so user can't go back to stale email form with overlay
  history.replace(`/verify-code?email=${encodeURIComponent(eaddr)}`);
    } catch (err: any) {
      const msg = err?.message || 'Request failed';
      warn('ForgotPassword: failed', msg);
      setErrorMsg(msg);
      setErrorOpen(true);
    } finally { setSubmitting(false); }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" text="" />
          </IonButtons>
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
          <h2 className="login-title">Forgot your password?</h2>
            <IonText className="login-subtitle">Enter your email address. If an account exists, we’ll send you a 6‑digit code.</IonText>
            {/* Removed duplicate inline info per request */}
          <form onSubmit={onSubmit} style={{ maxWidth: 440, margin: '22px auto 0', textAlign: 'left' }}>
            <div className="field" style={{ marginTop: 14 }}>
              <IonItem className="login-input no-icon" lines="none">
                <IonInput
                  aria-label="Email address"
                  inputmode="email"
                  placeholder="Enter email address"
                  value={email}
                  onIonInput={(e) => {
                    const v = (e as any).detail.value || '';
                    setEmail(v);
                    setValid(/.+@.+\..+/.test((v||'').trim()));
                  }}
                />
              </IonItem>
            </div>
            <IonButton expand="block" className="login-primary" type="submit" style={{ marginTop: 14 }} disabled={submitting || !valid}>{submitting ? 'Sending…' : 'Send'}</IonButton>
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <IonButton fill="clear" size="small" onClick={() => history.replace('/login')}>Back to Sign In</IonButton>
            </div>
          </form>
  </div>
  </IonContent>
  <IonToast isOpen={errorOpen} message={errorMsg} position="top" duration={2200} color="danger" onDidDismiss={() => setErrorOpen(false)} />
  <IonToast isOpen={infoOpen} message="If an account exists for this email, a 6‑digit code will be sent." position="top" duration={2500} color="success" onDidDismiss={() => setInfoOpen(false)} />
  <FullScreenDots show={showDots} ariaLabel="Continuing" />
    </IonPage>
  );
};

export default ForgotPassword;
