"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { PasscodeProvider } from "@/lib/passcode";
import BgRemovalProcessor from "./BgRemovalProcessor";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <PasscodeProvider>
        <BgRemovalProcessor />
        {children}
      </PasscodeProvider>
    </ConvexProvider>
  );
}
