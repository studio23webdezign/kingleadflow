-- Persist an AI-qualified lead and its audit event as one transaction.
-- The SECURITY DEFINER function performs its own tenant authorization check.

create or replace function public.create_ai_qualified_lead(
  p_contractor_organization_id uuid,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_service_requested text,
  p_postal_code text,
  p_description text,
  p_score smallint,
  p_priority text,
  p_score_reasons jsonb,
  p_event_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_lead_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_score is null or p_score < 0 or p_score > 100
     or p_priority not in ('low', 'medium', 'high')
     or jsonb_typeof(coalesce(p_score_reasons, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_event_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid lead qualification data' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_contractor_organization_id
      and m.user_id = v_user_id
      and m.role in ('contractor_owner', 'contractor_staff')
  ) and not exists (
    select 1
    from public.agency_clients ac
    join public.organization_memberships m
      on m.organization_id = ac.agency_organization_id
    where ac.contractor_organization_id = p_contractor_organization_id
      and ac.status = 'active'
      and m.user_id = v_user_id
      and m.role in ('agency_owner', 'agency_admin', 'agency_manager', 'agency_staff')
  ) then
    raise exception 'Not authorized for contractor workspace' using errcode = '42501';
  end if;

  insert into public.leads (
    contractor_organization_id,
    source,
    contact_name,
    email,
    phone,
    service_requested,
    postal_code,
    description,
    score,
    priority,
    score_reasons
  ) values (
    p_contractor_organization_id,
    'ai_receptionist',
    nullif(trim(p_contact_name), ''),
    nullif(trim(p_email), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_service_requested), ''),
    nullif(trim(p_postal_code), ''),
    p_description,
    p_score,
    p_priority,
    coalesce(p_score_reasons, '[]'::jsonb)
  )
  returning id into v_lead_id;

  insert into public.lead_events (
    contractor_organization_id,
    lead_id,
    actor_user_id,
    event_type,
    payload
  ) values (
    p_contractor_organization_id,
    v_lead_id,
    v_user_id,
    'ai_qualified',
    coalesce(p_event_payload, '{}'::jsonb)
  );

  return v_lead_id;
end;
$$;

revoke all on function public.create_ai_qualified_lead(
  uuid, text, text, text, text, text, text, smallint, text, jsonb, jsonb
) from public, anon;

grant execute on function public.create_ai_qualified_lead(
  uuid, text, text, text, text, text, text, smallint, text, jsonb, jsonb
) to authenticated;
