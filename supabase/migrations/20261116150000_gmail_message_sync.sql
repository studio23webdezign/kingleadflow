-- Idempotent Gmail message storage. Bodies and headers are tenant-private CRM data.
alter table public.email_connections
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_sync_history_id text;

create table public.gmail_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email_connection_id uuid not null references public.email_connections(id) on delete cascade,
  provider_message_id text not null,
  provider_thread_id text not null,
  subject text not null default '',
  from_name text,
  from_email text not null default '',
  to_addresses jsonb not null default '[]'::jsonb,
  snippet text not null default '',
  text_body text,
  html_body text,
  received_at timestamptz,
  internal_date_ms bigint,
  label_ids text[] not null default '{}',
  synced_at timestamptz not null default now(),
  unique (email_connection_id, provider_message_id)
);

create index gmail_messages_org_received_idx
  on public.gmail_messages (organization_id, received_at desc);
create index gmail_messages_thread_idx
  on public.gmail_messages (email_connection_id, provider_thread_id);

alter table public.gmail_messages enable row level security;
revoke all on public.gmail_messages from anon, authenticated;
grant select, insert, update, delete on public.gmail_messages to authenticated;

create policy "workspace admins can view Gmail messages"
on public.gmail_messages for select to authenticated
using (exists (
  select 1 from public.organization_memberships m
  where m.organization_id = gmail_messages.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
));

create policy "workspace admins can insert Gmail messages"
on public.gmail_messages for insert to authenticated
with check (exists (
  select 1 from public.organization_memberships m
  join public.email_connections c on c.organization_id = m.organization_id
  where c.id = gmail_messages.email_connection_id
    and c.organization_id = gmail_messages.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
));

create policy "workspace admins can update Gmail messages"
on public.gmail_messages for update to authenticated
using (exists (
  select 1 from public.organization_memberships m
  join public.email_connections c on c.organization_id = m.organization_id
  where c.id = gmail_messages.email_connection_id
    and c.organization_id = gmail_messages.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
))
with check (exists (
  select 1 from public.organization_memberships m
  join public.email_connections c on c.organization_id = m.organization_id
  where c.id = gmail_messages.email_connection_id
    and c.organization_id = gmail_messages.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
));

create policy "workspace admins can delete Gmail messages"
on public.gmail_messages for delete to authenticated
using (exists (
  select 1 from public.organization_memberships m
  join public.email_connections c on c.organization_id = m.organization_id
  where c.id = gmail_messages.email_connection_id
    and c.organization_id = gmail_messages.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
));
