import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';

const DURATION = 2800;
const TAGLINE = 'THE SEA AWAITS';

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [typedTagline, setTypedTagline] = useState('');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let typingInterval: ReturnType<typeof setInterval> | undefined;

    SplashScreen.hideAsync().finally(() => {
      timer = setTimeout(() => setVisible(false), DURATION);
    });

    const typingTimer = setTimeout(() => {
      let index = 0;
      typingInterval = setInterval(() => {
        index += 1;
        setTypedTagline(TAGLINE.slice(0, index));
        if (index === TAGLINE.length && typingInterval) clearInterval(typingInterval);
      }, 75);
    }, 650);

    return () => {
      if (timer) clearTimeout(timer);
      clearTimeout(typingTimer);
      if (typingInterval) clearInterval(typingInterval);
    };
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.splashOverlay}>
      <View style={styles.wordmarkFrame}>
        <Image
          contentFit="contain"
          source={require('@/assets/images/salterra-wordmark.png')}
          style={styles.wordmark}
        />
      </View>
      <View style={styles.taglineWrap}>
        <Text style={styles.tagline}>
          {typedTagline}
          <Text style={styles.cursor}>|</Text>
        </Text>
      </View>
    </View>
  );
}

export function AnimatedIcon() {
  return <Image contentFit="contain" source={require('@/assets/images/salterra-app-icon.png')} style={styles.icon} />;
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    zIndex: 1000,
  },
  wordmarkFrame: {
    width: '90%',
    maxWidth: 720,
    aspectRatio: 2,
  },
  wordmark: { width: '100%', height: '100%' },
  taglineWrap: {
    marginTop: 12,
  },
  tagline: {
    color: '#111111',
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 3.8,
  },
  cursor: {
    color: '#c56a13',
    fontWeight: '300',
  },
  icon: { width: 132, height: 132 },
});
