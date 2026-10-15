import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

// Native placeholder: route maps are web-only until the native app (react-native-maps) in phase 2
const RouteMap = ({ height = 260 }) => (
  <View style={[s.wrap, { height }]}>
    <Text style={s.text}>Maps are available in the web app for now</Text>
  </View>
);

const s = StyleSheet.create({
  wrap: { borderRadius: 14, backgroundColor: Colors.cardBackground, alignItems: 'center', justifyContent: 'center' },
  text: { color: Colors.gray, fontSize: 13 },
});

export default RouteMap;
