import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonContent, IonBackButton } from '@ionic/react';

const Settings: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" text="" />
          </IonButtons>
          <IonButtons slot="end">
            <div className="toolbar-title" style={{ paddingRight: '12px' }}>Settings</div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
  <IonContent fullscreen style={{ '--background': 'var(--app-bg)' } as any}>
        {/* Blank for now */}
      </IonContent>
    </IonPage>
  );
};

export default Settings;
