import { useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Alert, Pressable, type ColorValue } from 'react-native';

import { signOut } from '@/lib/auth';
import { useAuthLanguage } from '@/lib/auth-language';

export const palette = {
  page: '#e8e8e8',
  ink: '#4a4a4a',
  muted: '#77736f',
  red: '#a10f0f',
  line: '#ffffff',
  white: '#f4f3f1',
};

export function useCopy() {
  const { language } = useAuthLanguage();
  return (el: string, en: string) => language === 'el' ? el : en;
}

export function Icon({ name, color = palette.ink, size = 22 }: {
  name: React.ComponentProps<typeof Feather>['name'];
  color?: ColorValue;
  size?: number;
}) {
  return <Feather name={name} size={size} color={color} />;
}

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const copy = useCopy();

  async function handleSignOut() {
    setBusy(true);
    try {
      const { error } = await signOut();
      if (error) throw error;
    } catch {
      Alert.alert(copy('Δεν έγινε αποσύνδεση', 'Could not sign out'), copy('Δοκίμασε ξανά.', 'Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy('Αποσύνδεση', 'Sign out')}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={() => void handleSignOut()}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed || busy ? 0.55 : 1,
      })}>
      {busy ? <ActivityIndicator color={palette.red} /> : <Icon name="log-out" color={palette.red} size={21} />}
    </Pressable>
  );
}
