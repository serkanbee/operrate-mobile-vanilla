import React, { useEffect, useRef, useState } from 'react';
import { IonPage, IonContent, IonButton, useIonRouter, IonToolbar, IonHeader, IonTitle } from '@ionic/react';
import Typed from 'typed.js';
import './Welcome.css';

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

        
      <IonContent fullscreen className="welcome-content">
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

          {/* Spacer pushes button to bottom */}
          <div className="spacer" />

          {/* Bottom CTA */}
          <div className="welcome-footer">
            <IonButton expand="block" onClick={handleStart} className="start-btn">
              Let’s get started
            </IonButton>
          </div>
        </div>

        {/* Loader overlay */}
        {loading && (
          <div className="dots-overlay">
            <div className="dots-loader">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Welcome;
