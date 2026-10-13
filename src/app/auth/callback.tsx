import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { supabase } from '@/lib/supabase';

function getCallbackParams(url: string) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));

  hashParams.forEach((value, key) => params.set(key, value));
  return params;
}

export default function AuthCallbackScreen() {
  const url = Linking.useLinkingURL();
  const processedUrl = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!url || processedUrl.current === url) return;
    processedUrl.current = url;

    let active = true;

    const completeAuth = async () => {
      try {
        if (!supabase) throw new Error('Supabase is not configured.');

        const params = getCallbackParams(url);
        const authError = params.get('error_description') ?? params.get('error');
        if (authError) throw new Error(authError);

        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (!accessToken || !refreshToken) {
            throw new Error('The confirmation link is incomplete or has expired.');
          }

          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        if (!active) return;
        router.replace(params.get('next') === 'reset-password' ? '/reset-password' : '/');
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Could not complete authentication.');
      }
    };

    void completeAuth();
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <View style={styles.page}>
      {errorMessage ? (
        <Text style={styles.message}>{errorMessage}</Text>
      ) : (
        <>
          <ActivityIndicator color="#a10f0f" />
          <Text style={styles.message}>Confirming your account...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#e8e8e8' },
  message: { marginTop: 14, color: '#4a4a4a', fontSize: 14, textAlign: 'center' },
});
