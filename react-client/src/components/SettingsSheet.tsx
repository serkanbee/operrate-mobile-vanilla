import React, { useEffect, useRef, useState } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton, IonButtons, IonIcon, IonText } from '@ionic/react';
import { chevronDown } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { getApiBaseUrl, setApiBaseUrl, httpFetch } from '../api/httpClient';
import { log } from '../utils/logger';

type Props = {
  isOpen: boolean;
  onDismiss: () => void;
  onSaved?: (apiUrl: string) => void;
};

const SettingsSheet: React.FC<Props> = ({ isOpen, onDismiss, onSaved }) => {
  const presentingEl = useRef<HTMLElement | null>(null);
  const router = useIonRouter();
  const [apiUrl, setApiUrlState] = useState('');
  const [platform, setPlatform] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    presentingEl.current = document.querySelector('ion-router-outlet');
  }, []);

  useEffect(() => {
    if (isOpen) {
      setApiUrlState(getApiBaseUrl() || '');
      setPlatform(`${Capacitor.getPlatform()} (native: ${Capacitor.isNativePlatform() ? 'yes' : 'no'})`);
      setTestMsg(null);
    }
  }, [isOpen]);

  const save = async () => {
    const clean = (apiUrl || '').trim().replace(/\/$/, '');
    setApiBaseUrl(clean);
    log('settings-sheet: apiBaseUrl saved', clean);
    if (onSaved) onSaved(clean);
    onDismiss();
  };

  const testAuth = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await httpFetch('/api/auth/me');
      const ok = res.ok; const s = res.status;
      setTestMsg(ok ? `Auth OK (${s})` : `Auth not OK (${s})`);
    } catch (e: any) {
      setTestMsg(`Auth error: ${e?.message || 'unknown'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      presentingElement={presentingEl.current as any}
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      handleBehavior="cycle"
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Done</IonButton>
          </IonButtons>
          <IonTitle>Connection settings</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={() => router.push('/scan-qr')}>
              Scan QR
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: 12 }}>
          <IonItem lines="full">
            <IonLabel position="stacked">API Base URL</IonLabel>
            <IonInput value={apiUrl} placeholder="https://your.api.host" onIonChange={(e) => setApiUrlState(e.detail.value || '')} />
          </IonItem>
          <div style={{ padding: '12px 0' }}>
            <IonButton onClick={save}>Save</IonButton>
            <IonButton onClick={testAuth} style={{ marginLeft: 8 }} color="medium" disabled={testing}>Test /api/auth/me</IonButton>
          </div>
          <div style={{ paddingTop: 6 }}>
            <IonText color="medium">Platform: {platform}</IonText>
            {testMsg ? <div style={{ marginTop: 8 }}><IonText color={testMsg.startsWith('Auth OK') ? 'success' : 'danger'}>{testMsg}</IonText></div> : null}
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default SettingsSheet;
