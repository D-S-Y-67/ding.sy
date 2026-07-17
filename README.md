# Regmaglypt

**Regmaglypts** are the thumbprint-shaped dents melted into a meteorite's surface as it
falls — from Greek *rhegma* (fracture) + *glyptos* (carved). A shooting star's
fingerprint. The login page is built around that image: a live deep-space sky, a glass
card, and a brand mark of concentric pressed rings.

This repository currently contains the production login/sign-up page and the auth
foundation the rest of the product will grow around.

## Stack

- **Next.js 16** (App Router, TypeScript strict, Tailwind CSS v4) — deployed on Vercel
- **Better Auth** — Google OAuth + passwordless magic links, JWT/JWKS for the backend
- **Postgres on Supabase** (`ap-southeast-1`, Singapore) via **Drizzle ORM**
- **Resend + react-email** — themed magic-link delivery
- Animated background: vanilla Canvas 2D, no rendering libraries

## Quickstart

```bash
npm install
cp .env.local.example .env.local   # fill in values — see SETUP.md
npx drizzle-kit migrate            # apply schema to your DATABASE_URL
npm run dev
```

Without `RESEND_API_KEY`, magic links are printed to the dev-server console instead of
being emailed — request a link on the login page, copy it from the terminal, and open
it. Without Google credentials the Google button renders but reports an error when
clicked. Service-by-service setup lives in [SETUP.md](./SETUP.md).

## Project structure

```
src/
  app/
    page.tsx                 login page (server component, session-aware)
    home/page.tsx            protected placeholder — proof sessions work
    api/auth/[...all]/       Better Auth handler (OAuth, magic links, session, JWKS)
    globals.css              design tokens (glass, type scale, motion) + base styles
  components/
    background/              canvas sky: engine, nebula, starfield, shooting stars, ship
    auth/                    login card, magic-link form, provider buttons, sign-out
    brand/                   glyph mark + wordmark
  lib/
    auth.ts                  server auth config — providers, magic link, JWT (one place)
    auth-client.ts           client entry points the UI calls
    db/                      drizzle client + auth schema
    email/                   magic-link delivery (Resend or dev console)
  emails/                    react-email templates
reference/
  aliyun-jwt-verify/         backend JWT verification reference (Node + jose)
drizzle/                     generated SQL migrations
```

## Auth schema

Owned by Better Auth, defined in `src/lib/db/schema.ts`, applied via Drizzle
migrations. Column names are snake_case; Drizzle maps them to the camelCase field
names Better Auth expects.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `user` | One row per person | `id` (pk), `email` (unique), `name`, `email_verified`, `image` |
| `session` | Server-side sessions behind the cookie | `token` (unique), `user_id` → user, `expires_at`, `ip_address`, `user_agent` |
| `account` | Links a user to a provider (`google`, or `credential`) | `provider_id`, `account_id`, `user_id` → user, OAuth token columns |
| `verification` | Single-use magic-link tokens and other short-lived proofs | `identifier`, `value`, `expires_at` |
| `jwks` | RS256 signing key pairs for the JWT plugin | `public_key`, `private_key` (encrypted at rest), `expires_at` |

All five tables have RLS enabled with no policies on Supabase: the app connects
directly as the table owner (which bypasses RLS), while Supabase's auto-generated
PostgREST API is denied.

## Tokens for the Aliyun backend

The main API on Alibaba Cloud (`ap-southeast-1`) verifies users **independently** —
no shared secret, no callback to this app:

1. The signed-in frontend mints a JWT: `GET /api/auth/token` (15-minute expiry,
   RS256, `iss` = app URL, `aud` = `regmaglypt-api`, claims: `sub`, `email`, `name`).
2. It calls the Aliyun API with `Authorization: Bearer <jwt>`.
3. The backend verifies signature/expiry/issuer/audience against the public keys at
   `GET /api/auth/jwks`, cached in-process.

A runnable Node reference lives in
[`reference/aliyun-jwt-verify/`](./reference/aliyun-jwt-verify/verify.mjs) — including
expired-token handling. CORS and header details: [SETUP.md §6](./SETUP.md).

## Adding Apple sign-in later

Two edits, by design:

1. **Server** — in `src/lib/auth.ts`, add an `apple` entry next to `google` in
   `socialProviders` (env vars `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`), plus
   Apple's required `appleid.apple.com` in `trustedOrigins` per Better Auth docs.
2. **UI** — in `src/components/auth/ProviderButtons.tsx`, append one entry to the
   `PROVIDERS` array (label, icon, `authClient.signIn.social({ provider: "apple" })`).

The button row, pending/error states, and layout already accommodate it.

## DECISIONS

**Better Auth over Auth.js (NextAuth v5).** Both fit Next.js App Router; Better Auth
won on the two hard requirements. Its first-party JWT plugin publishes a JWKS endpoint
out of the box, giving the Aliyun backend independent verification with zero custom
signing code to own, and magic links are a maintained first-party plugin with
single-use, server-stored, expiring tokens. Auth.js would have required hand-rolled
JWKS plumbing and key rotation — bespoke security code this project shouldn't carry.

**Supabase Postgres + Drizzle.** The spec suggested a free serverless Postgres (e.g.
Neon); Supabase was chosen because the org's Supabase account was already connected to
the development workflow, it offers `ap-southeast-1` (Singapore — same region as users
and the Aliyun backend, so auth round-trips stay local), and its free tier fits.
It is used as plain Postgres via Drizzle — no Supabase Auth, no lock-in; swapping to
Neon later is a `DATABASE_URL` change plus one migration run. Drizzle over Prisma for
its lighter serverless footprint (no engine binary) and SQL-first migrations that can
be reviewed line by line.

**RS256 over the default EdDSA for JWTs.** Better Auth defaults to Ed25519; the token
must be verifiable by an Aliyun backend whose stack we don't control. RS256 is
verifiable by effectively every JWT library in every language, so interop risk drops
to zero at a negligible size/CPU cost. Issuer and audience are pinned; tokens live 15
minutes, forcing re-mint from the (revocable) session rather than long-lived bearer
credentials.

**Full wordmark + glyph, no shortened name.** "Regmaglypt" is 10 letters — fine as a
headline, illegible at 16 px. Tight spots (favicon, future mobile header) use a glyph
instead of truncating the name to "Regma", which would fragment the brand before it
exists. The glyph is three broken concentric rings — a thumbprint pressed into molten
metal — drawn as strokes so it scales from favicon to app icon.

**Type: Marcellus for the wordmark, Instrument Sans for UI.** The name means
"carved"; Marcellus is an inscriptional Roman face — carved letterforms, used with
restraint (wordmark and nothing else). Instrument Sans carries all UI text: a clean
grotesque with enough character to not read as default-Inter. Roboto Medium is loaded
solely because Google's sign-in branding guidelines specify it for the button label.

**Domain: `*.vercel.app` until launch.** OAuth origins, DNS, and email-domain
verification all key off the domain; doing that work twice (once for a staging domain,
once for regmaglypt.com) buys nothing before launch. SETUP.md §1–2 mark exactly which
values change when the custom domain lands.

**Dev email transport.** When `RESEND_API_KEY` is unset the magic-link URL is printed
to the server console. This keeps local development and E2E tests free of real email
(and of Resend sandbox limits), while production behavior differs only in the final
delivery step.

**Canvas engineering.** Vanilla Canvas 2D with delta-time movement; nebula gradients
pre-rendered once per resize; stars drawn from pre-rasterised sprites; shooting stars
object-pooled; DPR capped at 2; the loop pauses when the tab hides;
`prefers-reduced-motion` gets a static, twinkle-only sky. Measured steady 60 fps
(p95 frame 16.8 ms) at 1440×900 @2× in headless Chromium.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck (strict, no `any`) |
| `npx drizzle-kit generate` | Emit SQL migration from schema changes |
| `npx drizzle-kit migrate` | Apply migrations to `DATABASE_URL` |
