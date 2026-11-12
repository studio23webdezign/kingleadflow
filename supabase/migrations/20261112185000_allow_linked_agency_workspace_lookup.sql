-- Linked agencies may read only the basic organization records for active clients.
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
on public.organizations for select to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.organization_memberships m
    where m.organization_id = organizations.id
      and m.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.agency_clients ac
    join public.organization_memberships m
      on m.organization_id = ac.agency_organization_id
    where ac.contractor_organization_id = organizations.id
      and ac.status = 'active'
      and m.user_id = (select auth.uid())
  )
);
