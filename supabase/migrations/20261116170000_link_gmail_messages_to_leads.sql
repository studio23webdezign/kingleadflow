-- Link Gmail messages to CRM leads within the same workspace.
alter table public.gmail_messages
  add column lead_id uuid references public.leads(id) on delete set null;

create index gmail_messages_lead_received_idx
  on public.gmail_messages (lead_id, received_at desc)
  where lead_id is not null;

-- Enforce tenant consistency even when an existing permissive RLS policy allows the update.
create or replace function private.enforce_gmail_message_lead_tenant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.lead_id is not null and not exists (
    select 1 from public.leads l
    where l.id = new.lead_id
      and l.contractor_organization_id = new.organization_id
  ) then
    raise exception 'Gmail message and lead must belong to the same workspace';
  end if;
  return new;
end;
$$;

create trigger gmail_messages_enforce_lead_tenant
before insert or update of lead_id, organization_id on public.gmail_messages
for each row execute function private.enforce_gmail_message_lead_tenant();
