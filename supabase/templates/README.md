# Supabase signup confirmation email

The app verifies signup with the email OTP entered in `src/app/verify-email.tsx`. To make the code visible to users, update the Supabase Auth email template:

1. Open **Authentication → Emails → Templates → Confirm signup** in the Supabase dashboard.
2. Set the subject to `Confirm your Salterra account | Επιβεβαίωσε τον λογαριασμό σου`.
3. Replace the message body with the contents of [`confirm-signup.html`](./confirm-signup.html).
4. Save the template.

The template must contain `{{ .Token }}`. Do not use `{{ .ConfirmationURL }}` for this OTP flow. The redirect URL settings may remain for password reset and other link-based flows; signup confirmation no longer passes a redirect URL.

The verification code is sent through Supabase Auth's configured email provider, so its existing delivery and rate limits still apply.
