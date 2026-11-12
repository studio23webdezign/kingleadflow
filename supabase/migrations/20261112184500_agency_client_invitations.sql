-- Agency-to-contractor invitations. Acceptance is restricted to the invited email
-- and a contractor_owner membership; no service-role key or SECURITY DEFINER RPC.
create table public.agency_client_invitations (
  id uuid primary key default gen_random_uuid(),
  agency_organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_email text not null check (invited_email = lower(trim(invited_email)) and length(invited_email) between 5 and 254),
  invited_by uuid not null references auth.users(id) on delete restrict,
  contractor_organization_id uuid references public.organizations(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  check (expires_at > created_at),
  check ((status = 'accepted') = (contractor_organization_id is not null and accepted_at is not null and accepted_by is not null))
);
create index agency_client_invitations_agency_idx on public.agency_client_invitations (agency_organization_id, status, created_at desc);
create index agency_client_invitations_email_idx on public.agency_client_invitations (lower(invited_email), status, expires_at);
alter table public.agency_client_invitations enable row level security;
revoke all on public.agency_client_invitations from public, anon, authenticated;
grant select, insert, update on public.agency_client_invitations to authenticated;
create policy invitations_select_agency_or_invitee on public.agency_client_invitations for select to authenticated using (
 invited_email = lower(coalesce(auth.jwt() ->> 'email','')) or exists (
  select 1 from public.organization_memberships m where m.organization_id=agency_client_invitations.agency_organization_id and m.user_id=(select auth.uid()) and m.role in ('agency_owner','agency_admin','agency_manager','agency_staff')
 ));
create policy invitations_insert_agency_managers on public.agency_client_invitations for insert to authenticated with check (
 invited_by=(select auth.uid()) and status='pending' and contractor_organization_id is null and accepted_at is null and accepted_by is null and exists (
  select 1 from public.organization_memberships m where m.organization_id=agency_client_invitations.agency_organization_id and m.user_id=(select auth.uid()) and m.role in ('agency_owner','agency_admin','agency_manager')
 ));
create policy invitations_update_agency_managers on public.agency_client_invitations for update to authenticated using (
 exists (select 1 from public.organization_memberships m where m.organization_id=agency_client_invitations.agency_organization_id and m.user_id=(select auth.uid()) and m.role in ('agency_owner','agency_admin','agency_manager'))
) with check (
 exists (select 1 from public.organization_memberships m where m.organization_id=agency_client_invitations.agency_organization_id and m.user_id=(select auth.uid()) and m.role in ('agency_owner','agency_admin','agency_manager'))
 and status in ('pending','revoked','expired') and contractor_organization_id is null and accepted_at is null and accepted_by is null
);
create policy invitations_update_invitee_accept on public.agency_client_invitations for update to authenticated using (
 invited_email=lower(coalesce(auth.jwt() ->> 'email','')) and status='pending' and expires_at>now()
) with check (
 invited_email=lower(coalesce(auth.jwt() ->> 'email','')) and status='accepted' and accepted_by=(select auth.uid()) and accepted_at is not null and contractor_organization_id is not null and exists (
  select 1 from public.organization_memberships m join public.organizations o on o.id=m.organization_id
  where m.organization_id=agency_client_invitations.contractor_organization_id and m.user_id=(select auth.uid()) and m.role='contractor_owner' and o.kind='contractor'
 ));
create policy agency_clients_insert_invited_contractor_owner on public.agency_clients for insert to authenticated with check (
 exists (select 1 from public.organization_memberships m where m.organization_id=agency_clients.contractor_organization_id and m.user_id=(select auth.uid()) and m.role='contractor_owner')
 and exists (select 1 from public.agency_client_invitations i where i.agency_organization_id=agency_clients.agency_organization_id and i.contractor_organization_id=agency_clients.contractor_organization_id and i.status='accepted' and i.accepted_by=(select auth.uid()) and i.invited_email=lower(coalesce(auth.jwt() ->> 'email','')))
);
