# ACE Website

Next.js 16 application for the ACE program, using Firebase Authentication, Firestore, and Firebase Storage.

## Local development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

For end-to-end auth testing against local Firebase emulators:

```bash
npm run emulators:start
npm run dev:emulators
```

## Environment setup

Copy `.env.example` to `.env.local` and fill in the Firebase web-app and Admin SDK credentials.

## Verification commands

Repo quality gate:

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npx playwright test tests/auth.spec.ts tests/security-auth.spec.ts tests/auth-emulator.spec.ts
```

Real Firebase project validation:

```bash
npm run validate:firebase:project
```

This validates Firebase Admin connectivity plus password-reset, email-verification, and verify-and-change-email action-link generation against the configured real project when validation emails are provided.

Production or staging auth smoke test:

```bash
PLAYWRIGHT_BASE_URL=https://your-deployed-app.example.com \
SMOKE_TEST_EMAIL=smoke-test-user@example.com \
SMOKE_TEST_PASSWORD='your-test-password' \
npm run test:smoke
```

Use a dedicated low-privilege test account. The smoke test verifies:

- public routes still render
- protected routes redirect to login when logged out
- login succeeds
- session cookie is issued and survives reload/navigation
- logout succeeds and protected routes are blocked again

Detailed checklist:

- `docs/firebase-production-validation.md`
- `docs/auth-monitoring.md`
- `docs/website-product-requirements.md`
