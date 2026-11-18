-- Keep encrypted OAuth credentials inaccessible to authenticated PostgREST clients.
-- OAuth callback, refresh, and disconnect use the server-only Supabase secret client
-- after verifying the caller's current workspace membership.
revoke all on table public.email_connections from anon, authenticated;

grant select (
  id,
  organization_id,
  connected_by,
  provider,
  provider_account_id,
  provider_email,
  granted_scopes,
  status,
  connected_at,
  updated_at,
  last_sync_at,
  last_sync_history_id
) on table public.email_connections to authenticated;

-- User-session sync may update only its non-secret cursor/timestamp fields.
grant update (last_sync_at, last_sync_history_id)
  on table public.email_connections to authenticated;

-- RLS policies continue to enforce workspace-admin access for all granted columns.
