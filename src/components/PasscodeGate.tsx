import HomeSkeleton from "./HomeSkeleton";
import PasscodeOverlay from "./PasscodeOverlay";
import ContentReveal from "./ContentReveal";

type Props = {
  /** When true, show skeleton + overlay and do not render children. */
  locked: boolean;
  children: React.ReactNode;
};

/**
 * When locked: closet silhouette + passcode overlay (no live data under the hood).
 * When unlocked: children (fetched content); soft reveal only right after unlock.
 */
export default function PasscodeGate({ locked, children }: Props) {
  if (locked) {
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
