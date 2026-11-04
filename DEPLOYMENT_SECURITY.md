# Production environment and secret handling

Configure these values in the deployment platform's secret manager. Do not commit real credentials or copy production values into `.env.example`.

## Backend

- `NODE_ENV=production`, `PORT`, and `FRONTEND_ORIGINS` (comma-separated exact HTTPS frontend origins).
- `JWT_SECRET` and `JWT_REFRESH_SECRET`: independently generated, high-entropy values. They must be different.
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `OFFICE_EMAIL`.
- Configure notification provider credentials only when that provider is in use (`NOTIFICATION_PROVIDER`, `MANAGEMENT_NUMBER`, `TWILIO_*`, `WHATSAPP_*`).
- Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` only when payments are enabled. With payment keys absent, online payment order creation and verification return unavailable.

## Frontend

Set `REACT_APP_API_URL` to the deployed backend API origin (for example, `https://api.example.com`). The frontend defaults to `http://localhost:5000` for local development.

## Secret rotation and exposed credentials

Generate replacement credentials in the relevant provider or secret manager; never put generated values in this repository. Rotate JWT access and refresh secrets together, then restart the backend; existing tokens will need to be renewed through login. Rotate payment, SMTP, database, and messaging credentials at their providers, update the deployment secret manager, and restart affected services.

If a secret was committed, revoke or rotate it first. Then coordinate repository history cleanup with all repository users: rewrite affected history using the repository host's documented procedure, force-push only with repository-owner authorization, and have collaborators re-clone or carefully reconcile their branches. Removing a secret from the current tree does not remove it from Git history. This project currently ignores `.env` and `.env.*` while allowing `.env.example`.
