# SETUP

Everything needed to run Regmaglypt's login system, written to be followed without
prior knowledge of the services. Sections:

1. [Microsoft Entra ID (OAuth)](#1-microsoft-entra-id-oauth)
2. [Resend (magic-link email)](#2-resend-magic-link-email)
3. [Environment variables](#3-environment-variables)
4. [Database (Supabase Postgres)](#4-database-supabase-postgres)
5. [Vercel deployment](#5-vercel-deployment)
6. [Aliyun backend integration](#6-aliyun-backend-integration)

---

## 1. Microsoft Entra ID (OAuth)

1. **Register the app.** Go to <https://portal.azure.com> → search **Microsoft
   Entra ID** → **App registrations** → **New registration**:
   - Name: `Regmaglypt`.
   - Supported account types: **Accounts in any organizational directory and
     personal Microsoft accounts** — this is what lets ordinary consumers with
     personal Microsoft accounts sign in.
   - Redirect URI: platform **Web**, value
     `http://localhost:3000/api/auth/callback/microsoft` → **Register**.
2. **Add the production redirect.** In the registration: **Authentication →
   Add URI** → `https://regmaglypt.vercel.app/api/auth/callback/microsoft` → Save.
3. **Copy the client ID.** On the **Overview** page, copy **Application (client)
   ID** → `MICROSOFT_CLIENT_ID`.
4. **Create the secret.** **Certificates & secrets → Client secrets → New client
   secret** → pick a lifetime → **Add**, then copy the **Value** column
   immediately (it is shown once; the *Secret ID* column is not the secret) →
   `MICROSOFT_CLIENT_SECRET`. Note the expiry — you must rotate it before then.
5. **Tenant.** Leave `MICROSOFT_TENANT_ID` unset for the default `common`
   (personal + work/school accounts). To restrict sign-in to one organisation,
   set it to that directory's tenant ID from the Overview page.
6. **At custom-domain launch:** add
   `https://regmaglypt.com/api/auth/callback/microsoft` under Authentication.

Common failure: `AADSTS50011` on sign-in means the exact
`<BETTER_AUTH_URL>/api/auth/callback/microsoft` is not in the redirect list —
scheme, host, and path must match character for character.

**Re-adding Google later** (deliberately kept cheap): create OAuth credentials at
<https://console.cloud.google.com> with redirect URI
`<BETTER_AUTH_URL>/api/auth/callback/google`, set `GOOGLE_CLIENT_ID`/`SECRET`,
add a `google` entry in `src/lib/auth.ts` and one button entry in
`src/components/auth/ProviderButtons.tsx`.

## 2. Resend (magic-link email)

1. **Account & API key.** Sign up at <https://resend.com>, then **API Keys →
   Create API key** (permission: *Sending access*). Copy it → `RESEND_API_KEY`.
2. **Verify a sending domain.** **Domains → Add domain**. Use a subdomain you
   don't send personal mail from, e.g. `mail.regmaglypt.com`. Resend shows DNS
   records to add at your DNS host:
   - **SPF**: a `TXT` record on `send.mail.regmaglypt.com` (value like
     `v=spf1 include:amazonses.com ~all`) plus an `MX` record — exactly as shown.
   - **DKIM**: three `CNAME` records (`resend._domainkey…`).
   Add them, press **Verify**; propagation is usually minutes. Then set
   `EMAIL_FROM="Regmaglypt <signin@mail.regmaglypt.com>"`.
3. **Before the domain exists** you can send from Resend's shared
   `onboarding@resend.dev` (the code's fallback), but **only to the email address
   of your own Resend account** — fine for smoke tests, useless for real users.
4. **Testing without real inboxes:**
   - **Local dev:** leave `RESEND_API_KEY` unset — magic links print to the dev
     server console; copy and open them. This is how the E2E tests run.
   - **With a key:** send to Resend's test addresses (`delivered@resend.dev`,
     `bounced@resend.dev`) and inspect the result under **Emails** in the Resend
     dashboard — nothing is delivered anywhere.

## 3. Environment variables

Local: copy `.env.local.example` to `.env.local` and fill in. Every variable:

| Variable | Required | What it is |
| --- | --- | --- |
| `BETTER_AUTH_URL` | yes | Absolute base URL of the app (`http://localhost:3000` locally, the Vercel URL in production). Also the JWT `iss`. |
| `BETTER_AUTH_SECRET` | yes | Secret for session-token hashing and private-key encryption at rest. Generate: `openssl rand -base64 32`. Rotating it invalidates sessions. |
| `DATABASE_URL` | yes | Postgres connection string — see §4 for which one. |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | prod yes, dev optional | From §1. Absent in dev, the Microsoft button shows an inline error when clicked. |
| `MICROSOFT_TENANT_ID` | no | Default `common` (personal + work accounts); set a tenant ID to restrict to one organisation. |
| `RESEND_API_KEY` | prod yes, dev optional | From §2. Absent in dev, magic links print to the console. |
| `EMAIL_FROM` | prod yes | Verified sender, `Regmaglypt <signin@mail.regmaglypt.com>`. Falls back to `onboarding@resend.dev`. |

**Vercel dashboard:** Project → **Settings → Environment Variables**. Add each
variable, choosing the environments it applies to (Production / Preview /
Development). Set `BETTER_AUTH_URL` for **Production** to the canonical URL
(`https://<your-app>.vercel.app`, later `https://regmaglypt.com`). Mark all
secrets as **Sensitive**. Secrets are never committed — `.gitignore` excludes
`.env*` (except the example file).

## 4. Database (Supabase Postgres)

A Supabase project **`regmaglypt`** already exists in region **`ap-southeast-1`
(Singapore)**, org *D-S-Y-67's Org*, with the auth schema migrated and RLS enabled
on all auth tables. To recreate from scratch: <https://supabase.com/dashboard> →
**New project** → name `regmaglypt`, region **Southeast Asia (Singapore)** → set a
database password.

**Connection strings** (dashboard → **Connect**):

- **App runtime (Vercel):** use the **Transaction pooler** URL — serverless
  functions open many short-lived connections and the pooler absorbs them:

  ```
  postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
  ```

- **Migrations:** use the **Session pooler** URL (port 5432, same host/user) —
  DDL through the transaction pooler is unreliable. The **Direct connection**
  (`db.<ref>.supabase.co`) also works but is IPv6-only, which many networks
  (including this repo's CI/dev containers) can't reach.

**Apply migrations** (idempotent, tracked in `drizzle/meta`):

```bash
DATABASE_URL="<session-pooler-url>" npx drizzle-kit migrate
```

**Local development alternative:** any local Postgres works —
`createdb regmaglypt`, point `DATABASE_URL` at it, run the same migrate command.

## 5. Vercel deployment

1. **Import.** <https://vercel.com/new> → import the GitHub repo. Framework preset
   *Next.js*; no build settings need changing.
2. **Environment variables.** Add everything from §3 before the first deploy
   (Production at minimum).
3. **Deploy.** Every push to the default branch becomes a Production deployment;
   every other branch/PR gets a Preview deployment.
4. **Preview deployments and OAuth — what breaks and why.** Preview URLs are
   unique per deployment (`<app>-git-<branch>-<team>.vercel.app`), and:
   - Microsoft only redirects to URIs registered in §1 — unregistered preview
     URLs make sign-in fail with `AADSTS50011`. Registering every preview URL
     is impractical; don't try.
   - Better Auth only trusts its own `BETTER_AUTH_URL` origin — callbacks on other
     hosts are rejected as untrusted.

   **Policy that works:** test OAuth and magic links on Production (or locally);
   treat previews as UI review builds. If auth-on-previews becomes necessary
   later, pin a stable preview URL (Vercel *Preview Deployment Suffix* or a
   dedicated `staging` branch domain), register that one URL as a redirect, and
   set preview-scoped `BETTER_AUTH_URL` to it.
5. **Custom domain at launch:** Project → **Settings → Domains** → add
   `regmaglypt.com`, follow the DNS instructions, then update
   `BETTER_AUTH_URL` (Production), Google origins/redirects (§1.4), and the
   consent-screen domain.

## 6. Aliyun backend integration

The backend runs in `ap-southeast-1` (Singapore) — same region as the database, so
token verification and data access stay local. Three pieces:

1. **CORS on the Aliyun API** (API Gateway CORS plugin or your framework's CORS
   middleware). Because auth crosses origins as a *header*, not a cookie:

   ```
   Access-Control-Allow-Origin:  https://<your-app>.vercel.app   (exact origin; add regmaglypt.com at launch)
   Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
   Access-Control-Allow-Headers: Authorization, Content-Type
   Access-Control-Max-Age:       86400
   ```

   Do **not** set `Access-Control-Allow-Credentials` — no cookies cross origins.
   Answer `OPTIONS` preflights with 204 + these headers.

2. **Bearer tokens, not cross-origin cookies.** The session cookie stays
   first-party on the app; the API sees only short-lived JWTs. This avoids
   third-party-cookie blocking, `SameSite` pitfalls, and CSRF surface on the API.
   Frontend call pattern:

   ```ts
   const { token } = await fetch("/api/auth/token").then((r) => r.json());
   await fetch("https://api.example-aliyun-host.com/v1/things", {
     headers: { Authorization: `Bearer ${token}` },
   });
   ```

   Tokens expire after 15 minutes: on a 401 with `token_expired`, re-fetch
   `/api/auth/token` (the session cookie is still valid) and retry once.

3. **Verification on the backend:** fetch and cache the JWKS from
   `https://<BETTER_AUTH_URL>/api/auth/jwks`, verify RS256 signature, `exp`,
   `iss` (= `BETTER_AUTH_URL`) and `aud` (= `regmaglypt-api`). Runnable Node
   reference with expiry handling and key-rotation-safe caching:
   [`reference/aliyun-jwt-verify/verify.mjs`](./reference/aliyun-jwt-verify/verify.mjs)

   ```bash
   cd reference/aliyun-jwt-verify && npm install
   AUTH_BASE_URL=https://<your-app>.vercel.app npm start   # verify server on :8080
   ```
