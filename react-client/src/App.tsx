import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';

import Welcome from './pages/Welcome';
import ScanQr from './pages/ScanQr';

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
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => (
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

export default App;
