import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import 'expo-sqlite/localStorage/install';

export type AuthLanguage = 'en' | 'el';

const LANGUAGE_STORAGE_KEY = 'salterra.auth-language';

const copy = {
  en: {
    languageName: 'English', languageLabel: 'Language', loadingAccount: 'Loading account...', signedInUser: 'Signed-in user',
    welcome: 'Welcome', activeSessionNote: 'Your account session is active. The role-based home screen will be added in the next product stage.',
    signOut: 'Sign out', signingOut: 'Signing out...', signOutFailed: 'Could not sign out',
    login: 'Login', loginSubtitle: 'Sign in to your account', signup: 'Sign Up', signupSubtitle: 'Create your account', sendingReset: 'Sending reset link...',
    email: 'Email', password: 'Password', displayName: 'Display name', forgotPassword: 'Forgot password?',
    signIn: 'Sign In', signingIn: 'Signing in...', createAccount: 'Create Account', creating: 'Creating...',
    noAccount: "Don't have an account?", haveAccount: 'Already have an account?', checkEmail: 'Check your email',
    resetSent: 'If an account exists for this email, password reset instructions have been sent.',
    signedIn: 'Signed in', authSucceeded: 'Authentication succeeded. The home screen will be added in the next stage.',
    accountCreated: 'Account created', accountReady: 'Your account is ready.', confirmEmail: 'Confirm your email',
    confirmEmailBody: 'Check your email to confirm your account before signing in.',
    verifyEmailTitle: 'Verify your email', verifyEmailSubtitle: 'Enter the 8-digit code we sent to', verificationCode: '8-digit code',
    verifyCode: 'Verify email', verifyingCode: 'Verifying...', resendCode: 'Resend code', resendIn: 'Resend in', seconds: 's',
    resendingCode: 'Sending code...', codeSent: 'A new verification code has been sent.', codeRequired: 'Enter the 8-digit code from your email.',
    codeInvalid: 'That code is incorrect or has expired. Check it or request a new code.', verificationFailed: 'Could not verify your email. Please try again.',
    backToSignIn: 'Back to sign in', emailNotConfirmed: 'Please confirm your email before signing in. You can verify it with the code sent to your inbox.',
    verifyEmail: 'Enter confirmation code',
    enterEmail: 'Enter your email.', validEmail: 'Enter a valid email address.', enterPassword: 'Enter your password.',
    invalidCredentials: 'Email or password is incorrect.', displayNameTaken: 'That display name is already taken. Choose another one.',
    enterEmailForReset: 'Enter your email first, then tap Forgot password again.', enterDisplayName: 'Enter a display name.',
    displayNameLength: 'Your display name must be between 2 and 80 characters.', enterEmailAddress: 'Enter your email address.',
    enterSignupPassword: 'Enter a password.', passwordLength: 'Your password must contain at least 8 characters.',
    accountType: 'Account type', chooseAccountType: 'Choose account type', buyer: 'Buyer', amateur: 'Amateur', professional: 'Professional',
    professionalAccount: 'Professional account', professionalNotice: 'Choose this account type if you work in fishing professionally or provide fishing-related services. After signing up, you’ll need to submit a professional verification application with your valid professional license and the required details and documents. Your professional features will be available after your application is reviewed and approved.',
    showPassword: 'Show password', hidePassword: 'Hide password', showPasswordHint: 'Shows the password characters', hidePasswordHint: 'Hides the password characters',
    passwordTooShort: 'Password too short', useEightCharacters: 'Use at least 8 characters.', passwordsNoMatch: 'Passwords do not match',
    samePasswordTwice: 'Enter the same password twice.', newPassword: 'New password', chooseNewPassword: 'Choose a new password for your account',
    confirmPassword: 'Confirm password', updatePassword: 'Update password', updating: 'Updating...', passwordUpdated: 'Password updated',
    canSignInNewPassword: 'You can now sign in with your new password.', continue: 'Continue', updateFailed: 'Could not update password',
    invalidEmailError: 'Please enter a valid email address.', networkError: 'Check your internet connection and try again.',
  },
  el: {
    languageName: 'Ελληνικά', languageLabel: 'Γλώσσα', loadingAccount: 'Φόρτωση λογαριασμού...', signedInUser: 'Συνδεδεμένος χρήστης',
    welcome: 'Καλώς ήρθες', activeSessionNote: 'Ο λογαριασμός σου είναι ενεργός. Η αρχική οθόνη ανάλογα με τον τύπο λογαριασμού θα προστεθεί σε επόμενο στάδιο.',
    signOut: 'Αποσύνδεση', signingOut: 'Γίνεται αποσύνδεση...', signOutFailed: 'Δεν ήταν δυνατή η αποσύνδεση',
    login: 'Σύνδεση', loginSubtitle: 'Συνδέσου στον λογαριασμό σου', signup: 'Εγγραφή', signupSubtitle: 'Δημιούργησε λογαριασμό', sendingReset: 'Αποστέλλεται σύνδεσμος...',
    email: 'Email', password: 'Κωδικός πρόσβασης', displayName: 'Όνομα εμφάνισης', forgotPassword: 'Ξέχασες τον κωδικό;',
    signIn: 'Σύνδεση', signingIn: 'Γίνεται σύνδεση...', createAccount: 'Δημιουργία λογαριασμού', creating: 'Δημιουργείται...',
    noAccount: 'Δεν έχεις λογαριασμό;', haveAccount: 'Έχεις ήδη λογαριασμό;', checkEmail: 'Έλεγξε το email σου',
    resetSent: 'Αν υπάρχει λογαριασμός με αυτό το email, έχουν σταλεί οδηγίες επαναφοράς κωδικού.',
    signedIn: 'Συνδέθηκες', authSucceeded: 'Η σύνδεση πέτυχε. Η αρχική οθόνη θα προστεθεί σε επόμενο στάδιο.',
    accountCreated: 'Ο λογαριασμός δημιουργήθηκε', accountReady: 'Ο λογαριασμός σου είναι έτοιμος.', confirmEmail: 'Επιβεβαίωσε το email σου',
    confirmEmailBody: 'Έλεγξε το email σου για να επιβεβαιώσεις τον λογαριασμό πριν συνδεθείς.',
    verifyEmailTitle: 'Επιβεβαίωση email', verifyEmailSubtitle: 'Πληκτρολόγησε τον 8ψήφιο κωδικό που στάλθηκε στο', verificationCode: '8ψήφιος κωδικός',
    verifyCode: 'Επιβεβαίωση email', verifyingCode: 'Γίνεται επαλήθευση...', resendCode: 'Νέα αποστολή κωδικού', resendIn: 'Νέα αποστολή σε', seconds: '″',
    resendingCode: 'Γίνεται αποστολή κωδικού...', codeSent: 'Στάλθηκε νέος κωδικός επιβεβαίωσης.', codeRequired: 'Πληκτρολόγησε τον 8ψήφιο κωδικό από το email σου.',
    codeInvalid: 'Ο κωδικός είναι λανθασμένος ή έχει λήξει. Έλεγξέ τον ή ζήτησε νέο κωδικό.', verificationFailed: 'Δεν ήταν δυνατή η επιβεβαίωση του email. Δοκίμασε ξανά.',
    backToSignIn: 'Επιστροφή στη σύνδεση', emailNotConfirmed: 'Επιβεβαίωσε το email σου πριν συνδεθείς. Μπορείς να το επαληθεύσεις με τον κωδικό στα εισερχόμενά σου.',
    verifyEmail: 'Εισαγωγή κωδικού επιβεβαίωσης',
    enterEmail: 'Συμπλήρωσε το email σου.', validEmail: 'Συμπλήρωσε μια έγκυρη διεύθυνση email.', enterPassword: 'Συμπλήρωσε τον κωδικό πρόσβασης.',
    invalidCredentials: 'Το email ή ο κωδικός πρόσβασης είναι λανθασμένος.', displayNameTaken: 'Αυτό το όνομα εμφάνισης χρησιμοποιείται ήδη. Επίλεξε κάποιο άλλο.',
    enterEmailForReset: 'Συμπλήρωσε πρώτα το email σου και πάτησε ξανά «Ξέχασες τον κωδικό;».', enterDisplayName: 'Συμπλήρωσε ένα όνομα εμφάνισης.',
    displayNameLength: 'Το όνομα εμφάνισης πρέπει να έχει από 2 έως 80 χαρακτήρες.', enterEmailAddress: 'Συμπλήρωσε τη διεύθυνση email σου.',
    enterSignupPassword: 'Συμπλήρωσε έναν κωδικό πρόσβασης.', passwordLength: 'Ο κωδικός πρόσβασης πρέπει να έχει τουλάχιστον 8 χαρακτήρες.',
    accountType: 'Τύπος λογαριασμού', chooseAccountType: 'Επίλεξε τύπο λογαριασμού', buyer: 'Αγοραστής', amateur: 'Ερασιτέχνης', professional: 'Επαγγελματίας',
    professionalAccount: 'Επαγγελματικός λογαριασμός', professionalNotice: 'Επίλεξε αυτόν τον τύπο λογαριασμού αν εργάζεσαι επαγγελματικά στον χώρο της αλιείας ή παρέχεις σχετικές υπηρεσίες. Μετά την εγγραφή, θα χρειαστεί να υποβάλεις αίτηση επαγγελματικής επαλήθευσης με την έγκυρη επαγγελματική σου άδεια και τα απαιτούμενα στοιχεία και έγγραφα. Οι επαγγελματικές λειτουργίες θα είναι διαθέσιμες αφού η αίτησή σου ελεγχθεί και εγκριθεί.',
    showPassword: 'Εμφάνιση κωδικού', hidePassword: 'Απόκρυψη κωδικού', showPasswordHint: 'Εμφανίζει τους χαρακτήρες του κωδικού', hidePasswordHint: 'Κρύβει τους χαρακτήρες του κωδικού',
    passwordTooShort: 'Ο κωδικός είναι πολύ σύντομος', useEightCharacters: 'Χρησιμοποίησε τουλάχιστον 8 χαρακτήρες.', passwordsNoMatch: 'Οι κωδικοί δεν ταιριάζουν',
    samePasswordTwice: 'Πληκτρολόγησε τον ίδιο κωδικό και στα δύο πεδία.', newPassword: 'Νέος κωδικός πρόσβασης', chooseNewPassword: 'Επίλεξε νέο κωδικό πρόσβασης για τον λογαριασμό σου',
    confirmPassword: 'Επιβεβαίωση κωδικού', updatePassword: 'Αλλαγή κωδικού', updating: 'Γίνεται αλλαγή...', passwordUpdated: 'Ο κωδικός άλλαξε',
    canSignInNewPassword: 'Μπορείς τώρα να συνδεθείς με τον νέο κωδικό.', continue: 'Συνέχεια', updateFailed: 'Δεν ήταν δυνατή η αλλαγή κωδικού',
    invalidEmailError: 'Συμπλήρωσε μια έγκυρη διεύθυνση email.', networkError: 'Έλεγξε τη σύνδεσή σου στο διαδίκτυο και δοκίμασε ξανά.',
  },
} as const;

export type AuthCopyKey = keyof typeof copy.en;

type LanguageContextValue = {
  language: AuthLanguage;
  setLanguage: (language: AuthLanguage) => void;
  t: (key: AuthCopyKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): AuthLanguage {
  try {
    const saved = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'el') return saved;
  } catch {
    // Storage can be unavailable in private web sessions; use the device locale.
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('el') ? 'el' : 'en';
  } catch {
    return 'en';
  }
}

export function AuthLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AuthLanguage>(getInitialLanguage);
  const setLanguage = useCallback((next: AuthLanguage) => {
    setLanguageState(next);
    try {
      globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Keep the selection for this app session even if persistent storage is unavailable.
    }
  }, []);
  const t = useCallback((key: AuthCopyKey) => copy[language][key], [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAuthLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useAuthLanguage must be used within AuthLanguageProvider.');
  return value;
}
