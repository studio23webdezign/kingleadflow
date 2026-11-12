-- Add covering indexes for foreign keys flagged by Supabase's performance advisor.
create index organizations_created_by_idx
  on public.organizations (created_by)
  where created_by is not null;

create index lead_events_contractor_org_idx
  on public.lead_events (contractor_organization_id);
create index lead_events_actor_user_idx
  on public.lead_events (actor_user_id)
  where actor_user_id is not null;

create index follow_up_tasks_lead_idx
  on public.follow_up_tasks (lead_id)
  where lead_id is not null;
create index follow_up_tasks_created_by_idx
  on public.follow_up_tasks (created_by)
  where created_by is not null;

create index appointment_requests_lead_idx
  on public.appointment_requests (lead_id)
  where lead_id is not null;
