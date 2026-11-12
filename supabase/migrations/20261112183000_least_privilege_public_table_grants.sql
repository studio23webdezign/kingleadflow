-- Remove broad default table grants and expose only required operations.
revoke all privileges on all tables in schema public from public, anon, authenticated;

grant select on table
  public.organizations,
  public.organization_memberships
to authenticated;

grant select, insert, update, delete on table public.agency_clients to authenticated;
grant select, insert, update on table public.contractor_profiles to authenticated;
grant select, insert, update on table public.leads to authenticated;
grant select, insert on table public.lead_events to authenticated;
grant select, insert, update on table public.follow_up_tasks to authenticated;
grant select, insert, update on table public.appointment_requests to authenticated;

-- Keep future tables closed by default; each migration must explicitly grant access.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
