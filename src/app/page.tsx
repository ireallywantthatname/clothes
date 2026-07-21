import db from "@/lib/db";
import HomeContent from "@/components/HomeContent";
import PasscodeGate from "@/components/PasscodeGate";
import { isPasscodeUnlocked } from "@/lib/passcode";
import type { ClothingItem, Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const unlocked = await isPasscodeUnlocked();

  // Locked: no DB reads — only the silhouette under the passcode overlay.
  if (!unlocked) {
    return (
      <main
        id="main"
        className="flex-1 flex flex-col items-center px-4 pb-10 pt-1"
      >
        <PasscodeGate locked>{null}</PasscodeGate>
      </main>
    );
  }

  const clothesResult = await db.execute(
    "SELECT * FROM clothes ORDER BY created_at DESC",
  );
  const clothes = clothesResult.rows as unknown as ClothingItem[];

  const rawMatchesResult = await db.execute(
    "SELECT * FROM matches ORDER BY created_at DESC",
  );
  const rawMatches = rawMatchesResult.rows as unknown as Match[];

  const tops = clothes.filter((item) => item.category === "top");
  const bottoms = clothes.filter((item) => item.category === "bottom");

  // Hydrate matches with their clothing items
  const matches: Match[] = rawMatches.map((match) => {
    const top = clothes.find((c) => c.id === match.top_id);
    const bottom = clothes.find((c) => c.id === match.bottom_id);
    return {
      id: match.id,
      top_id: match.top_id,
      bottom_id: match.bottom_id,
      created_at: match.created_at,
      top,
      bottom,
    };
  });

  return (
    <main
      id="main"
      className="flex-1 flex flex-col items-center px-4 pb-10 pt-1"
    >
      <PasscodeGate locked={false}>
        <HomeContent tops={tops} bottoms={bottoms} matches={matches} />
      </PasscodeGate>
    </main>
  );
}
