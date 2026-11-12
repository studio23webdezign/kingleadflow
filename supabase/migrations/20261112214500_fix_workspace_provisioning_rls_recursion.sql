-- Workspace provisioning is a narrowly scoped, authenticated RPC.
-- SECURITY DEFINER avoids recursive RLS evaluation between the organization
-- and membership policies. The function validates auth.uid(), input bounds,
-- workspace type, and assigns only the caller's matching owner role.
alter function public.create_organization_for_current_user(text, text, text)
  security definer;

alter function public.create_organization_for_current_user(text, text, text)
  set search_path = '';

revoke all on function public.create_organization_for_current_user(text, text, text)
  from public, anon, authenticated;

grant execute on function public.create_organization_for_current_user(text, text, text)
  to authenticated;

comment on function public.create_organization_for_current_user(text, text, text)
  is 'Creates an organization and its initial owner membership for auth.uid(); SECURITY DEFINER is required to avoid recursive RLS policy evaluation.';
