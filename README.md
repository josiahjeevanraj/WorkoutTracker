# Workout Tracker App

A cross-platform fitness tracking application built with React Native and Expo for iOS and Android.

## Features

- Track workouts and exercises
- Monitor progress with statistics
- User profiles and settings
- Native performance on both iOS and Android

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI for building (`npm install -g eas-cli`)
- Expo Go app on your phone for testing

## Getting Started

### Installation

1. Navigate to the project directory:
```bash
cd WorkoutTracker
```

2. Install dependencies:
```bash
npm install
```

### Development

Run the app in development mode:

```bash
npx expo start
```

This will open Expo DevTools. You can then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan the QR code with Expo Go app on your phone

### Project Structure

```
WorkoutTracker/
├── src/
│   ├── components/     # Reusable components
│   ├── screens/        # App screens
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API and external services
│   ├── utils/          # Helper functions
│   └── styles/         # Global styles
├── assets/             # Images, fonts, etc.
├── App.js             # Entry point
├── app.json           # Expo configuration
└── eas.json           # EAS Build configuration
```

## Building for App Stores

### Setup EAS Build

1. Create an Expo account at https://expo.dev
2. Login to EAS:
```bash
eas login
```

3. Configure your project:
```bash
eas build:configure
```

### Build for iOS (App Store)

1. Build for iOS:
```bash
eas build --platform ios
```

2. Submit to App Store:
```bash
eas submit -p ios
```

Requirements:
- Apple Developer Account ($99/year)
- App Store Connect access
- Valid provisioning profiles

### Build for Android (Play Store)

1. Build for Android:
```bash
eas build --platform android
```

2. Submit to Play Store:
```bash
eas submit -p android
```

Requirements:
- Google Play Developer Account ($25 one-time)
- Signed APK/AAB
- Play Console access

### Local Builds

For testing without EAS:

**iOS (Mac only):**
```bash
npx expo run:ios
```

**Android:**
```bash
npx expo run:android
```

## Testing on Physical Devices

### iOS
1. Download Expo Go from App Store
2. Scan QR code from terminal
3. Or use TestFlight for production builds

### Android
1. Download Expo Go from Play Store
2. Scan QR code from terminal
3. Or download APK directly for testing

## Configuration

### App Configuration
Edit `app.json` to modify:
- App name and slug
- Version numbers
- Bundle identifiers
- Icons and splash screens

### Build Configuration
Edit `eas.json` to configure:
- Build profiles (development, preview, production)
- Distribution settings
- Submission configurations

## Environment Variables

Create a `.env` file for environment-specific variables:
```
API_URL=your-api-url
API_KEY=your-api-key
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues:**
```bash
npx expo start --clear
```

2. **Dependency issues:**
```bash
rm -rf node_modules
npm install
```

3. **iOS Simulator issues:**
```bash
xcrun simctl erase all
```

4. **Android Emulator issues:**
```bash
cd android
./gradlew clean
```

## Publishing Updates

With EAS Update (OTA updates):
```bash
eas update --branch production
```

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/guidelines/)
- [Play Store Guidelines](https://play.google.com/console/about/guides/)

## License

MIT