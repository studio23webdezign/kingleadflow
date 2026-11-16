import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decryptMailboxTokens, encryptMailboxTokens } from "./crypto";

const TEST_KEY = "0123456789abcdef".repeat(4);

describe("mailbox token encryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts tokens into an opaque payload and restores the original values", () => {
    vi.stubEnv("EMAIL_TOKEN_ENCRYPTION_KEY", TEST_KEY);
    const tokens = {
      access_token: "access-secret-value",
      refresh_token: "refresh-secret-value",
      expires_at: 1_800_000_000_000,
      scope: "openid email gmail.readonly",
    };

    const encrypted = encryptMailboxTokens(tokens);

    expect(encrypted).not.toContain(tokens.access_token);
    expect(encrypted).not.toContain(tokens.refresh_token);
    expect(decryptMailboxTokens(encrypted)).toEqual(tokens);
  });

  it("rejects a payload that has been modified", () => {
    vi.stubEnv("EMAIL_TOKEN_ENCRYPTION_KEY", TEST_KEY);
    const encrypted = encryptMailboxTokens({ access_token: "secret", expires_at: 1 });

    const [iv, tag, ciphertext] = encrypted.split(".");
    const position = Math.floor(ciphertext.length / 2);\n    const changed = ciphertext.slice(0, position) + (ciphertext[position] === "A" ? "B" : "A") + ciphertext.slice(position + 1);

    expect(() => decryptMailboxTokens([iv, tag, changed].join("."))).toThrow();
  });

  it("rejects malformed encrypted payloads", () => {
    vi.stubEnv("EMAIL_TOKEN_ENCRYPTION_KEY", TEST_KEY);

    expect(() => decryptMailboxTokens("not-a-valid-payload")).toThrow();
  });

  it("requires exactly 32 bytes of hexadecimal key material", () => {
    vi.stubEnv("EMAIL_TOKEN_ENCRYPTION_KEY", "too-short");

    expect(() => encryptMailboxTokens({ access_token: "secret" })).toThrow(
      "EMAIL_TOKEN_ENCRYPTION_KEY must be a 32-byte hex-encoded key.",
    );
  });
});
