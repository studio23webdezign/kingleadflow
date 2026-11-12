# KING LEADFLOW AI

Independent, agency-first lead management and AI receptionist platform for agencies serving contractor businesses.

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS
- Supabase PostgreSQL, Auth, and Row Level Security
- Gemini through a provider abstraction (planned)
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

RLS is enabled on every application table. Anonymous table privileges are revoked; authenticated table privileges are granted per table using least privilege. Organization and membership provisioning remains server-controlled. Keep tenant IDs out of trusted authorization decisions: derive access from the verified user and membership records.

## Project status

- Sprint 1: foundation and CI — implemented.
- Sprint 2: multi-tenant schema, indexes, same-tenant foreign keys, and least-privilege grants — applied to the development Supabase project. End-to-end RLS tests are still required.
- Sprint 3: email/password authentication and protected dashboard — initial implementation in progress.
- AI, lead workflows, integrations, and production deployment — planned.

## Product principles

- Agency-first, independent SaaS; not an official King Contractor product.
- Multiple contractor workspaces per agency.
- Tenant isolation enforced server-side and with database RLS.
- Appointment requests are not treated as confirmed bookings.
- Follow-ups are task-based until consent-aware messaging integrations exist.
- Demo data must be fictional unless explicit permission is granted.
