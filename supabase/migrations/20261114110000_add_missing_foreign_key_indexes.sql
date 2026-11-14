-- Cover foreign keys that are not served by existing non-partial indexes.
-- This improves parent-row updates/deletes and tenant-linked relationship checks.

create index if not exists agency_client_invitations_accepted_by_idx
  on public.agency_client_invitations (accepted_by);

create index if not exists agency_client_invitations_contractor_org_idx
  on public.agency_client_invitations (contractor_organization_id);

create index if not exists agency_client_invitations_invited_by_idx
  on public.agency_client_invitations (invited_by);

create index if not exists appointment_requests_lead_tenant_idx
  on public.appointment_requests (lead_id, contractor_organization_id);

create index if not exists follow_up_tasks_lead_tenant_idx
  on public.follow_up_tasks (lead_id, contractor_organization_id);

create index if not exists lead_events_lead_tenant_idx
  on public.lead_events (lead_id, contractor_organization_id);
