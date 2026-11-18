# KING LEADFLOW AI

Independent, agency-first lead management and AI receptionist platform for agencies serving contractor businesses.

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS
- Supabase PostgreSQL, Auth, and Row Level Security
- Gemini Interactions API behind a server-only provider boundary (active MVP provider)
- Render for hosting; production readiness and live integration verification remain separate acceptance gates

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Set these values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

In Supabase Auth URL Configuration, set the local site URL and allow the callback URL `http://localhost:3000/auth/callback`. Add the production origin and callback after deployment. Email/password signup uses email confirmation; configure the project's email provider before testing signup.

Never commit secrets. Do not expose Supabase secret/service-role keys to the browser. The current authentication flow uses the publishable key and user-scoped JWT. Server-only privileged operations must use a server-side secret key and revalidate the caller's workspace membership.

## Database

Migrations live in `supabase/migrations`. Apply them in version order to the intended development project only. The current schema includes organizations, memberships, agency-client relationships, contractor profiles, leads, lead events, follow-up tasks, appointment requests, and Gmail mailbox/message/send-audit data.

RLS is enabled on application tables. Anonymous table privileges are revoked; authenticated privileges are granted with least privilege. Organization and membership provisioning is handled by an ownership-constrained RPC and RLS policies. Derive tenant access from verified user and membership records; never trust a client-supplied tenant ID as authorization.

## Project status

- **Sprint 1 — Foundation:** Next.js application, landing page, repository setup, and GitHub Actions CI implemented.
- **Sprint 2 — Multi-tenancy:** Organization and membership schema, indexes, same-tenant foreign keys, least-privilege grants, and RLS applied to the development Supabase project. Two-account end-to-end isolation testing remains outstanding. The latest audit also identified a SECURITY DEFINER workspace-provisioning function that needs a focused authorization review, plus the optional Auth leaked-password protection setting.
- **Sprint 3 — Authentication and onboarding:** Email/password authentication, confirmation callback, protected dashboard, generated database types, and agency/contractor workspace onboarding implemented. Live signup and confirmation testing remains outstanding.
- **Sprint 4 — CRM workflow:** Lead pipeline, lead details, activity timeline, follow-up tasks, and atomic AI lead qualification implemented. Full workflow and multi-user verification remain outstanding.
- **Sprint 5 — Agency clients:** Agency client directory, contractor profiles, and contractor-owner invitation acceptance implemented. Invitation email delivery and end-to-end acceptance testing remain outstanding.
- **Sprint 6 — AI qualification:** Gemini inquiry extraction, intent classification, human-reviewed reply drafts, and deterministic five-factor lead scoring implemented in code. A configured server-side Gemini API key and live end-to-end verification are still required.
- **Sprint 7 — Gmail:** On the `sprint-7-email-foundation` branch: Gmail OAuth/PKCE, encrypted tenant-scoped credentials, server-side token refresh, bounded imports and incremental History API sync, searchable inbox, exact-match same-workspace lead linking, explicit human-approved replies, send audit records, and disconnect/revocation handling are implemented. The Gmail token-column privilege migration is applied to the development project and its repository filename now matches the recorded migration version. Live OAuth, sync, send, disconnect/revocation, and tenant-isolation tests remain outstanding. Outlook / Microsoft 365 is a Coming soon placeholder only; no Microsoft OAuth is implemented. Calendar integration is not included.
- **Sprint 8 — WhatsApp:** Not started.
- **Sprint 9 — Workflow automation:** Not started.
- **Sprint 10 — Hardening:** Full end-to-end, security, tenant-isolation, and production-readiness verification remains outstanding.

The Sprint 7 branch is under review in [PR #9](https://github.com/studio23webdezign/kingleadflow/pull/9). The illustrated dashboard redesign is under separate review in [PR #8](https://github.com/studio23webdezign/kingleadflow/pull/8). Neither PR should be considered deployed merely because its branch CI passes.

## Product principles

- Agency-first, independent SaaS; not an official King Contractor product.
- Multiple contractor workspaces per agency.
- Tenant isolation enforced server-side and with database RLS.
- Appointment requests are not treated as confirmed bookings.
- Follow-ups are task-based until consent-aware messaging integrations are enabled.
- Demo data must be fictional unless explicit permission is granted.
- AI-generated replies remain drafts; outbound email requires explicit human approval.

## AI qualification setup

Add `GEMINI_API_KEY` from Google AI Studio to the server environment. Optionally set `GEMINI_MODEL` (the application default is configured in code). The key must never use a `NEXT_PUBLIC_` prefix. The server sends structured-output requests through Gemini's Interactions API with `store: false`; application-side Zod validation and deterministic scoring run before a lead is saved. Suggested replies are drafts only and are never sent automatically.

## Gmail integration setup

Configure these server-side environment variables before live testing:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `EMAIL_TOKEN_ENCRYPTION_KEY`
- `SUPABASE_SECRET_KEY`

Use the exact callback URL registered in Google Cloud and configured for the deployed application. Keep all OAuth credentials and encryption keys server-only. Complete live connection, synchronization, approved sending, disconnect/revocation, and cross-tenant isolation tests before treating Gmail as production-ready.
