import React, { useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonText, IonButton, IonIcon } from '@ionic/react';
import { settingsOutline } from 'ionicons/icons';
// Use the official Ionic OTP input component
import { IonInputOtp } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './Login.css';

const VerifyCode: React.FC = () => {
  const history = useHistory();
  const [code, setCode] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    history.push('/reset-password');
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
          <IonText className="login-subtitle">We sent a 6-digit code to your email</IonText>
          <form onSubmit={onSubmit} style={{ maxWidth: 440, margin: '18px auto 0', textAlign: 'center' }}>
            <div style={{ display:'flex', justifyContent:'center', margin:'10px 0 8px' }}>
              <IonInputOtp
                value={code}
                onIonChange={(e: any) => setCode(e.detail.value ?? '')}
                length={6}
                type="number"
                fill="outline"
                shape="soft"
                color="primary"
                style={{
                  '--border-radius': '8px',
                  '--width': '44px',
                  '--height': '46px',
                  '--background': '#ffffff',
                  '--border-color': 'var(--phoenix-border)',
                  '--highlight-color-focused': 'var(--phoenix-blue-focus)',
                  '--color': 'var(--opweb-text)'
                } as any}
              />
            </div>
            <IonButton expand="block" className="login-primary" type="submit">Verify</IonButton>
            <div className="resend-wrap" style={{ marginTop: 12 }}>
              <IonText className="resend-helper" style={{ textAlign: 'center' }}>
                Didn’t get a code? <span style={{ textDecoration: 'underline', color: 'var(--phoenix-blue)' }}>Resend the code</span>
              </IonText>
            </div>
            <div style={{ marginTop: 24 }}>
              <IonButton fill="clear" size="small" onClick={() => history.replace('/login')}>Back to Sign In</IonButton>
            </div>
          </form>
  </div>
      </IonContent>
    </IonPage>
  );
};

export default VerifyCode;
