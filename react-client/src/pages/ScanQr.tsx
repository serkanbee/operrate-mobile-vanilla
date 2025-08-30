import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/react';
import { useIonRouter } from '@ionic/react';

const ScanQr: React.FC = () => {
  const router = useIonRouter();
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Scan QR (stub)</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>This is a placeholder for the Scan QR page.</p>
        <IonButton onClick={() => router.push('/')}>Back to Welcome</IonButton>
      </IonContent>
    </IonPage>
  );
};

export default ScanQr;
