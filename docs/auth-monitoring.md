# Auth Monitoring

Auth failures are now recorded in two Firestore collections:

- `auth_events`
  One document per auth failure with `type`, `route`, `email`, `uid`, `ip`, `errorCode`, `errorMessage`, `metadata`, and `createdAt`.
- `auth_event_rollups`
  Hourly counters keyed by failure `type` plus `dimension` (`global`, `email`, `ip`, or `uid`).

This covers:

- repeated login failures
- password reset request and completion failures
- Firebase action-code failures
- session verification and session sync failures

## Runtime Logs

Every recorded auth failure is also written to deployment logs with an `[AuthMonitor]` prefix and the same event payload.

## Firestore Queries

To inspect raw failures:

- Collection: `auth_events`
- Example filters:
  - `type == "login_failure"`
  - `type == "session_verification_failure"`
  - `createdAt desc`

To inspect repeated failures:

- Collection: `auth_event_rollups`
- Example filters:
  - `bucket == "<YYYYMMDDHH>"`
  - `type == "login_failure"`
  - `dimension == "email"`
  - `count desc`

## CLI Report

Use the built-in report command to inspect the current hour's rollups:

```bash
npm run ops:auth-report
```

You can also pass a bucket manually:

```bash
node --import tsx scripts/report-auth-failures.ts 2026031917
```
