create or replace function public.create_organization_for_current_user(
  p_name text,
  p_slug text,
  p_kind text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_slug text := lower(trim(p_slug));
  v_name text := trim(p_name);
  v_role text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(v_name) < 2 or length(v_name) > 160 then
    raise exception 'Organization name must be between 2 and 160 characters' using errcode = '22023';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_slug) > 80 then
    raise exception 'Organization slug is invalid' using errcode = '22023';
  end if;
  if p_kind not in ('agency', 'contractor') then
    raise exception 'Organization type is invalid' using errcode = '22023';
  end if;

  v_role := case when p_kind = 'agency' then 'agency_owner' else 'contractor_owner' end;
  insert into public.organizations (name, slug, kind, created_by)
  values (v_name, v_slug, p_kind, v_user_id)
  returning id into v_organization_id;
  insert into public.organization_memberships (organization_id, user_id, role)
  values (v_organization_id, v_user_id, v_role);
  return v_organization_id;
end;
$$;

revoke all on function public.create_organization_for_current_user(text, text, text) from public, anon, authenticated;
grant execute on function public.create_organization_for_current_user(text, text, text) to authenticated;
