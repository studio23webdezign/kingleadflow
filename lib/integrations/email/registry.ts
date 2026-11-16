import "server-only";
import type { EmailProviderDescriptor } from "./types";

const googleProvider = {
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
} as const;

export function getEmailProviders(): EmailProviderDescriptor[] {
  const googleReady = googleProvider.requiredEnvironment.every((key) =>
    Boolean(process.env[key]?.trim()),
  );

  return [
    {
      ...googleProvider,
      status: googleReady ? "ready" : "needs_configuration",
    },
    {
      id: "microsoft",
      name: "Outlook / Microsoft 365",
      accountLabel: "Microsoft work or school account",
      authorizationHost: "https://login.microsoftonline.com",
      scopes: [],
      requiredEnvironment: [],
      status: "coming_soon",
    },
  ];
}

export function getEmailProvider(id: "google" | "microsoft"): EmailProviderDescriptor {
  const provider = getEmailProviders().find((item) => item.id === id);
  if (!provider) throw new Error("Unsupported email provider.");
  return provider;
}
