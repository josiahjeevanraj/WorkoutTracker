// Gesture handler entry for web. The package's main entry also exports components
// built on react-native-reanimated, which pulls ~650 KB of unused code into the web
// bundle; import only what the app uses and run the same initialisation instead.
import { initialize } from 'react-native-gesture-handler/lib/module/init';
import Swipeable from 'react-native-gesture-handler/lib/module/components/Swipeable';
import GestureHandlerRootView from 'react-native-gesture-handler/lib/module/components/GestureHandlerRootView';

initialize();

export { Swipeable, GestureHandlerRootView };
