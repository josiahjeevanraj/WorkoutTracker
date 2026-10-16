import { registerRootComponent } from 'expo';

// Defines the background location task for outdoor runs at startup (no-op on web)
import './src/services/runLocation';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
