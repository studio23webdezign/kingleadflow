# KING LEADFLOW AI

Independent, agency-first lead management and AI receptionist platform for agencies serving contractor businesses.

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS
- Supabase PostgreSQL, Auth, and Row Level Security
- Gemini Interactions API behind a server-only provider boundary (active MVP provider)
- Render hosting (planned)

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

In Supabase Auth URL Configuration, set the local site URL and allow the callback URL `http://localhost:3000/auth/callback`. Add the production origin and callback after deployment. Email/password signup currently uses email confirmation; configure the project's email provider before testing signup.

Never commit secrets. Do not expose Supabase secret/service-role keys to the browser. The current authentication flow uses only the publishable key and user-scoped JWT.

## Database

Migrations live in `supabase/migrations`. Apply them in version order. The current schema includes organizations, memberships, agency-client relationships, contractor profiles, leads, lead events, follow-up tasks, and appointment requests.

RLS is enabled on every application table. Anonymous table privileges are revoked; authenticated table privileges are granted per table using least privilege. Organization and membership provisioning is handled by a SECURITY INVOKER RPC and ownership-constrained RLS policies. Keep tenant IDs out of trusted authorization decisions: derive access from the verified user and membership records.

## Project status

- Sprint 1: Next.js foundation, landing page, repository setup, and GitHub Actions CI — implemented; earlier CI runs passed.
- Sprint 2: multi-tenant schema, indexes, same-tenant foreign keys, least-privilege grants, and RLS — applied to the development Supabase project. Security advisor is clean; two-account end-to-end isolation tests remain.
- Sprint 3: email/password authentication, confirmation callback, protected dashboard, generated database types, and agency/contractor workspace onboarding — implemented; live signup and confirmation testing remains.
- Sprint 4: lead pipeline, lead details, activity timeline, and follow-up tasks — implemented; event writes are not yet wrapped with lead writes in a database transaction.
- Sprint 5: agency client directory, contractor profiles, and contractor-owner invitation acceptance — implemented. Invitation security is tightened with column-level grants and RLS; invitation email delivery remains planned.
- Sprint 6: Gemini inquiry extraction, intent classification, human-reviewed reply drafts, and deterministic five-factor lead scoring — implemented in code. Add a server-side Gemini API key and pass CI plus end-to-end testing before calling it verified.
- Sprint 7: Gmail OAuth/PKCE connection, encrypted tenant-scoped credentials, server-side access-token refresh, tenant-authorized thread listing, bounded manual message synchronization, and exact-match CRM lead linking are implemented on `sprint-7-email-foundation`. Unambiguous sender/recipient email matches are linked only within the same contractor workspace and recorded in the lead activity timeline; ambiguous matches remain unlinked. Outlook / Microsoft 365 remains a Coming soon placeholder. Incremental Gmail History API sync with persisted cursors and bounded recovery plus a searchable conversation inbox and an explicit human-approved reply flow with recipient confirmation and a send audit trail are implemented in code; disconnect/revocation, calendar, migration application, and production verification remain in progress.

## Product principles

- Agency-first, independent SaaS; not an official King Contractor product.
- Multiple contractor workspaces per agency.
- Tenant isolation enforced server-side and with database RLS.
- Appointment requests are not treated as confirmed bookings.
- Follow-ups are task-based until consent-aware messaging integrations exist.
- Demo data must be fictional unless explicit permission is granted.

## AI qualification setup

Add `GEMINI_API_KEY` from Google AI Studio to the server environment. Optionally set `GEMINI_MODEL` (defaults to `gemini-3.8-flash`). The key must never use a `NEXT_PUBLIC_` prefix. The server sends structured-output requests through Gemini's Interactions API with `store: false`; application-side Zod validation and deterministic scoring run before a lead is saved. Suggested replies are drafts only and are never sent automatically.
