# Smart Fishing Cyprus — Project Progress

Τελευταία ενημέρωση: 07/10/2026

Αυτό το αρχείο είναι το σημείο αναφοράς του project. Καταγράφει τι αποφασίστηκε, τι έχει γίνει, τι παραμένει προσωρινό και ποια βήματα ακολουθούν.

> **Για συνέχεια σε νέα συνομιλία:** διάβασε πρώτα αυτή την ενότητα και μετά συνέχισε από το «Προτεινόμενο πλάνο». Οι παλαιότερες σημειώσεις παρακάτω είναι ιστορικό· αν διαφωνούν με την τρέχουσα κατάσταση, ισχύει αυτή η ενότητα.

## Ιστορικό ορόσημο — επαναφορά οθονών μετά τη σύνδεση, 07/10/2026

- Μετά από αίτημα του χρήστη αφαιρέθηκαν οι πρόχειρες οθόνες και οι διαδρομές Trips, Market, Profile, Professional status και Administration. Η Αρχική και ο Χάρτης είναι πλέον κενές σελίδες με δύο καρτέλες στο κάτω μέρος.
- Όλοι οι επιβεβαιωμένοι ρόλοι (Buyer, Amateur, Professional, Admin) βλέπουν το ίδιο προσωρινό πλαίσιο. Δεν υπάρχουν ακόμη λειτουργίες ανά ρόλο. Οι suspended/disabled λογαριασμοί παραμένουν αποκλεισμένοι και η ανάγνωση του profile συνεχίζει να γίνεται από τη βάση.
- Διατηρήθηκε η αποσύνδεση στην κεφαλίδα ώστε να μπορούν να ελεγχθούν διαφορετικοί λογαριασμοί. Η εγγραφή, η σύνδεση και η επαλήθευση email δεν άλλαξαν.
- Οι περιγραφές του αμέσως επόμενου ορόσημου αφορούν την προηγούμενη, προσωρινή υλοποίηση και δεν περιγράφουν πλέον τις οθόνες που εμφανίζει η εφαρμογή.

## Νεότερο ορόσημο — πρώτη έκδοση Χάρτη με MapLibre, 07/10/2026

- Ο Χάρτης χρησιμοποιεί MapLibre React Native με OpenFreeMap Liberty vector style και κέντρο την Κύπρο. Ο χρήστης μπορεί να μετακινεί/μεγεθύνει τον χάρτη, να ζητά την τρέχουσα θέση από ρητό κουμπί και να επιλέγει σημείο με παρατεταμένο πάτημα.
- Η επιλογή μπορεί να αποθηκευτεί ως προσωπικό fishing spot στον πίνακα `fishing_spots`. Η ανάγνωση φιλτράρεται στον ιδιοκτήτη και η βάση έχει RLS πολιτική ιδιοκτησίας από τη migration 0002. Δεν εμφανίζονται ψεύτικα σημεία ή περιβαλλοντικές τιμές.
- Η άδεια GPS ζητείται μόνο όταν ο χρήστης πατήσει το κουμπί τοποθεσίας και είναι foreground-only. Η αποθήκευση εμφανίζει ρητά ότι το σημείο είναι ιδιωτικό.
- Η βάση `react-native-maps` αφαιρέθηκε, επειδή δεν υποστηρίζει τον απαιτούμενο έλεγχο του vector style/layers. OpenFreeMap public instance δηλώνει εμπορική χρήση και αυτόματη απόδοση attribution μέσα στο MapLibre· παρέχεται χωρίς SLA, άρα θα επανελεγχθεί πριν από παραγωγική κυκλοφορία.
- Το MapLibre δεν υποστηρίζεται στο Expo Go. Προστέθηκαν `expo-dev-client`, config plugin και EAS development profile· για δοκιμή σε iPhone απαιτείται να δημιουργηθεί και να εγκατασταθεί development build.
- Ιστορικό εξορμήσεων/αλιευμάτων, φίλτρα, θαλάσσια δεδομένα και προστατευόμενες περιοχές δεν έχουν υλοποιηθεί ακόμη. Το έγγραφο τα προβλέπει στον Χάρτη, αλλά η σύνδεση με ιστορικό εξαρτάται από το επόμενο στάδιο Εξορμήσεων και τα θεματικά δεδομένα από επιβεβαιωμένες πηγές.
- Δεν έχουν προστεθεί ακόμη καιρικά δεδομένα. Η επόμενη φάση είναι να σχεδιαστεί/υλοποιηθεί ξεχωριστό layer από Open-Meteo Marine και Weather JSON/GeoJSON, με χρόνο πρόγνωσης, πηγή, μονάδες και τις απαιτούμενες αναφορές Open-Meteo/DWD. Οι θαλάσσιες μεταβλητές δεν πρέπει να παρουσιάζονται ως πλοηγική ακρίβεια.
- Μετά τη μεταφορά πέρασαν `npx expo lint`, `npx tsc --noEmit`, `npx expo config --type public` και iOS JS bundle export. Δεν έχει γίνει native development build ή οπτικός έλεγχος iPhone. Απομένει η εγκατάσταση development build και να επιβεβαιωθεί ότι η remote Supabase βάση έχει εφαρμόσει τη migration 0002.

## Τρέχουσα κατάσταση πλοήγησης — 07/10/2026

- Οι διαθέσιμες καρτέλες ακολουθούν προσωρινά τον αρχικό σχεδιασμό: Amateur: Αρχική, Χάρτης, Εξορμήσεις, Market, Προφίλ· Buyer: Αρχική, Market, Προφίλ· ενεργός Professional: Χάρτης και Εξορμήσεις, με Market μόνο μετά από έγκριση και με άδεια σε ισχύ· Admin: Αρχική, Προφίλ.
- Ο Χάρτης χρησιμοποιεί MapLibre/OpenFreeMap και απαιτεί development build αντί Expo Go. Αρχική, Εξορμήσεις, Market και Προφίλ παραμένουν χωρίς λειτουργικό περιεχόμενο.
- Η κάτω μπάρα χρησιμοποιεί γκρι φόντο, φωτεινό panel, ίσα κεντραρισμένα στοιχεία, Ionicons, κόκκινη ενεργή κατάσταση και ετικέτες στα Ελληνικά/Αγγλικά. Η αποσύνδεση εμφανίζεται διακριτικά στην κεφαλίδα.
- Η επόμενη εργασία είναι ο έλεγχος του Χάρτη στη συσκευή και η επιβεβαίωση της βάσης Supabase. Μετά συνεχίζουμε με την καρτέλα Εξορμήσεις, ώστε να οριστεί σωστά το ιστορικό που αργότερα θα προβάλλεται και γεωγραφικά στον Χάρτη.

## Νεότερο ορόσημο — 07/10/2026

Αυτή η ενημέρωση υπερισχύει των παλαιότερων σημειώσεων για το προσωρινό Welcome και τις εκκρεμότητες lint.

- Προστέθηκε δίγλωσση πλοήγηση Expo Router στο `src/app/(member)/`: Home, Map, Trips, Market, Profile, Professional status και Administration. Buyer: Home/Market/Profile, pending λογαριασμοί: Home/Profile, ενεργοί ψαράδες: πέντε βασικές καρτέλες.
- Το Welcome αντικαταστάθηκε. Ο ρόλος και η κατάσταση διαβάζονται από τη βάση, με φόρτωση, επανάληψη σε αποτυχία και φραγή suspended/disabled λογαριασμών. Τα Auth metadata δεν χρησιμοποιούνται για δικαιώματα.
- Χάρτης, εξορμήσεις, Market, έγγραφα και διαχείριση παραμένουν επόμενα στάδια, εμφανίζονται ως σύντομα διαθέσιμα και δεν περιέχουν εικονικά δεδομένα.
- Η επαγγελματική πρόσβαση Market απαιτεί active profile, approved αίτηση και άδεια σε ισχύ με ημερομηνία Κύπρου. Η επιβολή των αντίστοιχων ελέγχων στις πράξεις δημοπρασίας πρέπει να γίνει και στο backend όταν υλοποιηθεί το Market.
- Ετοιμάστηκε `supabase/migrations/0004_confirmed_account_activation.sql` για ενεργοποίηση επιβεβαιωμένων pending Buyer/Amateur και περιορισμό αλλαγών προνομίων/αυτοέγκρισης από client. **ΔΕΝ εκτελέστηκε στην απομακρυσμένη βάση.** Οδηγίες στο `supabase/MEMBER_SETUP.md`. Προϋποθέτει τις migrations 0001–0003. Μέχρι να εφαρμοστεί, οι pending χρήστες βλέπουν αναμονή ενεργοποίησης.
- Πέρασαν πλήρες lint, TypeScript, μεταγλώττιση web/iOS και έλεγχος 256 συνδυασμών επαγγελματικής πρόσβασης, απουσίας αίτησης και λήξης στην αλλαγή ημερομηνίας Κύπρου. Ο οπτικός/λειτουργικός έλεγχος σε συσκευή και η εκτέλεση της migration παραμένουν εκκρεμή.
- Η προδιαγραφή παραμένει το `Αρχικός_Σχεδιασμός_Διορθωμένος.odt`. Ενημερώνουμε την πρόοδο μόνο σε ουσιαστικά ορόσημα, όπως ζήτησε ο χρήστης.

## Τρέχουσα εικόνα — 06/10/2026

### Έτοιμο ή υλοποιημένο

- Το project τρέχει με Expo SDK 57, Expo Router, TypeScript και Supabase.
- Η σελίδα Login/Sign Up έχει ελληνικά και αγγλικά, πεδία σύνδεσης/εγγραφής και επιλογή Buyer, Amateur ή Professional.
- Η εφαρμογή χρησιμοποιεί Supabase Auth για sign up, sign in, sign out και reset password.
- Η επιβεβαίωση email γίνεται μέσα στην εφαρμογή με OTP. Το custom email template στέλνει τον κωδικό με SMTP.
- Το Supabase στέλνει **8 ψηφία**. Η οθόνη OTP έχει προσαρμοστεί ώστε να δέχεται και τα 8· προηγουμένως το όριο των 6 έκοβε τα δύο τελευταία ψηφία.
- Έγινε αισθητική βελτίωση στην οθόνη OTP. Χρειάζεται οπτική επιβεβαίωση μετά από Reload στο Expo Go.
- Το unique index `profiles_display_name_unique_idx` επιβεβαιώθηκε στον Supabase SQL Editor.
- Η απορία για αντίστοιχα ενημερωτικά μηνύματα Buyer/Amateur παραμένει στο `QUESTIONS_FOR_PROFESSOR.md`· δεν προσθέτουμε τέτοια μηνύματα πριν απαντήσει η καθηγήτρια.

### Εκκρεμή / προς επιβεβαίωση

- **Επιβεβαιώθηκε σε συσκευή:** sign up με νέο 8ψήφιο OTP ολοκληρώνει επιτυχώς την επιβεβαίωση email.
- **Απομένει σε συσκευή:** sign in → sign out και forgot password → callback → αλλαγή κωδικού. Να επιβεβαιωθεί επίσης ότι το Expo callback URL επιτρέπεται στο Supabase. Το OTP styling χρειάζεται οπτική επιβεβαίωση μετά από Reload στο Expo Go.
- Οι λογαριασμοί μετά τη σύνδεση εμφανίζουν προσωρινό welcome screen. Δεν υπάρχουν ακόμη διαφορετικές αρχικές οθόνες ανά ρόλο.
- Να επιβεβαιωθεί ποιες migrations έχουν εκτελεστεί στο ενεργό Supabase project πριν βασιστούμε σε αυτές για νέες λειτουργίες.
- Το lint αναφέρει δύο σφάλματα `react-hooks/set-state-in-effect` στα `src/hooks/use-auth-session.ts` και `src/hooks/use-color-scheme.web.ts`. Το `npx.cmd tsc --noEmit` περνά. Τα lint ευρήματα είναι άσχετα με τις αλλαγές OTP.
- Τα όρια email/rate limit του Supabase παραμένουν ενεργά. Δεν αλλάζουμε ρυθμίσεις ή provider χωρίς συγκεκριμένη ανάγκη.

### Προτεινόμενο πλάνο

1. **Κλείσιμο authentication:** έλεγχος σε Expo Go για sign up → email OTP 8 ψηφίων → επιτυχής επιβεβαίωση → sign in → sign out, καθώς και password reset και μηνύματα σφαλμάτων. Έλεγχος και στις δύο γλώσσες.
2. **Αποτύπωση ροών χρηστών:** ορισμός του τι βλέπει Buyer, Amateur και Professional μετά τη σύνδεση. Κρατάμε τις ερωτήσεις προς την καθηγήτρια στο `QUESTIONS_FOR_PROFESSOR.md`.
3. **Profile και δικαιώματα:** σύνδεση των screens με τα profiles και έλεγχος ότι ρόλοι/καταστάσεις δεν μπορούν να αλλαχθούν από το mobile client.
4. **Μικρά prototypes υψηλού ρίσκου:** χάρτης/GPS, ιδιωτική αποθήκευση φωτογραφιών ή εγγράφων και offline καταγραφή, ένα-ένα πριν επεκταθεί η εφαρμογή.
5. **Κύριες λειτουργίες:** εξορμήσεις και αλιεύματα, έπειτα επαγγελματική έγκριση και Market/δημοπρασίες.
6. **Ολικός έλεγχος πριν την παρουσίαση/παράδοση:** smoke tests σε βασικές ροές και σφάλματα, iOS/Android, δικαιώματα και RLS σε κάθε πίνακα, πρόσβαση Storage, ρόλοι, secrets/configuration, migrations, εξαρτήσεις και lint/typecheck. Η ασφάλεια ελέγχεται σε κάθε στάδιο, όχι μόνο στο τέλος.

### Κανόνες ασφάλειας που ισχύουν σε κάθε βήμα

- Κανένα Supabase service-role key ή άλλο μυστικό μέσα στην εφαρμογή ή σε commit. Τα public client keys δεν υποκαθιστούν τους ελέγχους πρόσβασης.
- Κάθε πίνακας με δεδομένα χρηστών χρειάζεται RLS και policies που ελέγχονται με διαφορετικούς ρόλους/χρήστες.
- Έγκριση επαγγελματία, admin δικαιώματα και ενέργειες δημοπρασίας επιβάλλονται στο backend, ποτέ μόνο από το UI.
- Τοποθεσίες και έγγραφα μένουν ιδιωτικά εξ ορισμού· ζητάμε μόνο τα permissions που χρειάζεται κάθε λειτουργία.
- Δεν καταγράφουμε passwords, OTPs, tokens ή πλήρη προσωπικά δεδομένα στα logs και screenshots.

## 1. Πηγή απαιτήσεων

Το βασικό specification είναι το αρχείο:

`Αρχικός_Σχεδιασμός_Διορθωμένος.odt` (αντίγραφο αναφοράς μέσα στο project)

Το project ονομάζεται **Smart Fishing Cyprus** και αφορά mobile εφαρμογή για:

- ερασιτέχνες ψαράδες
- επαγγελματίες ψαράδες
- αγοραστές δημοπρασιών
- διαχειριστές

Το specification είναι αρχικός σχεδιασμός και προβλέπει σταδιακή ανάπτυξη. Δεν πρέπει να θεωρούνται όλες οι λειτουργίες τελικές πριν επιβεβαιωθούν με prototypes.

## 2. Τεχνολογική κατεύθυνση

- Frontend: TypeScript, React Native, Expo και Expo Router.
- Backend: Supabase.
- Database: PostgreSQL, με πιθανή χρήση PostGIS για γεωγραφικά δεδομένα.
- Authentication: Supabase Auth με επιβεβαίωση email.
- Αρχεία: Supabase Storage.
- Offline καταγραφή: Expo SQLite και συγχρονισμός όταν επανέρχεται η σύνδεση.
- GPS: Expo Location.
- Χάρτης: MapLibre React Native, με πάροχο υποβάθρου που θα επιλεγεί μετά από prototype.
- Περιβαλλοντικά/θαλάσσια δεδομένα: Open-Meteo Marine API και άλλες τεκμηριωμένες πηγές.

## 3. Τι έχει γίνει μέχρι τώρα

### Project setup

- Υπάρχει Expo SDK 57 project με Expo Router.
- Το βασικό development command για QR μέσω LAN είναι:

```powershell
npm.cmd run phone
```

- Το `phone` script προστέθηκε στο `package.json` και εκτελεί `expo start --lan`.

### Login prototype

Το `src/app/index.tsx` περιέχει προσωρινό visual prototype για:

- Login face
- Sign Up face
- neumorphic κυκλικό design
- username/password πεδία
- sign-up πεδία
- remember-me toggle
- forgot-password link placeholder
- Sign In και Create Account buttons
- γρήγορο 3D flip μεταξύ Login και Sign Up

Το prototype **δεν είναι ακόμη συνδεδεμένο με backend**. Τα buttons δεν κάνουν πραγματικό login ή registration.

### Έλεγχοι

- `npx.cmd tsc --noEmit`: περνάει επιτυχώς μετά τις τελευταίες αλλαγές.
- `npx.cmd expo lint`: δεν ολοκληρώνεται επειδή το Expo προσπαθεί να ρυθμίσει ESLint αυτόματα και το περιβάλλον επιστρέφει `EACCES` σε network connection. Δεν έχει αναφερθεί συγκεκριμένο lint error από τον κώδικα.

### Νεότερη προσαρμογή authentication UI

- Το Login χρησιμοποιεί πλέον `Email` και `Password` αντί για `Username`.
- Το Sign Up κρατά `Full name`, `Email` και `Password`.
- Προστέθηκε επιλογή κατηγορίας λογαριασμού: Buyer, Amateur, Professional.
- Η επιλογή αποθηκεύεται προσωρινά μόνο στο UI μέχρι να συνδεθεί το Supabase.
- Ο ρόλος Administrator δεν εμφανίζεται στην εγγραφή και θα αποδίδεται μόνο από ασφαλή backend διαδικασία.
- Το TypeScript check πέρασε ξανά μετά την αλλαγή.

### Backend foundation draft

- Προστέθηκε `.env.example` χωρίς πραγματικά credentials.
- Προστέθηκε `SUPABASE_SETUP.md` με οδηγίες setup, ασφάλειας και εκκρεμότητες.
- Προστέθηκε draft migration `supabase/migrations/0001_identity_foundation.sql` για `profiles`, `professional_applications`, enums και αρχικά RLS policies.
- Η migration περιλαμβάνει προστασία ώστε ο mobile client να μην αλλάζει role ή account status και να μην δημιουργεί admin account.
- Η migration δεν έχει εκτελεστεί ακόμη σε Supabase, επειδή δεν υπάρχει ακόμη project/credentials.
- Η εγκατάσταση των Supabase packages απέτυχε προσωρινά με network `EACCES`. Δεν προστέθηκαν μισοεγκατεστημένες dependencies.

### Supabase packages και client skeleton

- Εγκαταστάθηκαν επιτυχώς με `npx expo install` τα `@supabase/supabase-js`, `react-native-url-polyfill` και `expo-sqlite`.
- Προστέθηκε `src/lib/supabase.ts` με persistent session storage μέσω Expo SQLite localStorage.
- Προστέθηκε `src/lib/auth.ts` με typed functions για email sign-in, sign-up, sign-out και session retrieval.
- Το auth service περνά την επιλεγμένη κατηγορία ως `requested_category`, αλλά δεν αποδίδει δικαιώματα από το client.
- Ο client δεν έχει συνδεθεί ακόμα στην οθόνη, επειδή δεν υπάρχουν πραγματικά environment variables ή Supabase project.
- Το npm install ανέφερε 14 moderate audit findings. Δεν έγινε `npm audit fix --force`, επειδή μπορεί να προκαλέσει breaking changes.

### Auth UI wiring

- Τα Login και Sign Up inputs έγιναν controlled fields.
- Προστέθηκε βασικό validation για email/name/password.
- Τα buttons καλούν πλέον το auth service και εμφανίζουν loading/error/success states.
- Χωρίς environment variables η εφαρμογή εμφανίζει καθαρό μήνυμα ότι το Supabase δεν έχει ρυθμιστεί, αντί να κρασάρει.
- Το Sign Up ενημερώνει τον χρήστη για email confirmation όταν το backend επιστρέψει χρήστη χωρίς session.
- Το Forgot Password παραμένει επόμενο μικρό βήμα και δεν παρουσιάζεται ακόμα ως ολοκληρωμένη λειτουργία.

### Password reset και profile creation

- Προστέθηκε `sendPasswordResetEmail` στο auth service.
- Το Forgot Password ζητά πρώτα email και εμφανίζει ασφαλές μήνυμα χωρίς να αποκαλύπτει αν υπάρχει λογαριασμός.
- Η migration απέκτησε trigger για αυτόματη δημιουργία `profiles` row μετά τη δημιουργία Auth user.
- Το requested category μετατρέπεται σε application role με ασφαλές fallback σε amateur. Ο admin δεν μπορεί να δημιουργηθεί από signup metadata.
- Το profile ξεκινά σε `pending` status και η ενεργοποίηση/έγκριση θα γίνει σε επόμενο backend flow.
- Δεν υπάρχει διαθέσιμος Supabase connector στο τρέχον περιβάλλον, επομένως η migration πρέπει να εκτελεστεί χειροκίνητα στο Supabase Dashboard όταν δημιουργηθεί το project.

### Password reset deep link και session hook

- Το reset email χρησιμοποιεί πλέον το Expo deep link `reset-password`.
- Προστέθηκε route `src/app/reset-password.tsx` για νέο password και επιβεβαίωση password.
- Προστέθηκε `useAuthSession` hook για persistent session loading και auth state changes.
- Το Supabase Dashboard θα χρειαστεί να επιτρέψει το redirect URL που θα εμφανίσει το Expo scheme του app.
- Η κύρια signed-in πλοήγηση παραμένει σκόπιμα επόμενο στάδιο, επειδή δεν έχει δημιουργηθεί ακόμα το πραγματικό Supabase project και το τελικό home/dashboard δεν έχει σχεδιαστεί.

### Session gate prototype

- Το root screen χρησιμοποιεί πλέον το `useAuthSession` hook.
- Όταν υπάρχει active session, το Login αντικαθίσταται από προσωρινή authenticated home.
- Η authenticated home εμφανίζει το email και λειτουργικό Sign out.
- Δεν προστέθηκαν ακόμα role-based dashboards, επειδή πρέπει πρώτα να οριστούν τα τελικά home flows για buyer, amateur, professional και admin.

### Domain model και profile service

- Προστέθηκε `src/types/domain.ts` με κεντρικούς τύπους για roles, account statuses και professional applications.
- Προστέθηκαν centralized permission helpers για app access, auction creation και administrator review.
- Προστέθηκε `src/lib/profile.ts` για typed ανάκτηση και ενημέρωση του signed-in profile.
- Τα screens δεν πρέπει να αντιγράφουν δικούς τους ρόλους ή permission checks· θα χρησιμοποιούν αυτό το domain layer.

### Sign Up layout refinement

- Αυξήθηκε ελαφρά ο διαθέσιμος κύκλος στο mobile χωρίς να μικρύνουν τα inputs ή η γραμματοσειρά.
- Το `Account type` έγινε compact selector αντί για τρία παράλληλα κουμπιά.
- Οι επιλογές Buyer, Amateur και Professional ανοίγουν σε καθαρό modal, ώστε όλα τα βασικά στοιχεία να παραμένουν μέσα στον κύκλο.
- Δεν άλλαξε το Supabase/backend behavior σε αυτό το βήμα.
- Έγινε δεύτερη compact προσαρμογή του Sign Up: μικρότερα μόνο τα κατακόρυφα gaps/containers, ελαφρύ ανέβασμα της φόρμας και λίγο μεγαλύτερη γραμματοσειρά-χώρος παραμένει για τα inputs.

## 10. Authentication validation plan

Πριν προστεθεί οριστικό validation code, θα ακολουθηθεί ενιαία συμπεριφορά σε Login και Sign Up.

### Κανόνες πεδίων

- Email: υποχρεωτικό, trim, πεζά όπου χρειάζεται και βασικός έλεγχος έγκυρης μορφής.
- Password: υποχρεωτικό, τουλάχιστον 8 χαρακτήρες, τουλάχιστον ένα κεφαλαίο, έναν αριθμό και ένα σύμβολο.
- Full name: υποχρεωτικό στο Sign Up, με ελάχιστο μήκος και χωρίς να αποτελείται μόνο από κενά.
- Account type: υποχρεωτικό και περιορισμένο σε Buyer, Amateur ή Professional.
- Admin: δεν εμφανίζεται ποτέ ως επιλογή εγγραφής.

### Χρονισμός ειδοποιήσεων

- Δεν εμφανίζουμε error πριν ο χρήστης αρχίσει να αλληλεπιδρά με το πεδίο.
- Κατά την πληκτρολόγηση password εμφανίζεται μικρό live checklist.
- Μετά το blur εμφανίζεται σύντομο inline error μόνο αν το πεδίο είναι μη έγκυρο.
- Με submit γίνεται συνολικός έλεγχος και εστιάζουμε στο πρώτο προβληματικό πεδίο.
- Οι κανόνες δεν θα μεγαλώνουν απρόβλεπτα τη φόρμα: ο χώρος του password helper θα είναι προβλεπόμενος ή θα χρησιμοποιείται compact overlay.

### Τύποι μηνυμάτων

- Field error: μικρό, κόκκινο μήνυμα κοντά στο συγκεκριμένο πεδίο.
- Password helper: compact λίστα με ✓/✕, που ενημερώνεται live.
- Form error: σύντομο μήνυμα για γενικό πρόβλημα submit.
- Backend error: φιλικό μήνυμα χωρίς τεχνικές λεπτομέρειες ή διαρροή για το αν υπάρχει συγκεκριμένο email.
- Success state: ξεκάθαρο μήνυμα για email confirmation, χωρίς να θεωρείται ο χρήστης authenticated πριν επιβεβαιώσει το email.

### Login ειδικά

- Empty email/password.
- Invalid email format.
- Λανθασμένα στοιχεία με γενικό μήνυμα.
- Μη επιβεβαιωμένο email με οδηγία για confirmation email.
- Forgot password με ασφαλές ενιαίο μήνυμα.
- Loading state και απενεργοποίηση του submit button για αποφυγή διπλού submit.

### Sign Up ειδικά

- Έλεγχος όλων των πεδίων πριν το submit.
- Password confirmation θα προστεθεί πριν συνδεθεί το πραγματικό registration flow.
- Email ήδη χρησιμοποιημένο: φιλικό μήνυμα χωρίς έκθεση ευαίσθητης πληροφορίας όπου απαιτείται.
- Μετά την εγγραφή: οθόνη/μήνυμα επιβεβαίωσης email.
- Professional επιλογή: δημιουργεί αίτημα/κατάσταση pending και δεν ενεργοποιεί αυτόματα δικαιώματα δημοπρασίας.

### UX αρχή

Τα validation messages πρέπει να βοηθούν τον χρήστη να διορθώσει το πεδίο, όχι απλώς να αναφέρουν ότι απέτυχε. Δεν θα χρησιμοποιηθεί μεγάλο native Alert για απλά field errors, επειδή δεν ταιριάζει στο κυκλικό layout.

### Fishing core database draft

- Προστέθηκε draft migration `supabase/migrations/0002_fishing_core.sql`.
- Περιλαμβάνει ιδιωτικά `fishing_spots`, `fishing_trips` και `catches`.
- Τα coordinates έχουν range checks και οι εξορμήσεις έχουν status/dates.
- Τα αλιεύματα ελέγχονται ώστε ο owner να ταιριάζει με τον owner της εξόρμησης.
- Όλες οι αρχικές policies είναι owner-only. Sharing, public data, species library και Market θα σχεδιαστούν ξεχωριστά.
- Η migration δεν έχει εκτελεστεί και παραμένει draft μέχρι να επικυρωθούν τα auth tables και το PostGIS strategy.

### Οδηγίες για το επόμενο Supabase setup

Δεν υπάρχουν credentials μέσα στο repository. Όταν δημιουργηθεί το Supabase project:

1. Αντιγράφουμε το `.env.example` σε `.env.local`.
2. Συμπληρώνουμε Project URL και Publishable Key.
3. Ελέγχουμε τη migration `supabase/migrations/0001_identity_foundation.sql`.
4. Την εκτελούμε στο Supabase SQL Editor ή μέσω migration workflow.
5. Εγκαθιστούμε τα Expo-compatible packages με:

```powershell
npx expo install @supabase/supabase-js react-native-url-polyfill expo-sqlite
```

Η εντολή απέτυχε προσωρινά στο τρέχον περιβάλλον λόγω network `EACCES`. Δεν θα χρησιμοποιηθεί `npm add` ούτε χειροκίνητη επιλογή εκδόσεων.

Το `.env.local`, τα πραγματικά keys και service-role keys δεν πρέπει ποτέ να γίνουν commit. Το service-role key δεν πρέπει να μπει στην Expo εφαρμογή.

## 4. Τι πρέπει να διορθωθεί στο Login πριν συνδεθεί με backend

Το υπάρχον UI είναι μόνο generic prototype και δεν ακολουθεί ακόμη πλήρως το Smart Fishing Cyprus specification.

Απαιτούμενες αλλαγές:

1. Το Login πρέπει να χρησιμοποιεί email και password, όχι username και password.
2. Το Sign Up πρέπει να περιλαμβάνει επιλογή κατηγορίας χρήστη:
   - Αγοραστής
   - Ερασιτέχνης ψαράς
   - Επαγγελματίας ψαράς
3. Ο διαχειριστής δεν πρέπει να είναι επιλογή στην εγγραφή. Ο ρόλος του δίνεται μόνο από ασφαλή backend διαδικασία.
4. Πρέπει να υπάρχει οθόνη/μήνυμα επιβεβαίωσης email.
5. Πρέπει να υπάρχει πραγματικό Forgot Password flow.
6. Μετά την εγγραφή πρέπει να δημιουργείται περιορισμένο profile.
7. Ο επαγγελματίας πρέπει να οδηγείται αργότερα σε ξεχωριστή αίτηση έγκρισης με τα απαραίτητα δικαιολογητικά.

## 5. Προτεινόμενο αρχικό μοντέλο χρηστών

Το authentication identity θα διαχειρίζεται το Supabase Auth. Τα application-specific στοιχεία θα βρίσκονται σε δικούς μας πίνακες.

### `profiles`

Ενδεικτικά πεδία:

- `id` — ίδιο UUID με τον Auth user
- `display_name`
- `avatar_path` — προαιρετικό
- `bio` — προαιρετικό
- `district` — γενική επαρχία, όχι ακριβής τοποθεσία
- `role` — buyer, amateur, professional, admin
- `account_status` — pending, active, suspended, disabled
- `phone` — προαιρετικό και με ρύθμιση ορατότητας
- `phone_visible`
- `created_at`
- `updated_at`

### `professional_applications`

Ενδεικτικά πεδία:

- `id`
- `user_id`
- `status` — pending, approved, rejected, expired
- `id_document_path`
- `license_document_path`
- `license_expires_at`
- `rejection_reason`
- `reviewed_by`
- `submitted_at`
- `reviewed_at`

Τα έγγραφα πρέπει να αποθηκεύονται ιδιωτικά και να είναι προσβάσιμα μόνο από τον ίδιο χρήστη και εξουσιοδοτημένο διαχειριστή.

## 6. Κανόνες ασφάλειας που δεν πρέπει να παρακαμφθούν

- Οι ρόλοι και τα account statuses δεν πρέπει να εμπιστεύονται τιμές από το mobile client.
- Κάθε exposed table πρέπει να έχει Row Level Security policies.
- Τα fishing spots, οι εξορμήσεις και τα αλιεύματα είναι ιδιωτικά εξ ορισμού.
- Τα professional documents είναι ιδιωτικά.
- Κρίσιμοι έλεγχοι, όπως έγκριση επαγγελματία και δημοπρασίες, πρέπει να ελέγχονται στο backend.
- Δεν θα αποθηκεύονται secrets ή service keys μέσα στην εφαρμογή.
- Τα Supabase credentials θα μπουν αργότερα σε environment variables και δεν θα γίνουν commit.

## 7. Προτεινόμενη σειρά υλοποίησης

### Στάδιο 1 — Κλείδωμα βασικής ροής authentication

- Προσαρμογή Login σε email/password.
- Προσθήκη επιλογής user category στο Sign Up.
- Validation πεδίων.
- States για loading, error και email confirmation.
- Forgot password UI.

### Στάδιο 2 — Supabase foundation

- Δημιουργία Supabase project από τον ιδιοκτήτη.
- Προσθήκη Supabase client στο Expo app.
- Environment variables.
- Auth sign up, sign in, sign out και reset password.
- `profiles` table και trigger/flow δημιουργίας profile.
- Βασικά RLS policies.

### Στάδιο 3 — Profile και account status

- Profile screen.
- Επεξεργασία display name, bio, επαρχίας και optional phone.
- Account status handling.
- Προσωρινό routing ανάλογα με τον ρόλο και την κατάσταση.

### Στάδιο 4 — Τεχνικά prototypes υψηλού ρίσκου

- Χάρτης και GPS permission.
- Αποθήκευση fishing spot.
- Φωτογραφία/έγγραφο σε private Storage.
- Offline εγγραφή με SQLite.
- Βασικός συγχρονισμός.

### Στάδιο 5 — Εξορμήσεις και αλιεύματα

- Έναρξη/ολοκλήρωση εξόρμησης.
- Αλιεύματα, σημειώσεις και φωτογραφίες.
- Ιστορικό και σύνδεση με fishing spots.

### Στάδιο 6 — Professional approval και Market

- Αίτηση επαγγελματία.
- Έλεγχος από administrator.
- Άδεια, ημερομηνία λήξης και κλείδωμα Market.
- Δημοπρασίες, προσφορές και server-side validations.

## 8. Τι χρειάζεται από τον ιδιοκτήτη του project

Πριν το πραγματικό Supabase setup θα χρειαστούν:

- επιβεβαίωση ότι το όνομα/εύρος είναι Smart Fishing Cyprus
- Supabase account/project ή άδεια να δημιουργηθεί νέο project
- τελική απόφαση για τις τρεις κατηγορίες εγγραφής
- απόφαση αν το display name είναι υποχρεωτικό
- απόφαση αν θα επιτρέπεται αλλαγή κατηγορίας μετά την εγγραφή
- απόφαση για το ποιος δημιουργεί/εγκρίνει administrator accounts

## 9. Τρέχουσα απόφαση

Δεν θα χτιστεί όλη η βάση μονομιάς. Θα ξεκινήσουμε με authentication, profiles, roles, account statuses και ασφάλεια. Μετά από επιτυχημένο prototype θα επεκταθούμε στις εξορμήσεις, στα fishing spots και στο Market.
