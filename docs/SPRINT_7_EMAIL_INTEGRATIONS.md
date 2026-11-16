# Sprint 7 — Gmail integration (Outlook placeholder)

## Scope

1. Gmail / Google Workspace is the only active email provider.
2. Outlook / Microsoft 365 remains a non-functional **Coming soon** placeholder. Do not request Microsoft credentials or add Microsoft permissions.
3. Customer email must never be sent without an explicit human approval action.

## Implemented on `sprint-7-email-foundation`

- Dashboard route: `/dashboard/integrations`; Gmail connection status and Outlook placeholder.
- Google OAuth authorization-code flow with PKCE, random state, short-lived HttpOnly cookies, and a workspace membership check.
- Callback re-checks the user's workspace role before exchanging the code and persisting credentials.
- Access and refresh tokens are encrypted with AES-256-GCM before storage in `email_connections`.
- RLS limits mailbox connection row access to workspace owners/admins; ordinary members cannot read encrypted credential records.
- Server-only Gmail client refreshes expired access tokens and stores refreshed credentials encrypted.
- Tenant-authorized API route lists Gmail threads without exposing provider tokens: `GET /api/integrations/google/threads?organization_id=<workspace-id>`.
- Manual sync retrieves a bounded batch of full Gmail threads, normalizes message headers and bodies, and idempotently upserts messages by mailbox + provider message ID.
- A manual **Sync recent messages** control is available on the integrations page; the sync endpoint re-checks workspace role before reading or writing mailbox data.
- Provider registry advertises Gmail configuration readiness and Outlook as `coming_soon`.

## Not yet implemented / not yet verified

- The migrations `20261116120000_gmail_email_connections.sql` and `20261116150000_gmail_message_sync.sql` have been committed but must be applied to the development Supabase database.
- The Google OAuth client must be configured and its redirect URI registered.
- Persistent inbox synchronization, message/thread detail retrieval, idempotent sync checkpoints, and lead timeline linking.
- Human-approved outbound send flow, approval audit trail, disconnect/revocation, and calendar.
- Automated OAuth/provider tests, tenant-isolation tests, CI verification, and live end-to-end connection testing.

## Required server-side environment

Gmail:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

Shared:
- `EMAIL_TOKEN_ENCRYPTION_KEY` — 32 random bytes encoded as 64 hexadecimal characters. Keep it separate from Supabase keys and JWT secrets.

Set these only as private Render environment variables, never as `NEXT_PUBLIC_*`. Register the exact callback URL `https://YOUR_DOMAIN/api/integrations/google/callback` in the Google OAuth client.

## Security requirements

- Keep all OAuth secrets and tokens server-side. Never log token responses or return encrypted token blobs to the browser.
- Verify state and PKCE on callback; re-check the signed-in user and their current workspace role before storing credentials.
- Encrypt tokens at rest with authenticated encryption. Back up the encryption key securely; rotating it requires a controlled re-encryption procedure.
- Restrict access to mailbox credentials to workspace owners/admins and enforce organization membership for every mailbox operation.
- Handle refresh-token expiry/revocation, provider throttling, and missing consent gracefully.
- Deduplicate synced messages by provider + mailbox + provider message ID and persist history cursors.
- Record approver, approved content hash, recipient, timestamp, and provider result for every outbound send.
- Do not send AI-generated drafts automatically.
- Disconnect must revoke provider consent where supported and delete stored credentials and sync cursors.
