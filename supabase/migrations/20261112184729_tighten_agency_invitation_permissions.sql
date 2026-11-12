-- Close bypasses around invitation acceptance.
drop policy if exists agency_clients_insert_agency_staff on public.agency_clients;
revoke update on public.agency_client_invitations from authenticated;
grant update (status, contractor_organization_id, accepted_at, accepted_by)
  on public.agency_client_invitations to authenticated;
revoke insert on public.agency_client_invitations from authenticated;
grant insert (agency_organization_id, invited_email, invited_by)
  on public.agency_client_invitations to authenticated;
