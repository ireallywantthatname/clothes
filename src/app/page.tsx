import db from "@/lib/db";
import ClothesSlotMachine from "@/components/ClothesSlotMachine";
import MatchesList from "@/components/MatchesList";
import type { ClothingItem, Match } from "@/lib/types";

export default function HomePage() {
  const clothes = db
    .query("SELECT * FROM clothes ORDER BY created_at DESC")
    .all() as ClothingItem[];

  const rawMatches = db
    .query("SELECT * FROM matches ORDER BY created_at DESC")
    .all() as Match[];

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
    <main className="flex-1 flex flex-col items-center p-4 pb-8">
      <ClothesSlotMachine tops={tops} bottoms={bottoms} />
      <div className="w-full max-w-lg mx-auto">
        <MatchesList matches={matches} />
      </div>
    </main>
  );
}
