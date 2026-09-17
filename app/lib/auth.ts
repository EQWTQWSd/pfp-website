import crypto from "crypto";
import { cookies } from "next/headers";

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
}

const COOKIE_NAME = "discord_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; 

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(data: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}.${tag}.${encrypted}`;
}

export function decrypt(data: string): string {
  const key = getKey();
  const parts = data.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted data");
  const [ivHex, tagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function setSessionCookie(user: DiscordUser): void {
  const encrypted = encrypt(JSON.stringify(user));
  cookies().set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function getSessionUser(): DiscordUser | null {
  const cookie = cookies().get(COOKIE_NAME);
  if (!cookie?.value) return null;
  try {
    return JSON.parse(decrypt(cookie.value)) as DiscordUser;
  } catch {
    return null;
  }
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

export function getOrigin(request: Request): string {
  const proto =
    request.headers.get("x-forwarded-proto") || "http";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:3000";
  return `${proto}://${host}`;
}
