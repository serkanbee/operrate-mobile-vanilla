import React, { useEffect, useState, useCallback } from 'react';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonText, IonButton, IonIcon, IonToast } from '@ionic/react';
import { settingsOutline } from 'ionicons/icons';
// Use the official Ionic OTP input component
import { IonInputOtp } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './Login.css';
import { requestPasswordReset, verifyReset } from '../api/account';
import { log, warn } from '../utils/logger';
import FullScreenDots from '../components/FullScreenDots';

const VerifyCode: React.FC = () => {
  const history = useHistory();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorOpen, setErrorOpen] = useState(false);
  const [okOpen, setOkOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [showDots, setShowDots] = useState(false);

  useEffect(() => {
    try {
      const ss = sessionStorage.getItem('recoverEmail') || '';
      const q = new URLSearchParams(window.location.search).get('email') || '';
      setEmail(q || ss);
    } catch {}
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Auto-clear dots if navigation or reset is blocked for any reason
  useEffect(() => {
    if (!showDots) return;
    const t = setTimeout(() => setShowDots(false), 6000);
    return () => clearTimeout(t);
  }, [showDots]);

  const doSubmit = useCallback(async () => {
    setErrorOpen(false);
    setErrorMsg('');
    const codeStr = (code || '').trim();
  if (!email || codeStr.length !== 6 || !/^[0-9]{6}$/.test(codeStr)) { return; }
    setSubmitting(true);
    try {
  // Verify the reset code with the server to prevent advancing on wrong codes
  await verifyReset(email, codeStr);
      try { sessionStorage.setItem('recoverCode', codeStr); } catch {}
      log('VerifyCode: code verified, proceeding to reset');
      setOkOpen(true); // green toast confirmation
  setShowDots(true);
  // Navigate immediately; if route mounts quickly overlay will unmount; fail-safe above clears otherwise
  history.replace(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      const msg = err?.message || 'Invalid or expired code';
      warn('VerifyCode: verification failed', msg);
      setErrorMsg(msg);
      setErrorOpen(true);
    } finally { setSubmitting(false); }
  }, [code, email, history]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    doSubmit();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
          <IonButtons slot="start"><IonBackButton defaultHref="/login" text="" /></IonButtons>
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
          <h2 className="login-title">Enter the verification code</h2>
          <IonText className="login-subtitle">Enter the 6‑digit code sent to your email address.</IonText>
          <form onSubmit={onSubmit} style={{ maxWidth: 440, margin: '18px auto 0', textAlign: 'center' }}>
    <div style={{ display:'flex', justifyContent:'center', margin:'10px 0 8px', padding: '0 20px' }}>
              <IonInputOtp
                value={code}
                onIonChange={(e: any) => {
                  const v = e.detail.value ?? '';
                  setCode(v);
      if (!submitting && v && v.length === 6 && /^[0-9]{6}$/.test(v)) {
                    doSubmit();
                  }
                }}
                length={6}
                type="number"
                fill="outline"
                shape="soft"
                color="primary"
                style={{
                  '--border-radius': '10px',
      '--width': '48px',
      '--height': '50px',
                  '--background': '#ffffff',
                  '--border-color': 'var(--phoenix-border)',
                  '--highlight-color-focused': 'var(--phoenix-blue-focus)',
                  '--color': 'var(--opweb-text)',
      '--font-size': '20px'
                } as any}
              />
            </div>
            <IonButton expand="block" className="login-primary" type="submit" disabled={submitting || code.length !== 6}>{submitting ? 'Verifying…' : 'Verify'}</IonButton>
            <div className="resend-wrap" style={{ marginTop: 12 }}>
              <IonButton fill="clear" size="small" className="resend-link" style={{ color: cooldown>0 ? 'var(--opweb-text-muted)' : undefined }} disabled={!email || resending || cooldown>0} onClick={async ()=>{
                if (!email) return;
                setResending(true);
                setErrorOpen(false);
                try {
                  await requestPasswordReset(email);
                  setCooldown(30);
                  setCode('');
                  // Neutral success message (non-enumerating)
                  setInfoMsg('If an account exists, a new code has been sent.');
                  setInfoOpen(true);
                } catch (err:any) {
                  setErrorMsg(err?.message || 'Could not resend code');
                  setErrorOpen(true);
                } finally { setResending(false); }
              }}>
                {cooldown>0 ? `Resend in ${cooldown}s` : 'Resend the code'}
              </IonButton>
            </div>
            <div style={{ marginTop: 24 }}>
              <IonButton fill="clear" size="small" onClick={() => history.replace('/login')}>Back to Sign In</IonButton>
            </div>
          </form>
  </div>
  </IonContent>
  <FullScreenDots show={showDots} ariaLabel="Continuing" />
  <IonToast isOpen={errorOpen} message={errorMsg} position="top" duration={2200} color="danger" onDidDismiss={() => setErrorOpen(false)} />
  <IonToast isOpen={okOpen} message="Code verified" position="top" duration={1200} color="success" onDidDismiss={() => setOkOpen(false)} />
  <IonToast isOpen={infoOpen} message={infoMsg} position="top" duration={1800} color="success" onDidDismiss={() => setInfoOpen(false)} />
    </IonPage>
  );
};

export default VerifyCode;
