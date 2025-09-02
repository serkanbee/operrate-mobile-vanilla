import React, { useEffect, useState } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonToast } from '@ionic/react';
import { settingsOutline } from 'ionicons/icons';
import './Login.css';

const Login: React.FC = () => {
  const [showInitToast, setShowInitToast] = useState(false);
  const [showPromptToast, setShowPromptToast] = useState(false);

  useEffect(() => {
    // Sequential toasts: setup complete (green) → prompt
    const t1 = setTimeout(() => setShowInitToast(true), 150);
    const t2 = setTimeout(() => setShowPromptToast(true), 2300); // a bit after the first one hides
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
          <IonButtons slot="start">
            <div className="toolbar-title">Login</div>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton aria-label="Settings">
              <IonIcon
                slot="icon-only"
                icon={settingsOutline}
                style={{ color: '#222', fontSize: '24px' }}
              />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="login-content" fullscreen>
        <div className="login-inner">
          {/* Placeholder content; form can be added later */}
          <img src="/assets/logo.svg" alt="Operrate logo" className="login-logo" />
        </div>
        <IonToast
          isOpen={showInitToast}
          message="Your initial setup is complete"
          position="bottom"
          duration={1600}
          color="success"
          onDidDismiss={() => setShowInitToast(false)}
        />
        <IonToast
          isOpen={showPromptToast}
          message="Please log in or sign up"
          position="bottom"
          duration={2200}
          color="success"
          onDidDismiss={() => setShowPromptToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;
