-- KING LEADFLOW AI
-- Initial multi-tenant foundation. All tenant data is protected by RLS.
-- Authorization is based on organization_memberships, never user-editable metadata.

create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  kind text not null check (kind in ('agency', 'contractor')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in (
    'agency_owner', 'agency_admin', 'agency_manager', 'agency_staff',
    'contractor_owner', 'contractor_staff'
  )),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_memberships_user_org_idx
  on public.organization_memberships (user_id, organization_id);

create table public.agency_clients (
  id uuid primary key default gen_random_uuid(),
  agency_organization_id uuid not null references public.organizations(id) on delete cascade,
  contractor_organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 2 and 160),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  unique (agency_organization_id, contractor_organization_id),
  check (agency_organization_id <> contractor_organization_id)
);

create index agency_clients_contractor_idx
  on public.agency_clients (contractor_organization_id, status);

create table public.contractor_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  business_name text not null check (length(trim(business_name)) between 2 and 180),
  phone text,
  website text,
  services text[] not null default '{}',
  service_areas text[] not null default '{}',
  timezone text not null default 'Africa/Johannesburg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  contractor_organization_id uuid not null references public.organizations(id) on delete cascade,
  source text not null default 'manual' check (source in (
    'website_form', 'api', 'manual', 'import', 'ai_receptionist',
    'meta_lead_ads', 'google_ads', 'whatsapp', 'other'
  )),
  status text not null default 'new' check (status in (
    'new', 'contacted', 'qualified', 'appointment_requested',
    'appointment_booked', 'proposal_sent', 'won', 'lost'
  )),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  contact_name text,
  email text,
  phone text,
  service_requested text,
  description text,
  postal_code text,
  score smallint check (score between 0 and 100),
  score_reasons jsonb not null default '[]'::jsonb,
  consent_status text not null default 'unknown' check (consent_status in (
    'unknown', 'granted', 'denied', 'not_required'
  )),
  consent_captured_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_contractor_created_idx
  on public.leads (contractor_organization_id, created_at desc);
create index leads_contractor_status_idx
  on public.leads (contractor_organization_id, status, created_at desc);
create index leads_assigned_to_idx on public.leads (assigned_to);

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  contractor_organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (length(trim(event_type)) between 2 and 80),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index lead_events_lead_created_idx on public.lead_events (lead_id, created_at desc);

create table public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  contractor_organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null check (length(trim(title)) between 2 and 180),
  description text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index follow_up_tasks_org_due_idx
  on public.follow_up_tasks (contractor_organization_id, status, due_at);
create index follow_up_tasks_assignee_idx on public.follow_up_tasks (assigned_to);

create table public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  contractor_organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  requested_start_at timestamptz not null,
  requested_end_at timestamptz not null,
  timezone text not null default 'Africa/Johannesburg',
  status text not null default 'requested' check (status in (
    'requested', 'confirmed', 'declined', 'cancelled', 'completed'
  )),
  customer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_end_at > requested_start_at)
);

create index appointment_requests_org_start_idx
  on public.appointment_requests (contractor_organization_id, requested_start_at);

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger contractor_profiles_set_updated_at before update on public.contractor_profiles
  for each row execute function private.set_updated_at();
create trigger leads_set_updated_at before update on public.leads
  for each row execute function private.set_updated_at();
create trigger follow_up_tasks_set_updated_at before update on public.follow_up_tasks
  for each row execute function private.set_updated_at();
create trigger appointment_requests_set_updated_at before update on public.appointment_requests
  for each row execute function private.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.agency_clients enable row level security;
alter table public.contractor_profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.follow_up_tasks enable row level security;
alter table public.appointment_requests enable row level security;

-- A user's membership rows are visible only to that same authenticated user.
create policy memberships_select_self on public.organization_memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy organizations_select_member on public.organizations
  for select to authenticated
  using (exists (
    select 1 from public.organization_memberships m
    where m.organization_id = organizations.id
      and m.user_id = (select auth.uid())
  ));

create policy agency_clients_select_related on public.agency_clients
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = agency_clients.agency_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.organization_memberships m
      where m.organization_id = agency_clients.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
  );

create policy agency_clients_insert_agency_staff on public.agency_clients
  for insert to authenticated
  with check (exists (
    select 1 from public.organization_memberships m
    where m.organization_id = agency_clients.agency_organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('agency_owner', 'agency_admin', 'agency_manager')
  ));

create policy agency_clients_update_agency_staff on public.agency_clients
  for update to authenticated
  using (exists (
    select 1 from public.organization_memberships m
    where m.organization_id = agency_clients.agency_organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('agency_owner', 'agency_admin', 'agency_manager')
  ))
  with check (exists (
    select 1 from public.organization_memberships m
    where m.organization_id = agency_clients.agency_organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('agency_owner', 'agency_admin', 'agency_manager')
  ));

create policy agency_clients_delete_agency_admin on public.agency_clients
  for delete to authenticated
  using (exists (
    select 1 from public.organization_memberships m
    where m.organization_id = agency_clients.agency_organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('agency_owner', 'agency_admin')
  ));

create policy contractor_profiles_select_related on public.contractor_profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = contractor_profiles.organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m
        on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = contractor_profiles.organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  );

create policy contractor_profiles_insert_owner on public.contractor_profiles
  for insert to authenticated
  with check (exists (
    select 1 from public.organization_memberships m
    where m.organization_id = contractor_profiles.organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'contractor_owner'
  ));

create policy contractor_profiles_update_owner on public.contractor_profiles
  for update to authenticated
  using (exists (
    select 1 from public.organization_memberships m
    where m.organization_id = contractor_profiles.organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'contractor_owner'
  ))
  with check (exists (
    select 1 from public.organization_memberships m
    where m.organization_id = contractor_profiles.organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'contractor_owner'
  ));

-- Contractor members and linked agency members can work with a contractor's leads.
create policy leads_select_related on public.leads
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = leads.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m
        on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = leads.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  );

create policy leads_insert_related on public.leads
  for insert to authenticated
  with check (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = leads.contractor_organization_id
        and m.user_id = (select auth.uid())
        and m.role in ('contractor_owner', 'contractor_staff')
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m
        on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = leads.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
        and m.role in ('agency_owner', 'agency_admin', 'agency_manager', 'agency_staff')
    )
  );

create policy leads_update_related on public.leads
  for update to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = leads.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m
        on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = leads.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = leads.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m
        on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = leads.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  );

create policy lead_events_select_related on public.lead_events
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = lead_events.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = lead_events.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  );

create policy lead_events_insert_related on public.lead_events
  for insert to authenticated
  with check (
    actor_user_id = (select auth.uid())
    and (
      exists (
        select 1 from public.organization_memberships m
        where m.organization_id = lead_events.contractor_organization_id
          and m.user_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.agency_clients ac
        join public.organization_memberships m on m.organization_id = ac.agency_organization_id
        where ac.contractor_organization_id = lead_events.contractor_organization_id
          and ac.status = 'active'
          and m.user_id = (select auth.uid())
      )
    )
  );

create policy follow_up_tasks_select_related on public.follow_up_tasks
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = follow_up_tasks.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = follow_up_tasks.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  );

create policy follow_up_tasks_insert_related on public.follow_up_tasks
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      exists (
        select 1 from public.organization_memberships m
        where m.organization_id = follow_up_tasks.contractor_organization_id
          and m.user_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.agency_clients ac
        join public.organization_memberships m on m.organization_id = ac.agency_organization_id
        where ac.contractor_organization_id = follow_up_tasks.contractor_organization_id
          and ac.status = 'active'
          and m.user_id = (select auth.uid())
      )
    )
  );

create policy follow_up_tasks_update_related on public.follow_up_tasks
  for update to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = follow_up_tasks.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = follow_up_tasks.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = follow_up_tasks.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = follow_up_tasks.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  );

create policy appointment_requests_select_related on public.appointment_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = appointment_requests.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = appointment_requests.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  );

create policy appointment_requests_insert_related on public.appointment_requests
  for insert to authenticated
  with check (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = appointment_requests.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = appointment_requests.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  );

create policy appointment_requests_update_related on public.appointment_requests
  for update to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = appointment_requests.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = appointment_requests.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = appointment_requests.contractor_organization_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agency_clients ac
      join public.organization_memberships m on m.organization_id = ac.agency_organization_id
      where ac.contractor_organization_id = appointment_requests.contractor_organization_id
        and ac.status = 'active'
        and m.user_id = (select auth.uid())
    )
  );

-- Public schema is not automatically exposed by new Supabase projects after Oct 2026.
-- Grant only authenticated users table privileges; RLS still controls every row.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.organizations,
  public.organization_memberships,
  public.agency_clients,
  public.contractor_profiles,
  public.leads,
  public.lead_events,
  public.follow_up_tasks,
  public.appointment_requests
to authenticated;

-- Do not grant anon access. Onboarding and membership administration are server-only
-- operations until dedicated, narrowly-scoped RPCs are designed and security-reviewed.
