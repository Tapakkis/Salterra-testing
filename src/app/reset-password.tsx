import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { updatePassword } from '@/lib/auth';
import { getAuthErrorMessage } from '@/lib/auth-error-message';
import { PasswordVisibilityToggle } from '@/components/password-visibility-toggle';
import { useAuthLanguage } from '@/lib/auth-language';

export default function ResetPasswordScreen() {
  const { language, t } = useAuthLanguage();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 8) return Alert.alert(t('passwordTooShort'), t('useEightCharacters'));
    if (password !== confirmation) return Alert.alert(t('passwordsNoMatch'), t('samePasswordTwice'));
    setBusy(true);
    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      Alert.alert(t('passwordUpdated'), t('canSignInNewPassword'), [{ text: t('continue'), onPress: () => router.replace('/') }]);
    } catch (error) {
      Alert.alert(t('updateFailed'), getAuthErrorMessage(error, 'password-update', language));
    } finally {
      setBusy(false);
    }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.page}>
    <View style={s.card}>
      <Text style={s.title}>{t('newPassword')}</Text>
      <Text style={s.subtitle}>{t('chooseNewPassword')}</Text>
      <View style={s.inputRow}><TextInput value={password} onChangeText={setPassword} placeholder={t('newPassword')} placeholderTextColor="#999" secureTextEntry={!showPassword} autoCapitalize="none" style={s.inputWithToggle} /><PasswordVisibilityToggle visible={showPassword} onPress={() => setShowPassword((visible) => !visible)} /></View>
      <View style={s.inputRow}><TextInput value={confirmation} onChangeText={setConfirmation} placeholder={t('confirmPassword')} placeholderTextColor="#999" secureTextEntry={!showConfirmation} autoCapitalize="none" style={s.inputWithToggle} /><PasswordVisibilityToggle visible={showConfirmation} onPress={() => setShowConfirmation((visible) => !visible)} /></View>
      <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [s.button, pressed && s.pressed, busy && s.disabled]}><Text style={s.buttonText}>{busy ? t('updating') : t('updatePassword')}</Text></Pressable>
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#e8e8e8', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 24, padding: 24, backgroundColor: '#e8e8e8', shadowColor: '#bcbcbc', shadowOpacity: .8, shadowRadius: 18, shadowOffset: { width: 10, height: 10 }, elevation: 8 },
  title: { color: '#4a4a4a', fontSize: 28, fontWeight: '700', textAlign: 'center' }, subtitle: { color: '#8f8f8f', fontSize: 12, textAlign: 'center', marginTop: 5, marginBottom: 24 },
  inputRow: { height: 46, flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: '#e8e8e8', marginBottom: 14, shadowColor: '#b2b2b2', shadowOpacity: .45, shadowRadius: 6, shadowOffset: { width: 4, height: 4 } },
  inputWithToggle: { flex: 1, height: 46, paddingLeft: 16, color: '#4a4a4a' },
  button: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#a10f0f', marginTop: 4 }, pressed: { opacity: .8 }, disabled: { opacity: .5 }, buttonText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: .8 },
});
