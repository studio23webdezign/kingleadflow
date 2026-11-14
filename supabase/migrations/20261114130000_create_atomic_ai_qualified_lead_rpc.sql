-- Save an AI-qualified lead and its audit event in one transaction.
-- SECURITY INVOKER preserves the caller's RLS policies and table privileges.
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
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lead_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_contractor_organization_id is null
    or p_score is null or p_score < 0 or p_score > 100
    or p_priority is null or p_priority not in ('low', 'medium', 'high')
    or jsonb_typeof(coalesce(p_score_reasons, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_event_payload, '{}'::jsonb)) <> 'object'
    or length(coalesce(p_description, '')) > 8000 then
    raise exception 'Invalid AI lead data' using errcode = '22023';
  end if;

  insert into public.leads (
    contractor_organization_id, source, contact_name, email, phone,
    service_requested, postal_code, description, score, priority, score_reasons
  ) values (
    p_contractor_organization_id, 'ai_receptionist', p_contact_name, p_email, p_phone,
    p_service_requested, p_postal_code, p_description, p_score, p_priority,
    coalesce(p_score_reasons, '[]'::jsonb)
  )
  returning id into v_lead_id;

  insert into public.lead_events (
    contractor_organization_id, lead_id, actor_user_id, event_type, payload
  ) values (
    p_contractor_organization_id, v_lead_id, v_user_id, 'ai_qualified',
    coalesce(p_event_payload, '{}'::jsonb)
  );

  return v_lead_id;
end;
$$;

revoke all on function public.create_ai_qualified_lead(
  uuid, text, text, text, text, text, text, smallint, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.create_ai_qualified_lead(
  uuid, text, text, text, text, text, text, smallint, text, jsonb, jsonb
) to authenticated;

comment on function public.create_ai_qualified_lead(
  uuid, text, text, text, text, text, text, smallint, text, jsonb, jsonb
) is 'Atomically inserts an AI-qualified lead and its audit event under the authenticated caller RLS policies.';
