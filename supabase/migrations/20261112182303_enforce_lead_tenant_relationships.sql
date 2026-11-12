-- Ensure child records cannot point at a lead belonging to a different tenant.
alter table public.leads
  add constraint leads_id_contractor_org_unique
  unique (id, contractor_organization_id);

alter table public.lead_events
  add constraint lead_events_lead_same_tenant_fk
  foreign key (lead_id, contractor_organization_id)
  references public.leads (id, contractor_organization_id)
  on delete cascade;

alter table public.follow_up_tasks
  add constraint follow_up_tasks_lead_same_tenant_fk
  foreign key (lead_id, contractor_organization_id)
  references public.leads (id, contractor_organization_id)
  on delete set null (lead_id);

alter table public.appointment_requests
  add constraint appointment_requests_lead_same_tenant_fk
  foreign key (lead_id, contractor_organization_id)
  references public.leads (id, contractor_organization_id)
  on delete set null (lead_id);
