-- Gmail OAuth connection records. Tokens are encrypted by the application before storage.
create table public.email_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connected_by uuid not null references auth.users(id) on delete restrict,
  provider text not null check (provider in ('google')),
  provider_account_id text not null,
  provider_email text not null,
  encrypted_tokens text not null,
  granted_scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected','reauthorization_required','disconnected')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_account_id)
);

create index email_connections_org_idx on public.email_connections (organization_id, provider);
alter table public.email_connections enable row level security;
revoke all on public.email_connections from anon, authenticated;
grant select, insert, update, delete on public.email_connections to authenticated;

-- Only workspace owners/admins may read connection metadata or encrypted token
-- blobs. Do not grant ordinary members SELECT access to this table.
create policy "workspace admins can view email connections"
on public.email_connections for select to authenticated
using (exists (
  select 1 from public.organization_memberships m
  where m.organization_id = email_connections.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
));

create policy "workspace admins can insert email connections"
on public.email_connections for insert to authenticated
with check (exists (
  select 1 from public.organization_memberships m
  where m.organization_id = email_connections.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
));

create policy "workspace admins can update email connections"
on public.email_connections for update to authenticated
using (exists (
  select 1 from public.organization_memberships m
  where m.organization_id = email_connections.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
))
with check (exists (
  select 1 from public.organization_memberships m
  where m.organization_id = email_connections.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
));

create policy "workspace admins can delete email connections"
on public.email_connections for delete to authenticated
using (exists (
  select 1 from public.organization_memberships m
  where m.organization_id = email_connections.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
));

create trigger email_connections_set_updated_at before update on public.email_connections
for each row execute function private.set_updated_at();
