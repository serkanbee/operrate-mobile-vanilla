import React, { useEffect, useState } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonToast, IonList, IonItem, IonInput, IonText } from '@ionic/react';
import { settingsOutline, person, key, eye, eyeOff, fingerPrintOutline } from 'ionicons/icons';
import './Login.css';
import { useHistory } from 'react-router-dom';

const Login: React.FC = () => {
  const [showInitToast, setShowInitToast] = useState(false);
  const [showPromptToast, setShowPromptToast] = useState(false);
  const history = useHistory();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Show the initial success/prompt toasts only once per app session
    const shown = sessionStorage.getItem('initToastsShown');
    if (!shown) {
      const t1 = setTimeout(() => setShowInitToast(true), 150);
      const t2 = setTimeout(() => setShowPromptToast(true), 2300);
      sessionStorage.setItem('initToastsShown', '1');
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
          <IonButtons slot="end">
            <IonButton aria-label="Settings" onClick={() => history.push('/settings')}>
              <IonIcon slot="icon-only" icon={settingsOutline} style={{ color: 'var(--opweb-text)', fontSize: '22px' }} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="login-content">
        <div className="login-shell centered">
          {/* brand logo */}
          <img src="/assets/logo.svg" alt="Operrate logo" className="brand-logo" />

          <h2 className="login-title">Sign In</h2>
          <IonText className="login-subtitle">Get access to your account</IonText>

          <IonList className="login-list">
            <div className="field">
              <div className="field-label">EMAIL ADDRESS</div>
              <IonItem className="login-input" lines="none">
                <IonIcon slot="start" icon={person} />
                <IonInput aria-label="Email address" inputmode="email" placeholder="name@example.com" />
              </IonItem>
            </div>
            <div className="field">
              <div className="field-label">PASSWORD</div>
              <IonItem className="login-input" lines="none">
                <IonIcon slot="start" icon={key} />
                <IonInput aria-label="Password" type={showPassword ? 'text' : 'password'} placeholder="Password" />
                <IonButton slot="end" fill="clear" className="toggle-btn" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>
                  <IonIcon icon={showPassword ? eyeOff : eye} />
                </IonButton>
              </IonItem>
              <div className="login-links">
                <IonButton fill="clear" size="small" className="forgot-link" onClick={() => history.push('/forgot-password')}>Forgot Password?</IonButton>
              </div>
            </div>
          </IonList>

          <IonButton expand="block" className="login-primary">Sign In</IonButton>
        </div>

        {/* Divider and biometrics */}
  <div className="login-bottom">
          <div className="biometric-caption action-label">Biometric sign-in</div>
          <div className="bio-center">
            <IonButton fill="outline" className="quick-btn bio-btn" aria-label="Sign in with biometrics">
              <IonIcon slot="icon-only" icon={fingerPrintOutline} />
            </IonButton>
          </div>
        </div>

  <IonToast isOpen={showInitToast} message="Your server connection setup is complete" position="top" duration={1600} color="success" onDidDismiss={() => setShowInitToast(false)} />
  <IonToast isOpen={showPromptToast} message="Please log in" position="top" duration={2200} color="success" onDidDismiss={() => setShowPromptToast(false)} />
      </IonContent>
    </IonPage>
  );
};

export default Login;
