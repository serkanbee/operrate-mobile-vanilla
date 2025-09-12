import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, IonList, IonItem, IonLabel, IonText, IonToast } from '@ionic/react';
import { settingsOutline, logOutOutline } from 'ionicons/icons';
import { useHistory, Redirect } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { httpFetch } from '../api/httpClient';
import { log, warn } from '../utils/logger';
import './Home.css';
// import SettingsSheet from '../components/SettingsSheet';

const Home: React.FC = () => {
  const history = useHistory();
  const { user, loading, logout } = useAuth();
  const [toastMsg, setToastMsg] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  // const [showSettings, setShowSettings] = useState(false);

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
            <IonTitle>Home</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen style={{ '--background': 'var(--app-bg)' } as any}>
          <div style={{ padding: 24 }}>Loading…</div>
        </IonContent>
      </IonPage>
    );
  }
  if (!user) return <Redirect to="/login" />;

  const doTestMe = async () => {
    try {
      const res = await httpFetch('/api/auth/me', { headers: { Accept: 'application/json' } });
      const ok = res.ok; const s = res.status;
      setToastMsg(ok ? `Me OK (${s})` : `Me not OK (${s})`);
      setToastOpen(true);
    } catch (e: any) {
      setToastMsg(`Me error: ${e?.message || 'unknown'}`);
      setToastOpen(true);
    }
  };

  const doLogout = async () => {
    try { await logout(); log('home: logout'); history.replace('/login'); } catch (e) { warn('home: logout failed', e); }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
          <IonTitle>Home</IonTitle>
          <IonButtons slot="end">
            <IonButton aria-label="Settings" onClick={() => history.push('/settings')}>
              <IonIcon slot="icon-only" icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen style={{ '--background': 'var(--app-bg)' } as any}>
        <div style={{ padding: 16 }}>
          <IonList inset>
            <IonItem>
              <IonLabel>
                <h2>Signed in</h2>
                <IonText color="medium">{user?.email}</IonText>
              </IonLabel>
            </IonItem>
            {user?.firstName || user?.lastName || user?.role ? (
              <IonItem>
                <IonLabel>
                  <div>Name: {user?.firstName || ''} {user?.lastName || ''}</div>
                  {user?.role ? <div>Role: {user.role}</div> : null}
                </IonLabel>
              </IonItem>
            ) : null}
          </IonList>

          <div style={{ padding: '12px 12px 0' }}>
            <IonButton onClick={doTestMe}>Test /api/auth/me</IonButton>
            <IonButton color="medium" style={{ marginLeft: 8 }} onClick={() => history.push('/scan-qr')}>Scan QR</IonButton>
            <IonButton color="danger" fill="outline" style={{ marginLeft: 8 }} onClick={doLogout}>
              <IonIcon icon={logOutOutline} slot="start" /> Logout
            </IonButton>
          </div>
        </div>
        <IonToast isOpen={toastOpen} message={toastMsg} duration={1600} position="top" onDidDismiss={() => setToastOpen(false)} />
      </IonContent>
  {/** SettingsSheet removed; using full page Settings again */}
    </IonPage>
  );
};

export default Home;
