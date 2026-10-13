import { Pressable, StyleSheet, View } from 'react-native';
import { useAuthLanguage } from '@/lib/auth-language';

type PasswordVisibilityToggleProps = {
  visible: boolean;
  onPress: () => void;
};

export function PasswordVisibilityToggle({ visible, onPress }: PasswordVisibilityToggleProps) {
  const { t } = useAuthLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? t('hidePassword') : t('showPassword')}
      accessibilityHint={visible ? t('hidePasswordHint') : t('showPasswordHint')}
      hitSlop={8}
      onPress={onPress}
      style={styles.button}
    >
      <View style={[styles.buttonFace, visible && styles.buttonFaceActive]}>
        <View style={[styles.eye, visible && styles.eyeActive]}>
          <View style={[styles.pupil, visible && styles.pupilActive]} />
          {!visible && <View style={styles.slash} />}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  buttonFace: {
    width: 29,
    height: 29,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#b9b9b9',
    shadowOpacity: 0.55,
    shadowRadius: 3,
    shadowOffset: { width: 2, height: 2 },
    elevation: 2,
  },
  buttonFaceActive: { backgroundColor: '#f1e1e1', shadowColor: '#a10f0f' },
  eye: {
    width: 19,
    height: 13,
    borderWidth: 1.5,
    borderColor: '#858585',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeActive: { borderColor: '#a10f0f' },
  pupil: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#858585' },
  pupilActive: { backgroundColor: '#a10f0f' },
  slash: {
    position: 'absolute',
    width: 23,
    height: 1.5,
    backgroundColor: '#858585',
    transform: [{ rotate: '-40deg' }],
  },
});
