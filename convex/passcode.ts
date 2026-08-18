import { v } from "convex/values";
import { env, query } from "./_generated/server";

export function passcodesMatch(input: string, expected: string): boolean {
  if (input.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < input.length; i++) {
    mismatch |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function requirePasscode(passcode: string): void {
  const expected = env.PASSCODE;
  if (!expected) return;
  if (!passcodesMatch(passcode, expected)) {
    throw new Error("Unlock the closet first.");
  }
}

export const verifyPasscode = query({
  args: { passcode: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({ ok: v.literal(false), error: v.string() }),
  ),
  handler: async (_ctx, args) => {
    const expected = env.PASSCODE;
    if (!expected) return { ok: true as const };
    const trimmed = args.passcode.trim();
    if (!trimmed) {
      return { ok: false as const, error: "Enter the passcode." };
    }
    if (!passcodesMatch(trimmed, expected)) {
      return { ok: false as const, error: "Wrong passcode." };
    }
    return { ok: true as const };
  },
});
