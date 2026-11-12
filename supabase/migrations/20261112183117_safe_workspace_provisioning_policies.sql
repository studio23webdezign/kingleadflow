-- Allow a user to see an organization they created during the atomic onboarding flow.
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.organization_memberships m
      where m.organization_id = organizations.id
        and m.user_id = (select auth.uid())
    )
  );

-- A user may create an organization only in their own name.
create policy organizations_insert_self on public.organizations
  for insert to authenticated
  with check (created_by = (select auth.uid()));

-- A user may only claim the matching owner role for an organization they created.
create policy memberships_insert_initial_owner on public.organization_memberships
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (role = 'agency_owner' and exists (
        select 1 from public.organizations o
        where o.id = organization_memberships.organization_id
          and o.created_by = (select auth.uid())
          and o.kind = 'agency'
      ))
      or
      (role = 'contractor_owner' and exists (
        select 1 from public.organizations o
        where o.id = organization_memberships.organization_id
          and o.created_by = (select auth.uid())
          and o.kind = 'contractor'
      ))
    )
  );

grant insert on table public.organizations, public.organization_memberships to authenticated;

-- The RPC runs with caller privileges and is constrained by the policies above.
create or replace function public.create_organization_for_current_user(
  p_name text,
  p_slug text,
  p_kind text
)
returns uuid
language plpgsql
security invoker
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
