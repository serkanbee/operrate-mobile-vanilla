import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import React, { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';

import Welcome from './pages/Welcome';
import ScanQr from './pages/ScanQr';
import Login from './pages/Login';
import Settings from './pages/Settings';
import ForgotPassword from './pages/ForgotPassword';
import VerifyCode from './pages/VerifyCode';
import ResetPassword from './pages/ResetPassword';


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
    </IonApp>
  );
};

export default App;
