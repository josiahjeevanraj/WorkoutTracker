import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import AuthScreen from './src/screens/AuthScreen';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import UpdateBanner from './src/components/UpdateBanner';
import { FeatureFlagsProvider, useFeatureFlagsReady } from './src/contexts/FeatureFlagsContext';
import { RestTimerProvider } from './src/contexts/RestTimerContext';
import RestTimerBar from './src/components/RestTimerBar';

const Root = () => {
  const { session, loading } = useAuth();
  const flagsReady = useFeatureFlagsReady();
  // Wait for flags so disabled features don't flash in before hiding
  if (loading || (session && !flagsReady)) return null;
  return session ? <AppNavigator /> : <AuthScreen />;
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <FeatureFlagsProvider>
            <RestTimerProvider>
              <ThemeProvider>
                <StatusBar style="auto" />
                <View style={{ flex: 1 }}>
                  <Root />
                  <RestTimerBar floating />
                  <UpdateBanner />
                </View>
              </ThemeProvider>
            </RestTimerProvider>
          </FeatureFlagsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
