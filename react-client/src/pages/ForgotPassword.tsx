import React, { useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonItem, IonInput, IonButton, IonText, IonIcon } from '@ionic/react';
import { settingsOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './Login.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const history = useHistory();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    history.push('/verify-code');
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
          <IonText className="login-subtitle">Enter your email below and we will send you a reset code</IonText>
          <form onSubmit={onSubmit} style={{ maxWidth: 440, margin: '22px auto 0', textAlign: 'left' }}>
            <div className="field" style={{ marginTop: 14 }}>
              <IonItem className="login-input no-icon" lines="none">
                <IonInput
                  aria-label="Email address"
                  inputmode="email"
                  placeholder="Enter email address"
                  value={email}
                  onIonChange={(e) => setEmail(e.detail.value || '')}
                />
              </IonItem>
            </div>
            <IonButton expand="block" className="login-primary" type="submit" style={{ marginTop: 14 }}>Send</IonButton>
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <IonButton fill="clear" size="small" onClick={() => history.replace('/login')}>Back to Sign In</IonButton>
            </div>
          </form>
  </div>
      </IonContent>
    </IonPage>
  );
};

export default ForgotPassword;
