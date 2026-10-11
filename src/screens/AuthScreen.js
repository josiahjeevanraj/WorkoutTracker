import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';
import { Colors } from '../constants/colors';

const AuthScreen = () => {
  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const isSignUp = mode === 'signUp';

  const submit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Enter an email and password.');
      return;
    }
    setLoading(true);
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (isSignUp) setCheckEmail(true);
  };

  if (checkEmail) {
    return (
      <View style={[s.container, s.centered]}>
        <Ionicons name="mail-outline" size={40} color={Colors.text} />
        <Text style={s.title}>Check your email</Text>
        <Text style={s.subtitle}>
          We sent a confirmation link to {email}. Confirm it, then sign in below.
        </Text>
        <TouchableOpacity
          style={s.linkBtn}
          onPress={() => { setCheckEmail(false); setMode('signIn'); setPassword(''); }}
        >
          <Text style={s.linkText}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.appName}>Workout Tracker</Text>
        <Text style={s.title}>{isSignUp ? 'Create account' : 'Welcome back'}</Text>

        <View style={s.field}>
          <Text style={s.label}>EMAIL</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={Colors.gray}
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>PASSWORD</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="••••••••"
            placeholderTextColor={Colors.gray}
          />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={s.submitBtn} onPress={submit} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={s.submitText}>{isSignUp ? 'Sign up' : 'Sign in'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.linkBtn}
          onPress={() => { setMode(isSignUp ? 'signIn' : 'signUp'); setError(null); }}
        >
          <Text style={s.linkText}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 10 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 60 },

  appName: { fontSize: 14, fontWeight: '700', color: Colors.text, letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 28 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  field: { marginBottom: 16 },
  label: { fontSize: 10, color: Colors.gray, fontWeight: '600', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#FFFFFF',
  },

  error: { fontSize: 13, color: Colors.error, marginBottom: 12, textAlign: 'center' },

  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  linkBtn: { marginTop: 18, alignItems: 'center' },
  linkText: { fontSize: 13, color: Colors.text, fontWeight: '600' },
});

export default AuthScreen;
