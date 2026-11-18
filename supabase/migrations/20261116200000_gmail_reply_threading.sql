alter table public.gmail_messages
  add column if not exists rfc_message_id text;

create index if not exists gmail_messages_rfc_message_id_idx
  on public.gmail_messages (rfc_message_id)
  where rfc_message_id is not null;
