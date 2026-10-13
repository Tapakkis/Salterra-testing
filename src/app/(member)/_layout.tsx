import { useEffect } from 'react';
import { Redirect, Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { palette, SignOutButton, useCopy } from '@/components/member-ui';
import { useAuthSession } from '@/hooks/use-auth-session';
import { hasProfessionalApproval, MemberProvider, useMember } from '@/lib/member-context';

export default function MemberLayout() {
  const { session, loading } = useAuthSession();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/" />;

  return (
    <MemberProvider key={session.user.id} session={session}>
      <MemberTabs />
    </MemberProvider>
  );
}

function MemberTabs() {
  const { profile, application, loading, error, refresh, session } = useMember();
  const copy = useCopy();
  const isActive = profile?.account_status === 'active';
  const canUseFishingTabs = isActive && (profile?.role === 'amateur' || profile?.role === 'professional');
  const canUseMarketTab = isActive && (
    profile?.role === 'buyer'
    || profile?.role === 'amateur'
    || (profile?.role === 'professional' && hasProfessionalApproval(profile, application))
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  if (loading) return <LoadingScreen />;
  if (error || !profile) {
    return <StatusScreen
      title={copy('Δεν φορτώθηκε το προφίλ σου', 'Your profile could not be loaded')}
      detail={copy('Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.', 'Check your connection and try again.')}
      retry={() => void refresh()}
    />;
  }
  if (!session.user.email_confirmed_at || profile.account_status === 'disabled' || profile.account_status === 'suspended') {
    return <StatusScreen
      title={copy('Ο λογαριασμός δεν είναι διαθέσιμος', 'Account unavailable')}
      detail={!session.user.email_confirmed_at
        ? copy('Επιβεβαίωσε πρώτα το email σου.', 'Confirm your email first.')
        : copy('Η πρόσβαση στον λογαριασμό έχει περιοριστεί.', 'Access to this account has been restricted.')}
      retry={() => void refresh()}
    />;
  }

  return (
    <Tabs tabBar={props => <AlignedTabBar {...props} />} screenOptions={{
      headerStyle: { backgroundColor: palette.page },
      headerShadowVisible: false,
      headerTitleAlign: 'left',
      headerTintColor: palette.ink,
      headerTitle: () => <Text style={styles.brand}>SALTERRA<Text style={styles.brandDot}>.</Text></Text>,
      headerRight: () => <SignOutButton />,
      headerRightContainerStyle: { paddingRight: 14 },
      headerTitleContainerStyle: { paddingLeft: 16 },
      tabBarActiveTintColor: palette.red,
      tabBarInactiveTintColor: palette.muted,
      sceneStyle: { backgroundColor: palette.page },
      tabBarHideOnKeyboard: true,
    }}>
      <Tabs.Screen name="home" options={{
        title: copy('Αρχική', 'Home'),
        tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="map" options={{
        title: copy('Χάρτης', 'Map'),
        href: canUseFishingTabs ? '/map' : null,
        tabBarIcon: ({ color, focused }) => <TabIcon name="map" color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="trips" options={{
        title: copy('Εξορμήσεις', 'Trips'),
        href: canUseFishingTabs ? '/trips' : null,
        tabBarIcon: ({ color, focused }) => <TabIcon name="compass" color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="market" options={{
        title: 'Market',
        href: canUseMarketTab ? '/market' : null,
        tabBarIcon: ({ color, focused }) => <TabIcon name="market" color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: copy('Προφίλ', 'Profile'),
        tabBarIcon: ({ color, focused }) => <TabIcon name="profile" color={color} focused={focused} />,
      }} />
    </Tabs>
  );
}

type TabIconName = 'home' | 'map' | 'compass' | 'market' | 'profile';

function TabIcon({ name, color, focused }: { name: TabIconName; color: ColorValue; focused: boolean }) {
  const icons: Record<TabIconName, [React.ComponentProps<typeof Ionicons>['name'], React.ComponentProps<typeof Ionicons>['name']]> = {
    home: ['home-outline', 'home'],
    map: ['map-outline', 'map'],
    compass: ['compass-outline', 'compass'],
    market: ['bag-handle-outline', 'bag-handle'],
    profile: ['person-outline', 'person'],
  };
  return <Ionicons name={icons[name][focused ? 1 : 0]} color={color} size={24} />;
}

function AlignedTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom, height: 62 + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const options = descriptors[route.key].options;
        if ('href' in options && options.href === null) return null;

        const focused = state.index === index;
        const color = focused ? palette.red : palette.muted;
        const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
        const icon = options.tabBarIcon?.({ focused, color, size: 24 });

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            accessibilityState={{ selected: focused }}
            testID={options.tabBarButtonTestID}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}>
            <View style={styles.tabIconSlot}>{icon}</View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '500' }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LoadingScreen() {
  return <View style={styles.center}><ActivityIndicator color={palette.red} /></View>;
}

function StatusScreen({ title, detail, retry }: { title: string; detail: string; retry: () => void }) {
  const copy = useCopy();
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
        <Text style={styles.retryText}>{copy('Δοκίμασε ξανά', 'Try again')}</Text>
      </Pressable>
      <SignOutButton />
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { color: palette.ink, fontSize: 15, fontWeight: '700', letterSpacing: 3 },
  brandDot: { color: palette.red },
  tabBar: {
    backgroundColor: palette.white,
    borderTopColor: palette.line,
    borderTopWidth: 1,
    shadowColor: '#77736f',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 6,
  },
  tabButton: { flex: 1, minWidth: 0, height: 62, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 1 },
  tabButtonPressed: { opacity: 0.65 },
  tabLabel: { width: '100%', fontSize: 10, lineHeight: 14, letterSpacing: 0, textAlign: 'center' },
  tabIconSlot: { width: 30, height: 27, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, backgroundColor: palette.page, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { color: palette.ink, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  detail: { color: palette.muted, fontSize: 15, textAlign: 'center' },
  retry: { backgroundColor: palette.red, borderRadius: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 22 },
  retryText: { color: palette.white, fontWeight: '700' },
});
