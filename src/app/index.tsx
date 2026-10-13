import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAuthRedirectUrl, sendPasswordResetEmail, signInWithEmail, signUpWithEmail } from '@/lib/auth';
import { getAuthErrorMessage } from '@/lib/auth-error-message';
import { useAuthLanguage } from '@/lib/auth-language';
import { useAuthSession } from '@/hooks/use-auth-session';
import { PasswordVisibilityToggle } from '@/components/password-visibility-toggle';

const C = { page: '#e8e8e8', text: '#4a4a4a', muted: '#929191', red: '#a10f0f' };
type UserCategory = 'buyer' | 'amateur' | 'professional';

export default function HomeScreen() {
  const { language, setLanguage, t } = useAuthLanguage();
  const { session, loading } = useAuthSession();
  const [signup, setSignup] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [category, setCategory] = useState<UserCategory>('amateur');
  const safeAreaInsets = useSafeAreaInsets();
  const [rotation] = useState(() => new Animated.Value(0));
  const { width } = useWindowDimensions();
  const diameter = Math.min(width * 0.98, 520);
  const changeMode = (next: boolean) => {
    if (isFlipping) return;
    setNotice(null);
    setIsFlipping(true);
    Animated.timing(rotation, { toValue: next ? 1 : 0, duration: 460, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setSignup(next);
      setIsFlipping(false);
    });
  };
  const frontRotation = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotation = rotation.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  if (loading) return <View style={s.loadingPage}><Text style={s.loadingText}>{t('loadingAccount')}</Text></View>;
  if (session) return <Redirect href="/home" />;

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.page}>
    <LanguageSwitcher language={language} onChange={(next) => { setLanguage(next); setNotice(null); }} label={t('languageLabel')} top={safeAreaInsets.top + 9} />
    {notice && <NoticeBanner message={notice} top={safeAreaInsets.top + 55} />}
    <ScrollView
      canCancelContentTouches={false}
      contentContainerStyle={s.scroll}
      disableScrollViewPanResponder
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}>
      <View style={[s.scene, { width: diameter, height: diameter }]}>
        <Animated.View pointerEvents={isFlipping || signup ? 'none' : 'auto'} style={[s.circle, !isFlipping && signup && s.hiddenFace, isFlipping && { transform: [{ perspective: 1800 }, { rotateY: frontRotation }] }]}>
          <View pointerEvents="none" style={s.ring} /><Login onSignup={() => changeMode(true)} onNotice={setNotice} />
        </Animated.View>
        <Animated.View pointerEvents={isFlipping || !signup ? 'none' : 'auto'} style={[s.circle, !isFlipping && !signup && s.hiddenFace, isFlipping && { transform: [{ perspective: 1800 }, { rotateY: backRotation }] }]}>
          <View pointerEvents="none" style={s.ring} /><Signup category={category} onCategoryChange={setCategory} onLogin={() => changeMode(false)} onNotice={setNotice} />
        </Animated.View>
      </View>
    </ScrollView>
    {signup && category === 'professional' && <ProfessionalNotice bottom={safeAreaInsets.bottom + 14} />}
  </KeyboardAvoidingView>;
}

function Login({ onSignup, onNotice }: { onSignup: () => void; onNotice: (message: string | null) => void }) {
  const { language, t } = useAuthLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [invalidFields, setInvalidFields] = useState({ email: false, password: false });
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setInvalidFields({ email: true, password: false });
      onNotice(t('enterEmail'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setInvalidFields({ email: true, password: false });
      onNotice(t('validEmail'));
      return;
    }
    if (!password) {
      setInvalidFields({ email: false, password: true });
      onNotice(t('enterPassword'));
      return;
    }
    setInvalidFields({ email: false, password: false });
    onNotice(null);
    setBusy(true);
    try {
      const { error } = await signInWithEmail(email, password);
      if (error) throw error;
      setNeedsVerification(false);
      Alert.alert(t('signedIn'), t('authSucceeded'));
    } catch (error) {
      const message = getAuthErrorMessage(error, 'sign-in', language);
      setNeedsVerification(message === t('emailNotConfirmed'));
      const invalidCredentials = message === t('invalidCredentials');
      setInvalidFields({ email: invalidCredentials, password: invalidCredentials });
      onNotice(message);
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (resetBusy) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setInvalidFields({ email: true, password: false });
      onNotice(t('enterEmailForReset'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setInvalidFields({ email: true, password: false });
      onNotice(t('validEmail'));
      return;
    }
    setInvalidFields({ email: false, password: false });
    onNotice(null);
    setResetBusy(true);
    try {
      const { error } = await sendPasswordResetEmail(email, getAuthRedirectUrl('reset-password'));
      if (error) throw error;
      Alert.alert(t('checkEmail'), t('resetSent'));
    } catch (error) {
      onNotice(getAuthErrorMessage(error, 'password-reset-email', language));
    } finally {
      setResetBusy(false);
    }
  };

  return <Form title={t('login')} subtitle={t('loginSubtitle')}>
    <Field value={email} onChangeText={(value) => { setEmail(value); setNeedsVerification(false); setInvalidFields({ email: false, password: false }); onNotice(null); }} placeholder={t('email')} icon="@" keyboardType="email-address" hasError={invalidFields.email} /><Field value={password} onChangeText={(value) => { setPassword(value); setNeedsVerification(false); setInvalidFields({ email: false, password: false }); onNotice(null); }} placeholder={t('password')} icon="#" secureTextEntry showPassword={showPassword} onTogglePassword={() => setShowPassword((visible) => !visible)} hasError={invalidFields.password} />
    <View style={s.forgot}><Pressable accessibilityRole="button" disabled={resetBusy} onPress={forgotPassword} style={({ pressed }) => [s.forgotAction, pressed && s.forgotActionPressed, resetBusy && s.forgotActionBusy]}><Text style={[s.small, s.forgotActionText, resetBusy && s.forgotActionTextActive]}>{resetBusy ? t('sendingReset') : t('forgotPassword')}</Text></Pressable></View>
    <Button label={busy ? t('signingIn') : t('signIn')} onPress={submit} disabled={busy} />
    {needsVerification && <Pressable onPress={() => router.push({ pathname: '/verify-email', params: { email: email.trim().toLowerCase(), cooldown: '0' } })} style={s.verifyLink}><Text style={s.link}>{t('verifyEmail')}</Text></Pressable>}
    <View style={s.signup}><Text style={s.small}>{t('noAccount')} </Text><Pressable onPress={onSignup}><Text style={s.link}>{t('signup')}</Text></Pressable></View>
  </Form>;
}

function Signup({ category, onCategoryChange, onLogin, onNotice }: { category: UserCategory; onCategoryChange: (category: UserCategory) => void; onLogin: () => void; onNotice: (message: string | null) => void }) {
  const { language, t } = useAuthLanguage();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [invalidFields, setInvalidFields] = useState({ displayName: false, email: false, password: false });
  const [busy, setBusy] = useState(false);

  const showFieldError = (field: keyof typeof invalidFields, message: string) => {
    setInvalidFields({ displayName: false, email: false, password: false, [field]: true });
    onNotice(message);
  };

  const submit = async () => {
    const normalizedDisplayName = displayName.trim();
    const normalizedEmail = email.trim();
    if (!normalizedDisplayName) {
      showFieldError('displayName', t('enterDisplayName'));
      return;
    }
    if (normalizedDisplayName.length < 2 || normalizedDisplayName.length > 80) {
      showFieldError('displayName', t('displayNameLength'));
      return;
    }
    if (!normalizedEmail) {
      showFieldError('email', t('enterEmailAddress'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showFieldError('email', t('validEmail'));
      return;
    }
    if (!password) {
      showFieldError('password', t('enterSignupPassword'));
      return;
    }
    if (password.length < 8) {
      showFieldError('password', t('passwordLength'));
      return;
    }
    setInvalidFields({ displayName: false, email: false, password: false });
    onNotice(null);
    setBusy(true);
    try {
      const { data, error } = await signUpWithEmail({ displayName, email, password, category });
      if (error) throw error;
      if (data.session) {
        Alert.alert(t('accountCreated'), t('accountReady'));
      } else {
        router.push({ pathname: '/verify-email', params: { email: normalizedEmail.toLowerCase() } });
      }
    } catch (error) {
      const message = getAuthErrorMessage(error, 'sign-up', language);
      if (message === t('displayNameTaken')) {
        setInvalidFields({ displayName: true, email: false, password: false });
      }
      onNotice(message);
    } finally {
      setBusy(false);
    }
  };

  return <Form title={t('signup')} subtitle={t('signupSubtitle')}>
    <Field value={displayName} onChangeText={(value) => { setDisplayName(value); setInvalidFields((current) => ({ ...current, displayName: false })); onNotice(null); }} placeholder={t('displayName')} icon="o" hasError={invalidFields.displayName} /><Field value={email} onChangeText={(value) => { setEmail(value); setInvalidFields((current) => ({ ...current, email: false })); onNotice(null); }} placeholder={t('email')} icon="@" keyboardType="email-address" hasError={invalidFields.email} /><Field value={password} onChangeText={(value) => { setPassword(value); setInvalidFields((current) => ({ ...current, password: false })); onNotice(null); }} placeholder={t('password')} icon="#" secureTextEntry showPassword={showPassword} onTogglePassword={() => setShowPassword((visible) => !visible)} hasError={invalidFields.password} />
    <CategoryPicker value={category} onChange={onCategoryChange} />
    <Button label={busy ? t('creating') : t('createAccount')} onPress={submit} disabled={busy} /><View style={s.signup}><Text style={s.small}>{t('haveAccount')} </Text><Pressable onPress={onLogin}><Text style={s.link}>{t('login')}</Text></Pressable></View>
  </Form>;
}

function ProfessionalNotice({ bottom }: { bottom: number }) {
  const { t } = useAuthLanguage();
  return <View accessibilityLiveRegion="polite" style={[s.professionalNotice, { bottom }]}>
    <View style={s.professionalNoticeIcon}><Text style={s.professionalNoticeIconText}>i</Text></View>
    <View style={s.professionalNoticeContent}>
      <Text style={s.professionalNoticeTitle}>{t('professionalAccount')}</Text>
      <Text style={s.professionalNoticeText}>{t('professionalNotice')}</Text>
    </View>
  </View>;
}

function CategoryPicker({ value, onChange }: { value: UserCategory; onChange: (category: UserCategory) => void }) {
  const { t } = useAuthLanguage();
  const [open, setOpen] = useState(false);
  const options: [UserCategory, 'buyer' | 'amateur' | 'professional'][] = [['buyer', 'buyer'], ['amateur', 'amateur'], ['professional', 'professional']];
  const selectedLabel = t(options.find(([key]) => key === value)?.[1] ?? 'amateur');
  return <>
    <Pressable onPress={() => setOpen(true)} style={s.categorySelector}><Text style={s.categoryLabel}>{t('accountType')}</Text><Text style={s.categoryValue}>{selectedLabel}</Text><Text style={s.categoryChevron}>⌄</Text></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={s.modalBackdrop}>
        <Pressable accessibilityLabel={t('chooseAccountType')} style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View style={s.categoryModal}><Text style={s.modalTitle}>{t('chooseAccountType')}</Text>{options.map(([key, translationKey]) => <Pressable accessibilityRole="button" key={key} onPress={() => { onChange(key); setOpen(false); }} style={[s.modalOption, value === key && s.modalOptionSelected]}><Text style={[s.modalOptionText, value === key && s.modalOptionTextSelected]}>{t(translationKey)}</Text></Pressable>)}</View>
      </View>
    </Modal>
  </>;
}

function LanguageSwitcher({ language, onChange, label, top }: { language: 'en' | 'el'; onChange: (language: 'en' | 'el') => void; label: string; top: number }) {
  return <View accessibilityLabel={`${label}: ${language === 'en' ? 'English' : 'Ελληνικά'}`} style={[s.languageSwitcher, { top }]}>
    {(['en', 'el'] as const).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: language === option }} onPress={() => onChange(option)} style={[s.languageOption, language === option && s.languageOptionSelected]}>
      <Text style={[s.languageOptionText, language === option && s.languageOptionTextSelected]}>{option === 'en' ? 'EN' : 'ΕΛ'}</Text>
    </Pressable>)}
  </View>;
}
function Form({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <View style={s.form}><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text>{children}</View>; }
function NoticeBanner({ message, top }: { message: string; top: number }) { return <View accessibilityLiveRegion="polite" style={[s.notice, { top }]}><View style={s.noticeIcon}><Text style={s.noticeIconText}>!</Text></View><Text style={s.noticeText}>{message}</Text></View>; }
function Field({ value, onChangeText, placeholder, icon, secureTextEntry, showPassword, onTogglePassword, keyboardType, hasError }: { value: string; onChangeText: (value: string) => void; placeholder: string; icon: string; secureTextEntry?: boolean; showPassword?: boolean; onTogglePassword?: () => void; keyboardType?: 'email-address'; hasError?: boolean }) { const [focused, setFocused] = useState(false); return <View style={[s.inputBox, focused && s.focused, hasError && s.inputError]}><Text style={[s.icon, (focused || hasError) && s.iconFocused]}>{icon}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#a3a3a3" secureTextEntry={secureTextEntry && !showPassword} keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={s.input} />{secureTextEntry && onTogglePassword && <PasswordVisibilityToggle visible={Boolean(showPassword)} onPress={onTogglePassword} />}</View>; }
function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) { const [pressed, setPressed] = useState(false); return <Pressable disabled={disabled} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} style={[s.button, pressed && s.buttonPressed, disabled && s.buttonDisabled]}><Text style={[s.buttonText, pressed && s.buttonTextPressed]}>{label}</Text></Pressable>; }

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.page }, scroll: { flexGrow: 1, minHeight: 620, alignItems: 'center', justifyContent: 'center', paddingVertical: 28 }, scene: { position: 'relative' },
  languageSwitcher: { position: 'absolute', left: 18, zIndex: 30, flexDirection: 'row', alignItems: 'center', padding: 3, borderRadius: 18, backgroundColor: '#e8e8e8', borderWidth: 1, borderColor: 'rgba(255,255,255,.85)', shadowColor: '#b5b5b5', shadowOpacity: .45, shadowRadius: 6, shadowOffset: { width: 2, height: 3 }, elevation: 4 }, languageOption: { minWidth: 38, height: 26, paddingHorizontal: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, languageOptionSelected: { backgroundColor: C.red }, languageOptionText: { color: C.muted, fontFamily: 'Poppins', fontSize: 10, fontWeight: '700', letterSpacing: .3 }, languageOptionTextSelected: { color: '#fff' },
  loadingPage: { flex: 1, backgroundColor: C.page, alignItems: 'center', justifyContent: 'center' }, loadingText: { color: C.muted, fontFamily: 'Poppins', fontSize: 13 },
  signedInPage: { flex: 1, backgroundColor: C.page, alignItems: 'center', justifyContent: 'center', padding: 24 }, signedInCard: { width: '100%', maxWidth: 380, padding: 28, borderRadius: 24, alignItems: 'center', backgroundColor: C.page, shadowColor: '#bdbdbd', shadowOpacity: .8, shadowRadius: 20, shadowOffset: { width: 10, height: 10 }, elevation: 8 }, signedInTitle: { color: C.text, fontFamily: 'Poppins', fontSize: 30, fontWeight: '700' }, signedInEmail: { color: C.red, fontFamily: 'Poppins', fontSize: 13, marginTop: 6 }, signedInNote: { color: C.muted, fontFamily: 'Poppins', fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 20, marginBottom: 24 }, signOutButton: { width: '100%', height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red }, signOutText: { color: '#fff', fontFamily: 'Poppins', fontSize: 13, fontWeight: '700' },
  circle: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: C.page, borderWidth: 1, borderColor: 'rgba(255,255,255,.65)', shadowColor: '#c3c3c3', shadowOpacity: .95, shadowRadius: 28, shadowOffset: { width: 18, height: 20 }, elevation: 14, backfaceVisibility: 'hidden' }, hiddenFace: { display: 'none' },
  ring: { position: 'absolute', top: 12, right: 12, bottom: 12, left: 12, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,.65)' }, form: { position: 'relative', width: '70%', maxWidth: 290, zIndex: 2, transform: [{ translateY: -6 }] },
  notice: { position: 'absolute', left: 18, right: 78, zIndex: 20, minHeight: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', borderLeftWidth: 4, borderLeftColor: C.red, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f4e7e7', shadowColor: C.red, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  noticeIcon: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: '#ecd2d2' }, noticeIconText: { color: C.red, fontFamily: 'Poppins', fontSize: 17, fontWeight: '700', lineHeight: 22 }, noticeText: { flex: 1, color: '#791010', fontFamily: 'Poppins', fontSize: 13, lineHeight: 19, fontWeight: '500' },
  title: { color: C.text, fontFamily: 'Poppins', fontSize: 32, fontWeight: '700', letterSpacing: .5, textAlign: 'center', textShadowColor: '#fff', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 }, subtitle: { color: '#9a9a9a', fontFamily: 'Poppins', fontSize: 12, fontWeight: '500', letterSpacing: .3, textAlign: 'center', marginTop: 1, marginBottom: 8 },
  inputBox: { height: 36, marginBottom: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: C.page, shadowColor: '#aeb4bd', shadowOpacity: .42, shadowRadius: 7, shadowOffset: { width: 5, height: 5 }, elevation: 3 }, focused: { shadowColor: C.red, shadowOpacity: .38, shadowRadius: 7, shadowOffset: { width: 0, height: 0 } }, inputError: { borderWidth: 1, borderColor: '#c53a3a', shadowColor: C.red, shadowOpacity: .3, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3 }, icon: { width: 36, color: '#909090', fontSize: 12, textAlign: 'center' }, iconFocused: { color: C.red }, input: { flex: 1, color: C.text, fontFamily: 'Poppins', fontSize: 12.5, fontWeight: '500', paddingVertical: 0, paddingRight: 10 },
  forgot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 1, marginBottom: 15 }, forgotAction: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 9 }, forgotActionPressed: { backgroundColor: '#f3e5e5', transform: [{ scale: .98 }] }, forgotActionBusy: { backgroundColor: '#f3e5e5' }, forgotActionText: { fontWeight: '600' }, forgotActionTextActive: { color: C.red }, verifyLink: { alignItems: 'center', marginTop: 8 }, small: { color: C.muted, fontFamily: 'Poppins', fontSize: 10 },
  button: { height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.page, shadowColor: '#c4c4c4', shadowOpacity: .9, shadowRadius: 9, shadowOffset: { width: 7, height: 7 }, elevation: 5 }, buttonPressed: { backgroundColor: C.red, transform: [{ scale: .97 }], shadowColor: C.red }, buttonDisabled: { opacity: .55 }, buttonText: { color: '#838383', fontFamily: 'Poppins', fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }, buttonTextPressed: { color: '#f5e9c8' }, signup: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }, link: { color: C.red, fontFamily: 'Poppins', fontSize: 10, fontWeight: '600' },
  categorySelector: { height: 32, marginTop: -1, marginBottom: 8, borderRadius: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: C.page, shadowColor: '#c4c4c4', shadowOpacity: .55, shadowRadius: 5, shadowOffset: { width: 3, height: 3 }, elevation: 2 }, categoryLabel: { flex: 1, color: C.muted, fontFamily: 'Poppins', fontSize: 10 }, categoryValue: { color: C.text, fontFamily: 'Poppins', fontSize: 10, fontWeight: '600' }, categoryChevron: { color: C.red, fontSize: 16, marginLeft: 7, marginTop: -3 },
  professionalNotice: { position: 'absolute', left: 18, right: 18, zIndex: 15, flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 15, paddingVertical: 13, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,.95)', borderLeftWidth: 4, borderLeftColor: '#a77d35', backgroundColor: '#f1ece3', shadowColor: '#9c8b6c', shadowOpacity: .2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 }, professionalNoticeIcon: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 11, backgroundColor: '#e7dac2' }, professionalNoticeIconText: { color: '#876322', fontFamily: 'Poppins', fontSize: 15, fontWeight: '700' }, professionalNoticeContent: { flex: 1 }, professionalNoticeTitle: { color: '#604b29', fontFamily: 'Poppins', fontSize: 13, fontWeight: '700', marginBottom: 3 }, professionalNoticeText: { color: '#665d50', fontFamily: 'Poppins', fontSize: 11.5, lineHeight: 17 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.35)', alignItems: 'center', justifyContent: 'center', padding: 24 }, categoryModal: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 20, backgroundColor: C.page, shadowColor: '#000', shadowOpacity: .25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 }, modalTitle: { color: C.text, fontFamily: 'Poppins', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 14 }, modalOption: { height: 42, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginTop: 8, backgroundColor: C.page, shadowColor: '#c4c4c4', shadowOpacity: .5, shadowRadius: 5, shadowOffset: { width: 3, height: 3 } }, modalOptionSelected: { backgroundColor: C.red }, modalOptionText: { color: C.muted, fontFamily: 'Poppins', fontSize: 12 }, modalOptionTextSelected: { color: '#f5e9c8', fontWeight: '600' },
});
