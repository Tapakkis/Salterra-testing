import type { AuthLanguage } from './auth-language';

export type AuthErrorContext = 'sign-in' | 'sign-up' | 'verify-signup-code' | 'resend-signup-code' | 'password-reset-email' | 'password-update' | 'sign-out';

const fallbackMessages: Record<AuthErrorContext, string> = {
  'sign-in': 'Could not sign in. Check your details and try again.',
  'sign-up': 'Could not create your account. Please try again.',
  'verify-signup-code': 'Could not verify your email. Please try again.',
  'resend-signup-code': 'Could not send a new verification code. Please try again later.',
  'password-reset-email': 'Could not send the reset email. Please try again later.',
  'password-update': 'Could not update your password. The reset link may have expired.',
  'sign-out': 'Could not sign out. Please try again.',
};

const greekMessages: Record<string, string> = {
  'Could not sign in. Check your details and try again.': 'Δεν ήταν δυνατή η σύνδεση. Έλεγξε τα στοιχεία σου και δοκίμασε ξανά.',
  'Could not create your account. Please try again.': 'Δεν ήταν δυνατή η δημιουργία λογαριασμού. Δοκίμασε ξανά.',
  'Could not verify your email. Please try again.': 'Δεν ήταν δυνατή η επιβεβαίωση του email. Δοκίμασε ξανά.',
  'Please confirm your email before signing in. You can verify it with the code sent to your inbox.': 'Επιβεβαίωσε το email σου πριν συνδεθείς. Μπορείς να το επαληθεύσεις με τον κωδικό στα εισερχόμενά σου.',
  'Could not send a new verification code. Please try again later.': 'Δεν ήταν δυνατή η αποστολή νέου κωδικού. Δοκίμασε ξανά αργότερα.',
  'That code is incorrect or has expired. Check it or request a new code.': 'Ο κωδικός είναι λανθασμένος ή έχει λήξει. Έλεγξέ τον ή ζήτησε νέο κωδικό.',
  'Could not send the reset email. Please try again later.': 'Δεν ήταν δυνατή η αποστολή email επαναφοράς. Δοκίμασε ξανά αργότερα.',
  'Could not update your password. The reset link may have expired.': 'Δεν ήταν δυνατή η αλλαγή κωδικού. Ο σύνδεσμος επαναφοράς ίσως έχει λήξει.',
  'Could not sign out. Please try again.': 'Δεν ήταν δυνατή η αποσύνδεση. Δοκίμασε ξανά.',
  'That display name is already taken. Choose another one.': 'Αυτό το όνομα εμφάνισης χρησιμοποιείται ήδη. Επίλεξε κάποιο άλλο.',
  'An account with this email already exists. Try signing in instead.': 'Υπάρχει ήδη λογαριασμός με αυτό το email. Δοκίμασε να συνδεθείς.',
  'Email or password is incorrect.': 'Το email ή ο κωδικός πρόσβασης είναι λανθασμένος.',
  'Please confirm your email before signing in. Check your inbox for the confirmation link.': 'Επιβεβαίωσε το email σου πριν συνδεθείς. Έλεγξε τα εισερχόμενά σου για τον σύνδεσμο επιβεβαίωσης.',
  'Enter a valid email address.': 'Συμπλήρωσε μια έγκυρη διεύθυνση email.',
  'Choose a stronger password with at least 8 characters.': 'Επίλεξε ισχυρότερο κωδικό με τουλάχιστον 8 χαρακτήρες.',
  'Too many sign-in attempts. Please wait a little and try again.': 'Έγιναν πολλές προσπάθειες σύνδεσης. Περίμενε λίγο και δοκίμασε ξανά.',
  'Too many requests. Please wait a little before trying again.': 'Έγιναν πάρα πολλά αιτήματα. Περίμενε λίγο πριν δοκιμάσεις ξανά.',
  'Connection problem. Check your internet and try again.': 'Πρόβλημα σύνδεσης. Έλεγξε το διαδίκτυο και δοκίμασε ξανά.',
  'The service is temporarily unavailable. Please try again in a moment.': 'Η υπηρεσία δεν είναι προσωρινά διαθέσιμη. Δοκίμασε ξανά σε λίγο.',
  'The password reset link has expired or is no longer valid. Request a new one.': 'Ο σύνδεσμος επαναφοράς κωδικού έληξε ή δεν είναι πλέον έγκυρος. Ζήτησε νέο σύνδεσμο.',
};

export function getAuthErrorMessage(error: unknown, context: AuthErrorContext, language: AuthLanguage = 'en'): string {
  const message = getEnglishAuthErrorMessage(error, context);
  return language === 'el' ? greekMessages[message] ?? 'Παρουσιάστηκε σφάλμα. Δοκίμασε ξανά.' : message;
}

function getEnglishAuthErrorMessage(error: unknown, context: AuthErrorContext): string {
  const fields = error && typeof error === 'object'
    ? error as { code?: unknown; status?: unknown; message?: unknown; details?: unknown; hint?: unknown }
    : {};
  const code = typeof fields.code === 'string' ? fields.code.toLowerCase() : '';
  const status = typeof fields.status === 'number' ? fields.status : undefined;
  const message = error instanceof Error
    ? error.message.toLowerCase()
    : typeof fields.message === 'string'
      ? fields.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';
  const extra = [fields.details, fields.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  const allText = `${message} ${extra}`;

  if (allText.includes('profiles_display_name_unique_idx')) {
    return 'That display name is already taken. Choose another one.';
  }
  if (context === 'sign-up' && (
    ['user_already_exists', 'email_exists', 'user_already_registered'].includes(code)
    || allText.includes('user already registered')
    || allText.includes('email address is already')
  )) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (context === 'sign-in' && (
    ['invalid_credentials', 'invalid_login_credentials'].includes(code)
    || allText.includes('invalid login credentials')
  )) {
    return 'Email or password is incorrect.';
  }
  if (context === 'sign-in' && (code === 'email_not_confirmed' || allText.includes('email not confirmed'))) {
    return 'Please confirm your email before signing in. You can verify it with the code sent to your inbox.';
  }
  if (context === 'verify-signup-code' && (
    ['otp_expired', 'otp_disabled', 'bad_code', 'invalid_token'].includes(code)
    || allText.includes('token has expired')
    || allText.includes('invalid token')
    || allText.includes('invalid otp')
    || allText.includes('otp is invalid')
  )) {
    return 'That code is incorrect or has expired. Check it or request a new code.';
  }
  if (context === 'sign-up' && (
    ['email_address_invalid', 'invalid_email'].includes(code)
    || allText.includes('invalid email')
    || allText.includes('email address is invalid')
  )) {
    return 'Enter a valid email address.';
  }
  if (context === 'sign-up' && (
    code === 'weak_password'
    || allText.includes('password should be at least')
    || allText.includes('password is too weak')
  )) {
    return 'Choose a stronger password with at least 8 characters.';
  }
  if (
    ['over_email_send_rate_limit', 'over_request_rate_limit', 'over_sms_send_rate_limit'].includes(code)
    || status === 429
    || allText.includes('rate limit')
    || allText.includes('too many requests')
  ) {
    return context === 'sign-in'
      ? 'Too many sign-in attempts. Please wait a little and try again.'
      : 'Too many requests. Please wait a little before trying again.';
  }
  if (
    ['fetcherror', 'networkerror'].includes(code)
    || allText.includes('network')
    || allText.includes('fetch')
    || allText.includes('timed out')
    || allText.includes('timeout')
  ) {
    return 'Connection problem. Check your internet and try again.';
  }
  if (status !== undefined && status >= 500) {
    return 'The service is temporarily unavailable. Please try again in a moment.';
  }
  if (context === 'verify-signup-code') return fallbackMessages['verify-signup-code'];
  if (context === 'resend-signup-code') return fallbackMessages['resend-signup-code'];
  if (context === 'password-update' && (
    allText.includes('expired')
    || allText.includes('invalid refresh token')
    || allText.includes('session'))
  ) {
    return 'The password reset link has expired or is no longer valid. Request a new one.';
  }

  return fallbackMessages[context];
}
