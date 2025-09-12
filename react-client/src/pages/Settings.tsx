import React, { useEffect, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonContent, IonBackButton, IonItem, IonInput, IonLabel, IonList, IonButton, IonText, IonToast } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { getApiBaseUrl, setApiBaseUrl, httpFetch } from '../api/httpClient';
import { log } from '../utils/logger';
import { useHistory } from 'react-router-dom';

const Settings: React.FC = () => {
  const history = useHistory();
  const [apiUrl, setApiUrl] = useState('');
  const [platform, setPlatform] = useState('');
  const [debugEnabled, setDebugEnabled] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    setApiUrl(getApiBaseUrl() || '');
    setPlatform(`${Capacitor.getPlatform()} (native: ${Capacitor.isNativePlatform() ? 'yes' : 'no'})`);
    try { setDebugEnabled(localStorage.getItem('debugAuth') || ''); } catch {}
  }, []);

  const save = (showToast: boolean = true) => {
    const clean = (apiUrl || '').trim().replace(/\/$/, '');
    setApiBaseUrl(clean);
    log('settings: apiBaseUrl saved', clean);
    if (showToast) {
      setToastMsg('URL saved');
      setToastOpen(true);
    }
  };

  const testAuth = async () => {
    try {
      const res = await httpFetch('/api/auth/me');
      const ok = res.ok;
      const s = res.status;
      setToastMsg(ok ? `Auth OK (${s})` : `Auth not OK (${s})`);
      setToastOpen(true);
    } catch (e: any) {
      setToastMsg(`Auth error: ${e?.message || 'unknown'}`);
      setToastOpen(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" text="" />
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/scan-qr')}>Scan QR</IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <div className="toolbar-title" style={{ paddingRight: '12px' }}>Settings</div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen style={{ '--background': 'var(--app-bg)' } as any}>
        <IonList inset>
          <IonItem lines="full">
            <IonLabel position="stacked">API Base URL</IonLabel>
            <IonInput
              value={apiUrl}
              placeholder="https://your.api.host"
              onIonInput={(e: any) => setApiUrl(e.detail?.value ?? '')}
              onIonBlur={() => save(false)}
            />
          </IonItem>
          <div style={{ padding: '12px' }}>
            <IonButton onClick={() => save(true)}>Save</IonButton>
            <IonButton onClick={testAuth} style={{ marginLeft: 8 }} color="medium">Test /api/auth/me</IonButton>
          </div>
          <div style={{ padding: '12px' }}>
            <IonText color="medium">Platform: {platform}</IonText>
            <br />
            <IonText color="medium">Debug logs: {debugEnabled ? 'enabled' : 'disabled'} (localStorage.debugAuth)</IonText>
          </div>
        </IonList>
  </IonContent>
  <IonToast isOpen={toastOpen} message={toastMsg} duration={1600} position="top" onDidDismiss={()=>setToastOpen(false)} />
    </IonPage>
  );
};

export default Settings;
