-- Enforce that every Gmail message belongs to the same workspace as its mailbox.
-- The preflight confirmed there are currently no Gmail messages or mismatched rows.
alter table public.gmail_messages
  add constraint gmail_messages_connection_tenant_fk
  foreign key (email_connection_id, organization_id)
  references public.email_connections (id, organization_id)
  on delete cascade;

-- Cover the new composite FK and the user foreign keys flagged by Supabase advisors.
create index email_connections_connected_by_idx
  on public.email_connections (connected_by);

create index email_send_audit_actor_user_idx
  on public.email_send_audit (actor_user_id);

create index email_send_audit_connection_tenant_idx
  on public.email_send_audit (email_connection_id, organization_id);
