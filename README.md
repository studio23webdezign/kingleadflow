# KING LEADFLOW AI

Independent, multi-tenant lead management and AI receptionist platform for agencies serving contractor businesses.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Row Level Security)
- Gemini via a provider abstraction (planned)
- Render deployment (planned)

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Environment

See `.env.example`. Never commit secrets. Supabase service-role credentials must remain server-side only.

## Project status

Sprint 1: application foundation. Database schema, authentication, tenant isolation, and AI features are scheduled for later sprints.

## Product principles

- Agency-first, independent SaaS
- Multiple contractor workspaces per agency
- Tenant isolation enforced on the server and with database RLS
- Appointment requests are not treated as confirmed bookings
- Demo data must be fictional unless explicit permission is granted
