"use client";

import HomeSkeleton from "./HomeSkeleton";
import PasscodeOverlay from "./PasscodeOverlay";
import ContentReveal from "./ContentReveal";
import { usePasscode } from "@/lib/passcode";

type Props = {
  children: React.ReactNode;
};

export default function PasscodeGate({ children }: Props) {
  const { passcode, hydrating } = usePasscode();

  if (hydrating) {
    return (
      <div className="w-full pointer-events-none select-none" inert>
        <HomeSkeleton />
      </div>
    );
  }

  if (passcode === null) {
    return (
      <>
        <div className="w-full pointer-events-none select-none" inert>
          <HomeSkeleton />
        </div>
        <PasscodeOverlay />
      </>
    );
  }

  return (
    <div className="w-full">
      <ContentReveal>{children}</ContentReveal>
    </div>
  );
}
