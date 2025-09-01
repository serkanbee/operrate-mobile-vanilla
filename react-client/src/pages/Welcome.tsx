import React, { useEffect, useRef, useState } from 'react';
import { IonPage, IonContent, IonButton, useIonRouter, IonToolbar, IonHeader, IonFooter } from '@ionic/react';
import Typed from 'typed.js';
import './Welcome.css';
import FullScreenDots from '../components/FullScreenDots';

const Welcome: React.FC = () => {
  const typedTarget = useRef<HTMLSpanElement | null>(null);
  const router = useIonRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const typed = new Typed(typedTarget.current!, {
      strings: [
        'facilities maintenance',
        'help desk requests',
        'assests and inventory.',
        
      ],
      typeSpeed: 45,
      backSpeed: 25,
      backDelay: 2500,
      loop: true,
      smartBackspace: true,
      cursorChar: '|'
    });
    return () => typed.destroy();
  }, []);

  const handleStart = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/scan-qr');
    }, 700);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
          {/* No title on the Welcome page */}
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="welcome-content" style={{ '--background': 'var(--app-bg)' } as any}>
        <div className="welcome-inner">
          {/* Centered area */}
          <div className="welcome-center">
            <div className="logo-wrap">
              <img src="/assets/logo.svg" alt="Operrate logo" className="logo-img" />
            </div>
            
            <h1 className="welcome-title">Welcome to Operrate</h1>
            <div className="typed-text-area-wrap">
            <h3 className="typed-heading">
              <span className="typed-prefix">A smarter way to manage:</span>
              <span className="typed-line">
                <span ref={typedTarget} className="typed-text" />
              </span>
            </h3>
            </div>
          </div>
        </div>

  <FullScreenDots show={loading} ariaLabel="Loading" />
      </IonContent>

      {!loading && (
        <IonFooter>
          <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
            <div className="welcome-footer">
              <IonButton expand="block" color="primary" onClick={handleStart} className="start-btn">
                Let’s get started
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default Welcome;
