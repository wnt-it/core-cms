// AES-256-CBC Verschlüsselung für sensible Settings-Felder (z.B. SMTP-Passwort).
// Quelle: template/src/utils/encryption.ts

import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default_fallback_secret_key_123!";
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  if (!text) return text;

  let key = Buffer.from(ENCRYPTION_KEY, 'utf-8');
  if (key.length !== 32) {
    key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(text: string): string {
  if (!text) return text;

  try {
    const textParts = text.split(":");
    if (textParts.length !== 2) return text;

    const iv = Buffer.from(textParts[0], "hex");
    const encryptedText = Buffer.from(textParts[1], "hex");

    let key = Buffer.from(ENCRYPTION_KEY, 'utf-8');
    if (key.length !== 32) {
      key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    }

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (e) {
    console.error("Decryption error:", e);
    return text;
  }
}
