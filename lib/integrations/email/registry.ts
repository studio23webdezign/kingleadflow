import "server-only";
import type { EmailProviderDescriptor, EmailProviderId } from "./types";

const providerConfiguration = {
  google: {
    id: "google",
    name: "Gmail / Google Workspace",
    accountLabel: "Google account",
    authorizationHost: "https://accounts.google.com",
    scopes: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    requiredEnvironment: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_OAUTH_REDIRECT_URI",
      "EMAIL_TOKEN_ENCRYPTION_KEY",
    ],
  },
  microsoft: {
    id: "microsoft",
    name: "Outlook / Microsoft 365",
    accountLabel: "Microsoft work or school account",
    authorizationHost: "https://login.microsoftonline.com",
    scopes: ["openid", "email", "offline_access", "User.Read", "Mail.Read", "Mail.Send"],
    requiredEnvironment: [
      "MICROSOFT_OAUTH_CLIENT_ID",
      "MICROSOFT_OAUTH_CLIENT_SECRET",
      "MICROSOFT_OAUTH_TENANT_ID",
      "MICROSOFT_OAUTH_REDIRECT_URI",
      "EMAIL_TOKEN_ENCRYPTION_KEY",
    ],
  },
} as const;

export function getEmailProviders(): EmailProviderDescriptor[] {
  return (Object.keys(providerConfiguration) as EmailProviderId[]).map((id) => {
    const provider = providerConfiguration[id];
    const ready = provider.requiredEnvironment.every((key) => Boolean(process.env[key]?.trim()));
    return { ...provider, status: ready ? "ready" : "needs_configuration" };
  });
}

export function getEmailProvider(id: EmailProviderId): EmailProviderDescriptor {
  const provider = getEmailProviders().find((item) => item.id === id);
  if (!provider) throw new Error("Unsupported email provider.");
  return provider;
}
