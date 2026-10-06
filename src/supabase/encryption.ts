// AES-256-CBC Verschlüsselung für sensible Settings-Felder (z.B. SMTP-Passwort).
// Quelle: template/src/utils/encryption.ts
//
// Der Schlüssel kommt AUSSCHLIESSLICH aus der Umgebungsvariable ENCRYPTION_KEY.
// Es gibt bewusst keinen Ersatzschlüssel (das Repo ist öffentlich). Ist die Variable
// nicht gesetzt, schlägt Ver-/Entschlüsseln mit einer klaren Fehlermeldung fehl.

import crypto from "crypto";

const IV_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY ist nicht gesetzt. Bitte in den Umgebungsvariablen des Projekts hinterlegen.");
  }
  const raw = Buffer.from(secret, "utf-8");
  return raw.length === 32 ? raw : crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(text: string): string {
  if (!text) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", getKey(), iv);

  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(text: string): string {
  if (!text) return text;

  // Kein verschlüsseltes Format (IV:Daten in Hex) -> Altwert im Klartext unverändert zurückgeben.
  if (!/^[0-9a-f]{32}:[0-9a-f]+$/i.test(text)) return text;

  try {
    const [ivHex, dataHex] = text.split(":");
    const decipher = crypto.createDecipheriv("aes-256-cbc", getKey(), Buffer.from(ivHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    // Fehlender oder falscher Schlüssel: nie den verschlüsselten Text als Passwort weitergeben.
    console.error("Decryption error:", e);
    return "";
  }
}
