# Firebase Production Validation

This repository now includes an executable validation path for real Firebase projects, not just emulator checks.

## Required env

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Optional but recommended:

- `FIREBASE_VALIDATION_EMAIL`
- `FIREBASE_VALIDATION_NEW_EMAIL`

`FIREBASE_VALIDATION_EMAIL` must already exist in Firebase Auth for the target project.

## What the validator checks

Run:

```bash
npm run validate:firebase:project
```

The validator checks:

- required public and admin env vars are present
- public and admin project IDs match
- `NEXT_PUBLIC_APP_URL` is a valid URL and uses HTTPS outside localhost
- Firebase Admin can connect to Auth and Firestore
- password-reset links can be generated against the real project with the configured `/auth/action` continue URL
- email-verification links can be generated against the real project with the configured `/auth/action` continue URL
- verify-and-change-email links can be generated when `FIREBASE_VALIDATION_NEW_EMAIL` is supplied
- the app's session-cookie policy is the expected production policy

## Console checks that still need a human

The validator proves link generation and connectivity, but Firebase Console content still needs visual review:

- Authentication > Settings > Authorized domains contains the deployed app host from `NEXT_PUBLIC_APP_URL`
- Authentication > Templates branding/content is correct
- any custom SMTP or email deliverability setup is correct
- the deployed host serves over HTTPS

## Recommended release gate

Before production deploy:

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npx playwright test tests/auth.spec.ts tests/security-auth.spec.ts tests/auth-emulator.spec.ts
npm run validate:firebase:project
```
