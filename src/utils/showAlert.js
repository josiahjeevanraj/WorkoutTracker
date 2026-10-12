import { Alert, Platform } from 'react-native';

// Alert.alert is a no-op on react-native-web, so fall back to the browser alert
export default function showAlert(title, message) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
