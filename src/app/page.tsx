import { createClient } from "@/lib/supabase/server";
import ClothesSlotMachine from "@/components/ClothesSlotMachine";
import MatchesList from "@/components/MatchesList";
import type { ClothingItem, Match } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch all clothes
  const { data: clothes } = await supabase
    .from("clothes")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch matches
  const { data: rawMatches } = await supabase
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false });

  const clothingItems = (clothes ?? []) as ClothingItem[];

  const tops = clothingItems.filter((item) => item.category === "top");
  const bottoms = clothingItems.filter((item) => item.category === "bottom");

  // Hydrate matches with their clothing items
  const matches: Match[] = (rawMatches ?? []).map((match) => {
    const top = clothingItems.find((c) => c.id === match.top_id);
    const bottom = clothingItems.find((c) => c.id === match.bottom_id);
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
