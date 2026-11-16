-- Match the composite mailbox/workspace foreign key column order.
create index gmail_messages_connection_tenant_idx
  on public.gmail_messages (email_connection_id, organization_id);
