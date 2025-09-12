import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import React, { useEffect, useState } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';

import Welcome from './pages/Welcome';
import ScanQr from './pages/ScanQr';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyCode from './pages/VerifyCode';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';


/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
// Removed system dark mode to keep a consistent light UI across platforms
// import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';
import './theme/overlays.css';

// Force a consistent UI across iOS and Android
setupIonicReact({ mode: 'ios' });

const App: React.FC = () => {
  const [forcedToast, setForcedToast] = useState<{ open: boolean; msg: string }>(() => ({ open: false, msg: '' }));
  useEffect(() => {
    // Ensure status bar is visible, non-overlaid, and readable on light backgrounds
    (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
  // Match the unified grey background (phoenix-page-grey)
  await StatusBar.setBackgroundColor({ color: '#f5f6f8' });
        await StatusBar.setStyle({ style: Style.Light }); // dark text for light backgrounds
        await StatusBar.show();
      } catch {}
    })();
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
  <RouteTracker />
  <ForcedLogoutListener onToast={(m)=>setForcedToast({ open: true, msg: m })} />
        <RootGate />
        <IonRouterOutlet>

        {/* ✅ Root is now Welcome */}
        {/* <Route exact path="/" component={Home} /> */}
        <Route exact path="/home">
          <Home />
        </Route>
        <Route exact path="/scan-qr">
          <ScanQr />
        </Route>
        <Route exact path="/login">
          <Login />
        </Route>
        <Route exact path="/forgot-password">
          <ForgotPassword />
        </Route>
        <Route exact path="/verify-code">
          <VerifyCode />
        </Route>
        <Route exact path="/reset-password">
          <ResetPassword />
        </Route>
        <Route exact path="/settings">
          <Settings />
        </Route>
        <Route exact path="/"> 
          <Redirect to="/welcome" /> 
        </Route>
        <Route exact path="/welcome">
          <Welcome />
        </Route>

        {/* Other pages */}
        {/* <Route exact path="/home" component={Home} />
        <Route exact path="/scan-qr" component={ScanQr} />

        {/* Catch-all: redirect to root */}
        {/* <Redirect exact from="*" to="/" /> */}
        </IonRouterOutlet>
      </IonReactRouter>
      {/* Minimal global toast for forced logout reasons */}
      <div style={{ position: 'fixed', top: 10, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        {forcedToast.open && (
          <div style={{ display: 'inline-block', background: '#e74c3c', color: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
               onAnimationEnd={() => setForcedToast({ open: false, msg: '' })}>
            {forcedToast.msg}
          </div>
        )}
      </div>
    </IonApp>
  );
};

export default App;

// Persist last visited route for warm resumes and reopen
const RouteTracker: React.FC = () => {
  useEffect(() => {
    const handler = () => {
      try {
  const p = window.location.pathname + window.location.search + window.location.hash;
  // Don’t persist auth entry routes as lastRoute
  if (window.location.pathname === '/login') return;
  localStorage.setItem('lastRoute', p);
      } catch {}
    };
    window.addEventListener('hashchange', handler);
    window.addEventListener('popstate', handler);
    const push = history.pushState.bind(history);
    const replace = history.replaceState.bind(history);
    history.pushState = function (data: any, unused: string, url?: string | URL | null) {
      const r = push(data, unused, url);
      handler();
      return r;
    } as typeof history.pushState;
    history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
      const r = replace(data, unused, url);
      handler();
      return r;
    } as typeof history.replaceState;
    handler();
    return () => {
      window.removeEventListener('hashchange', handler);
      window.removeEventListener('popstate', handler);
      history.pushState = push;
      history.replaceState = replace;
    };
  }, []);
  return null;
};

// Gate initial route: first run -> Welcome; otherwise -> lastRoute if present and user still logged in
import { Capacitor } from '@capacitor/core';
import { tokens } from './api/httpClient';
import { useHistory } from 'react-router-dom';
import { useState as _useState, useEffect as _useEffect } from 'react';
import { subscribeForcedLogout } from './auth/authEvents';
import { useAuth } from './auth/AuthProvider';

const RootGate: React.FC = () => {
  const history = useHistory();
  const [booted, setBooted] = _useState(false);
  _useEffect(() => {
    (async () => {
      try {
        const hasSeen = localStorage.getItem('hasSeenWelcome');
        const { accessToken } = await tokens.get();
        const last = localStorage.getItem('lastRoute') || '';
        if (!hasSeen) {
          localStorage.setItem('hasSeenWelcome', '1');
          if (history.location.pathname !== '/welcome') history.replace('/welcome');
          setBooted(true);
          return;
        }
        // If user has token, prefer last route (not Welcome); else go to /login
        if (accessToken) {
          const disallowed = new Set(['/', '/welcome', '/login']);
          if (last && !disallowed.has(last)) history.replace(last);
          else history.replace('/home');
        } else {
          if (history.location.pathname === '/' || history.location.pathname === '/welcome') history.replace('/login');
        }
      } catch {}
      setBooted(true);
    })();
  }, [history]);
  return null;
};

// Listens for forced logout events and redirects user to /login
const ForcedLogoutListener: React.FC<{ onToast?: (msg: string) => void }> = ({ onToast }) => {
  const history = useHistory();
  const auth = useAuth();
  useEffect(() => {
    const unsub = subscribeForcedLogout(async (e) => {
      try {
        await auth.logout();
        await tokens.clear();
      } catch {}
      const msg = e.reason === 'blocked' ? (e.message || 'Your account has been blocked.') : (e.message || 'You have been signed out.');
      if (onToast) onToast(msg);
      if (history.location.pathname !== '/login') history.replace('/login');
    });
    return () => unsub();
  }, [auth, history, onToast]);
  return null;
};
