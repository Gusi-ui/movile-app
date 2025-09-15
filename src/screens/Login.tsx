import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import React, { useState } from 'react';

import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen(): React.JSX.Element {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (): Promise<void> => {
    if (submitting) return;
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error !== null) Alert.alert('Error', error);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acceso trabajadora</Text>
      <TextInput
        style={styles.input}
        placeholder='Email'
        autoCapitalize='none'
        keyboardType='email-address'
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder='Contraseña'
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        title={submitting || loading ? 'Entrando…' : 'Entrar'}
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
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
});
