# Sprint 7 — Email integrations (Gmail + Microsoft 365)

## Scope and delivery sequence

1. Provider-neutral email contracts and configuration discovery (foundation).
2. OAuth authorization-code + PKCE flows for Google and Microsoft.
3. Encrypted, tenant-scoped token persistence and refresh/revocation handling.
4. Message/thread sync with provider cursor checkpoints and idempotent upserts.
5. Lead activity timeline entries and human-approved outbound replies.
6. Integration settings UI, disconnect controls, audit events and provider tests.

## Foundation added

- `lib/integrations/email/types.ts` defines normalized addresses/messages and the adapter contract.
- `lib/integrations/email/registry.ts` exposes both providers and reports whether their server-side environment configuration is present.
- No provider is reported as connected by this foundation. Configuration readiness is not OAuth consent or a successful mailbox connection.

## Required server-side environment

Google:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

Microsoft:
- `MICROSOFT_OAUTH_CLIENT_ID`
- `MICROSOFT_OAUTH_CLIENT_SECRET`
- `MICROSOFT_OAUTH_TENANT_ID` (use `common` only if multi-tenant account support is intentionally enabled)
- `MICROSOFT_OAUTH_REDIRECT_URI`

Shared:
- `EMAIL_TOKEN_ENCRYPTION_KEY` — dedicated high-entropy key for authenticated encryption of refresh/access tokens. Do not reuse the Supabase key or a JWT secret.

These values must be configured as private Render environment variables, never as `NEXT_PUBLIC_*` variables. Redirect URIs must exactly match each provider's registered callback URL.

## Security requirements before enabling mailbox access

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

OAuth routes, credential storage migration, provider API adapters, webhook/delta sync, message UI, send approval endpoint, calendar integration and end-to-end provider tests. Do not expose a Connect button until those flows and their tenant-isolation tests are complete.
