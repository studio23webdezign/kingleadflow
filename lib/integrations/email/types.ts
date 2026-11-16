export type EmailProviderId = "google" | "microsoft";

export type EmailProviderStatus = "needs_configuration" | "ready";

export interface EmailProviderDescriptor {
  id: EmailProviderId;
  name: string;
  accountLabel: string;
  authorizationHost: string;
  scopes: readonly string[];
  requiredEnvironment: readonly string[];
  status: EmailProviderStatus;
}

export interface NormalizedEmailAddress {
  name: string | null;
  address: string;
}

export interface NormalizedEmailMessage {
  provider: EmailProviderId;
  providerMessageId: string;
  providerThreadId: string | null;
  subject: string;
  from: NormalizedEmailAddress;
  to: NormalizedEmailAddress[];
  textBody: string | null;
  htmlBody: string | null;
  receivedAt: string | null;
  sentAt: string | null;
  isDraft: boolean;
}

/** Provider adapters implement this contract; tokens must remain server-side. */
export interface EmailProviderAdapter {
  readonly id: EmailProviderId;
  buildAuthorizationUrl(input: {
    redirectUri: string;
    state: string;
    codeChallenge: string;
  }): URL;
  exchangeAuthorizationCode(input: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<unknown>;
  refreshAccessToken(refreshToken: string): Promise<unknown>;
  sendMessage(input: {
    accessToken: string;
    to: string[];
    subject: string;
    textBody: string;
    inReplyTo?: string;
  }): Promise<{ providerMessageId: string; providerThreadId: string | null }>;
}
