import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyBytes() {
  const value = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY must be a 32-byte hex-encoded key.");
  }
  return Buffer.from(value, "hex");
}

export function encryptMailboxTokens(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptMailboxTokens(value: string) {
  const [iv, tag, ciphertext] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !ciphertext) throw new Error("Invalid encrypted mailbox token payload.");
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")) as {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
    scope: string;
  };
}
