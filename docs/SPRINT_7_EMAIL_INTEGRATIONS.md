# Sprint 7 — Gmail integration (Outlook placeholder)

## Scope and delivery sequence

1. Gmail / Google Workspace is the only email provider in the active implementation scope.
2. Implement Google OAuth authorization-code flow with PKCE and secure callback validation.
3. Add encrypted, tenant-scoped token persistence and refresh/revocation handling.
4. Add Gmail message/thread sync with cursor checkpoints and idempotent upserts.
5. Add lead activity timeline entries and human-approved outbound replies.
6. Add Gmail integration settings, disconnect controls, audit events and provider tests.
7. Display Outlook / Microsoft 365 as a clearly marked **Coming soon** placeholder. Do not expose a connect action or request Microsoft credentials yet.

## Current foundation

- `lib/integrations/email/types.ts` defines normalized addresses/messages and a provider adapter contract.
- `lib/integrations/email/registry.ts` reports Gmail configuration readiness and returns Outlook as `coming_soon`.
- Configuration readiness is not OAuth consent or a successful mailbox connection.
- The Outlook descriptor is UI metadata only; no Microsoft OAuth or Graph API implementation is in scope.

## Required server-side environment

Gmail:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

Shared:
- `EMAIL_TOKEN_ENCRYPTION_KEY` — dedicated high-entropy key for authenticated encryption of refresh/access tokens. Do not reuse the Supabase key or a JWT secret.

Configure these as private Render environment variables, never as `NEXT_PUBLIC_*` variables. Redirect URIs must exactly match the registered Google OAuth callback URL.

## Security requirements before enabling Gmail mailbox access

- Use OAuth authorization code flow with PKCE, cryptographically random state, short-lived state storage, and exact redirect URI validation.
- Request least-privilege scopes; explain that sending permission is used only after a user approves a draft.
- Encrypt tokens at rest with authenticated encryption and key versioning. Never return tokens to client components or log them.
- Bind each mailbox connection to an organization and the authorizing user. Enforce organization membership and RLS on every read/write.
- Verify callback state, issuer, audience, nonce where applicable, and token response before persisting credentials.
- Refresh tokens server-side; handle rotation, revoked consent, expiry and provider throttling.
- Deduplicate synced messages by provider + mailbox + provider message ID; store sync cursors per mailbox.
- Record approval actor, approved content hash, recipient, timestamp and send result. Do not send AI drafts automatically.
- Disconnect must revoke provider consent where supported and delete encrypted credentials and sync cursors.

## Not yet implemented

Gmail OAuth routes, credential storage migration, Gmail API adapter, message sync, message UI, send approval endpoint, calendar integration and end-to-end provider tests. Do not expose a Gmail Connect button until those flows and their tenant-isolation tests are complete.
