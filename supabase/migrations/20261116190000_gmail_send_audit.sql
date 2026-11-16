-- Immutable approval context and delivery outcome for human-initiated Gmail sends.
create table public.email_send_audit (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email_connection_id uuid not null references public.email_connections(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  recipient_email text not null,
  subject text not null,
  body_sha256 text not null,
  status text not null check (status in ('approved','sent','failed')),
  provider_message_id text,
  error_code text,
  approved_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_send_audit_connection_tenant_fk
    foreign key (email_connection_id, organization_id)
    references public.email_connections(id, organization_id)
);

create index email_send_audit_org_created_idx
  on public.email_send_audit (organization_id, created_at desc);

alter table public.email_send_audit enable row level security;
revoke all on public.email_send_audit from anon, authenticated;
grant select, insert, update on public.email_send_audit to authenticated;

create policy "workspace admins can view email send audit"
on public.email_send_audit for select to authenticated
using (exists (
  select 1 from public.organization_memberships m
  where m.organization_id = email_send_audit.organization_id
    and m.user_id = (select auth.uid())
    and m.role in ('agency_owner','agency_admin','contractor_owner')
));

create policy "workspace admins can record approved email sends"
on public.email_send_audit for insert to authenticated
with check (
  actor_user_id = (select auth.uid())
  and status = 'approved'
  and exists (
    select 1 from public.organization_memberships m
    join public.email_connections c on c.organization_id = m.organization_id
    where m.organization_id = email_send_audit.organization_id
      and c.id = email_send_audit.email_connection_id
      and c.organization_id = email_send_audit.organization_id
      and c.provider = 'google'
      and c.status = 'connected'
      and m.user_id = (select auth.uid())
      and m.role in ('agency_owner','agency_admin','contractor_owner')
  )
);

create policy "workspace admins can update email send outcome"
on public.email_send_audit for update to authenticated
using (
  actor_user_id = (select auth.uid())
  and exists (
    select 1 from public.organization_memberships m
    where m.organization_id = email_send_audit.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('agency_owner','agency_admin','contractor_owner')
  )
)
with check (
  actor_user_id = (select auth.uid())
  and status in ('sent','failed')
);
