/**
 * Firebase project configuration.
 *
 * SECURITY NOTE
 * ─────────────
 * This file is listed in .gitignore and must NEVER be committed with real
 * credentials. Firebase web API keys are not secret in the way a server
 * secret is (they identify your project, not authenticate a user), but they
 * should still be kept out of version control and swapped per-environment
 * (dev / staging / production) so you don't accidentally point a fork or a
 * local clone at your live production data.
 *
 * Setup:
 *   1. Copy this file's contents into firebase-config.js (already done).
 *   2. Go to https://console.firebase.google.com → Project settings →
 *      General → "Your apps" → Web app → SDK setup and configuration.
 *   3. Paste your real values below.
 *   4. Deploy the security rules in /firestore.rules — the app is NOT safe
 *      to launch publicly until those rules are deployed. See README.md.
 *
 * Until real values are provided, the site automatically runs in
 * "Demo Mode": all public forms and the admin dashboard still work, but
 * nothing is persisted to a database, and the admin login accepts only the
 * local demo credentials printed in the browser console on load.
 */
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
