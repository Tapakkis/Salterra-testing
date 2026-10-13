import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAuthErrorMessage } from '@/lib/auth-error-message';
import { useAuthLanguage } from '@/lib/auth-language';
import { resendSignupCode, verifySignupCode } from '@/lib/auth';

const RESEND_DELAY_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { email: rawEmail, cooldown: rawCooldown } = useLocalSearchParams<{ email?: string; cooldown?: string }>();
  const email = (Array.isArray(rawEmail) ? rawEmail[0] : rawEmail)?.trim() ?? '';
  const { language, setLanguage, t } = useAuthLanguage();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(rawCooldown === '0' ? 0 : RESEND_DELAY_SECONDS);
  const [feedback, setFeedback] = useState<{ message: string; kind: 'error' | 'success' } | null>(null);
  const [codeInvalid, setCodeInvalid] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const verify = async () => {
    if (!/^\d{8}$/.test(code)) {
      setCodeInvalid(true);
      setFeedback({ message: t('codeRequired'), kind: 'error' });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const { error } = await verifySignupCode(email, code);
      if (error) throw error;
      router.replace('/');
    } catch (error) {
      setCodeInvalid(true);
      setFeedback({ message: getAuthErrorMessage(error, 'verify-signup-code', language), kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setFeedback(null);
    try {
      const { error } = await resendSignupCode(email);
      if (error) throw error;
      setCode('');
      setCodeInvalid(false);
      setSecondsLeft(RESEND_DELAY_SECONDS);
      setFeedback({ message: t('codeSent'), kind: 'success' });
    } catch (error) {
      setFeedback({ message: getAuthErrorMessage(error, 'resend-signup-code', language), kind: 'error' });
    } finally {
      setResending(false);
    }
  };

  const languageOptions = (['en', 'el'] as const);

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
    <View style={[styles.languageSwitch, { top: insets.top + 10 }]} accessibilityLabel={`${t('languageLabel')}: ${language === 'en' ? 'English' : 'Ελληνικά'}`}>
      {languageOptions.map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: language === option }} onPress={() => { setLanguage(option); setFeedback(null); }} style={[styles.languageButton, language === option && styles.languageButtonActive]}>
        <Text style={[styles.languageText, language === option && styles.languageTextActive]}>{option === 'en' ? 'EN' : 'ΕΛ'}</Text>
      </Pressable>)}
    </View>

    <View style={styles.card}>
      <Text style={styles.brand}>SALTERRA</Text>
      <View style={styles.icon}><Text style={styles.iconText}>@</Text></View>
      <Text style={styles.title}>{t('verifyEmailTitle')}</Text>
      <Text style={styles.subtitle}>{t('verifyEmailSubtitle')}</Text>
      <View style={styles.emailChip}><Text style={styles.email}>{email}</Text></View>

      {feedback && <View accessibilityLiveRegion="polite" style={[styles.feedback, feedback.kind === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
        <Text style={[styles.feedbackText, feedback.kind === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText]}>{feedback.message}</Text>
      </View>}

      <TextInput
        accessibilityLabel={t('verificationCode')}
        value={code}
        onChangeText={(value) => { setCode(value.replace(/\D/g, '').slice(0, 8)); setCodeInvalid(false); setFeedback(null); }}
        placeholder="••••••••"
        placeholderTextColor="#aaa"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        maxLength={8}
        autoFocus
        editable={!busy}
        style={[styles.codeInput, codeInvalid && styles.codeInputInvalid]}
      />

      <Pressable accessibilityRole="button" disabled={busy || !email} onPress={verify} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (busy || !email) && styles.disabled]}>
        <Text style={styles.primaryButtonText}>{busy ? t('verifyingCode') : t('verifyCode')}</Text>
      </Pressable>

      <Pressable accessibilityRole="button" disabled={secondsLeft > 0 || resending || !email} onPress={resend} style={styles.resendButton}>
        <Text style={[styles.resendText, (secondsLeft > 0 || resending || !email) && styles.resendDisabled]}>
          {resending ? t('resendingCode') : secondsLeft > 0 ? `${t('resendIn')} ${secondsLeft}${t('seconds')}` : t('resendCode')}
        </Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.backButton}>
        <Text style={styles.backText}>{t('backToSignIn')}</Text>
      </Pressable>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24, backgroundColor: '#eeedeb' },
  languageSwitch: { position: 'absolute', left: 20, zIndex: 2, flexDirection: 'row', padding: 4, borderRadius: 20, backgroundColor: '#f7f6f4', borderWidth: 1, borderColor: '#fff', shadowColor: '#77706b', shadowOpacity: .12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  languageButton: { minWidth: 42, height: 30, paddingHorizontal: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, languageButtonActive: { backgroundColor: '#a10f0f' }, languageText: { color: '#85817f', fontFamily: 'Poppins', fontSize: 10, fontWeight: '700', letterSpacing: .4 }, languageTextActive: { color: '#fff' },
  card: { width: '100%', maxWidth: 410, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, borderRadius: 28, backgroundColor: '#f7f6f4', borderWidth: 1, borderColor: '#fff', shadowColor: '#625b57', shadowOpacity: .14, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  brand: { marginBottom: 16, color: '#a10f0f', fontFamily: 'Poppins', fontSize: 10, fontWeight: '700', letterSpacing: 3 },
  icon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 15, backgroundColor: '#f4e7e5', borderWidth: 1, borderColor: '#fff' }, iconText: { color: '#a10f0f', fontFamily: 'Poppins', fontSize: 25, fontWeight: '700' },
  title: { color: '#393635', fontFamily: 'Poppins', fontSize: 27, fontWeight: '700', textAlign: 'center', letterSpacing: -.3 }, subtitle: { maxWidth: 290, marginTop: 7, color: '#797371', fontFamily: 'Poppins', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emailChip: { maxWidth: '100%', marginTop: 10, marginBottom: 20, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f3e9e7', borderWidth: 1, borderColor: '#fff' }, email: { color: '#941010', fontFamily: 'Poppins', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  feedback: { width: '100%', marginBottom: 14, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 13, borderWidth: 1 }, feedbackError: { backgroundColor: '#f8e9e8', borderColor: '#eed3d1' }, feedbackSuccess: { backgroundColor: '#eaf2e8', borderColor: '#d8e7d5' }, feedbackText: { fontFamily: 'Poppins', fontSize: 12, lineHeight: 18, textAlign: 'center' }, feedbackErrorText: { color: '#791010' }, feedbackSuccessText: { color: '#35643a' },
  codeInput: { width: '100%', height: 66, marginBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2d9d6', backgroundColor: '#fff', color: '#393635', textAlign: 'center', fontFamily: 'Poppins', fontSize: 26, fontWeight: '700', letterSpacing: 8, shadowColor: '#7b2925', shadowOpacity: .08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, codeInputInvalid: { borderColor: '#c53a3a', shadowColor: '#a10f0f', shadowOpacity: .18 },
  primaryButton: { width: '100%', minHeight: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: '#a10f0f', shadowColor: '#a10f0f', shadowOpacity: .2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, primaryButtonText: { color: '#fff', fontFamily: 'Poppins', fontSize: 13, fontWeight: '700', letterSpacing: .5 }, pressed: { opacity: .88, transform: [{ scale: .985 }] }, disabled: { opacity: .55 },
  resendButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 10 }, resendText: { color: '#941010', fontFamily: 'Poppins', fontSize: 12, fontWeight: '600' }, resendDisabled: { color: '#898381' }, backButton: { marginTop: 4, paddingHorizontal: 12, paddingVertical: 9 }, backText: { color: '#797371', fontFamily: 'Poppins', fontSize: 12, fontWeight: '500' },
});
