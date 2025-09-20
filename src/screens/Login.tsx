import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import React, { useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';

export default function LoginScreen(): React.JSX.Element {
  const { state, login } = useAuth();
  const { isLoading } = state;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (): Promise<void> => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Error de autenticación'
      );
    }
    setSubmitting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acceso trabajadora</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        title={submitting || isLoading ? 'Entrando…' : 'Entrar'}
        onPress={handleLogin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundCard,
  },
});
