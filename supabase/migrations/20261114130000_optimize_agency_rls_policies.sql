-- Optimize agency invitation and client RLS policy evaluation.
-- Preserve existing authorization semantics while evaluating JWT helpers once per statement.

drop policy if exists invitations_select_agency_or_invitee
  on public.agency_client_invitations;

create policy invitations_select_agency_or_invitee
  on public.agency_client_invitations
  for select
  to authenticated
  using (
    invited_email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    or exists (
      select 1
      from public.organization_memberships m
      where m.organization_id = agency_client_invitations.agency_organization_id
        and m.user_id = (select auth.uid())
        and m.role = any (array[
          'agency_owner',
          'agency_admin',
          'agency_manager',
          'agency_staff'
        ])
    )
  );

-- PostgreSQL OR-combines permissive policies. Keep USING and WITH CHECK
-- as separate OR expressions to preserve the original combined semantics.
drop policy if exists invitations_update_agency_managers
  on public.agency_client_invitations;
drop policy if exists invitations_update_invitee_accept
  on public.agency_client_invitations;

create policy invitations_update_agency_or_invitee
  on public.agency_client_invitations
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships m
      where m.organization_id = agency_client_invitations.agency_organization_id
        and m.user_id = (select auth.uid())
        and m.role = any (array[
          'agency_owner',
          'agency_admin',
          'agency_manager'
        ])
    )
    or (
      invited_email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
      and status = 'pending'
      and expires_at > now()
    )
  )
  with check (
    (
      exists (
        select 1
        from public.organization_memberships m
        where m.organization_id = agency_client_invitations.agency_organization_id
          and m.user_id = (select auth.uid())
          and m.role = any (array[
            'agency_owner',
            'agency_admin',
            'agency_manager'
          ])
      )
      and status = any (array['pending', 'revoked', 'expired'])
      and contractor_organization_id is null
      and accepted_at is null
      and accepted_by is null
    )
    or (
      invited_email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
      and status = 'accepted'
      and accepted_by = (select auth.uid())
      and accepted_at is not null
      and contractor_organization_id is not null
      and exists (
        select 1
        from public.organization_memberships m
        join public.organizations o on o.id = m.organization_id
        where m.organization_id = agency_client_invitations.contractor_organization_id
          and m.user_id = (select auth.uid())
          and m.role = 'contractor_owner'
          and o.kind = 'contractor'
      )
    )
  );

drop policy if exists agency_clients_insert_invited_contractor_owner
  on public.agency_clients;

create policy agency_clients_insert_invited_contractor_owner
  on public.agency_clients
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.organization_memberships m
      where m.organization_id = agency_clients.contractor_organization_id
        and m.user_id = (select auth.uid())
        and m.role = 'contractor_owner'
    )
    and exists (
      select 1
      from public.agency_client_invitations i
      where i.agency_organization_id = agency_clients.agency_organization_id
        and i.contractor_organization_id = agency_clients.contractor_organization_id
        and i.status = 'accepted'
        and i.accepted_by = (select auth.uid())
        and i.invited_email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    )
  );
