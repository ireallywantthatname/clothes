import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/** HttpOnly cookie proving the wardrobe was unlocked this browser. */
export const PASSCODE_COOKIE = "clothes-unlocked";

/** 30 days — long enough for a personal closet, short enough to re-lock. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Gate is active only when PASSCODE is set in the environment.
 * Empty / missing → open access (local dev without a code).
 */
export function isPasscodeRequired(): boolean {
  return Boolean(process.env.PASSCODE?.length);
}

/** Opaque token derived from the passcode — never store the raw code in the cookie. */
export function passcodeUnlockToken(): string | null {
  const pass = process.env.PASSCODE;
  if (!pass) return null;
  return createHash("sha256")
    .update(`clothes-gate:v1:${pass}`)
    .digest("hex");
}

export function passcodesMatch(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Keep work roughly constant when lengths differ
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function isPasscodeUnlocked(): Promise<boolean> {
  const expected = passcodeUnlockToken();
  if (expected === null) return true;

  const cookieStore = await cookies();
  const value = cookieStore.get(PASSCODE_COOKIE)?.value;
  if (!value) return false;
  return passcodesMatch(value, expected);
}

export async function setPasscodeUnlockedCookie(): Promise<void> {
  const token = passcodeUnlockToken();
  if (!token) return;

  const cookieStore = await cookies();
  cookieStore.set(PASSCODE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}
