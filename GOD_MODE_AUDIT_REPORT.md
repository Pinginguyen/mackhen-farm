# GOD MODE E2E AUDIT REPORT

No run has completed yet. This file is overwritten by `npm run test:god-mode`.

The suite is restricted to a local app host and a local `DATABASE_URL`. It also requires `GOD_MODE_ALLOW_MUTATIONS=1` and `AUDIT_ADMIN_PASSWORD`. Use a disposable local database because the suite creates test orders, accounts, and audit events before attempting cleanup.
