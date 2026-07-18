"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClothesStrip from "./ClothesStrip";
import SaveMatchButton from "./SaveMatchButton";
import ConfirmDialog from "./ConfirmDialog";
import { toggleItemStatus, deleteClothingItem } from "@/app/actions";
import type { ClothingItem } from "@/lib/types";

type Props = {
  tops: ClothingItem[];
  bottoms: ClothingItem[];
};

export default function ClothesSlotMachine({ tops, bottoms }: Props) {
  const router = useRouter();
  const [selectedTopId, setSelectedTopId] = useState<string | null>(null);
  const [selectedBottomId, setSelectedBottomId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    imageUrl: string;
  } | null>(null);

  const handleToggleStatus = async (id: string) => {
    await toggleItemStatus(id);
    router.refresh();
  };

  const handleDelete = (id: string, imageUrl: string) => {
    setPendingDelete({ id, imageUrl });
  };

  return (
    <div className="flex flex-col items-center gap-7 w-full pt-5">
      <ClothesStrip
        items={tops}
        category="top"
        selectedId={selectedTopId}
        onSelect={setSelectedTopId}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />

      {/* Connector */}
      <div className="flex items-center gap-4 w-full" aria-hidden="true">
        <div className="flex-1 h-px bg-mono-200" />
        <span className="font-mono text-[0.65rem] text-mono-500 tracking-[0.2em]">
          WITH
        </span>
        <div className="flex-1 h-px bg-mono-200" />
      </div>

      <ClothesStrip
        items={bottoms}
        category="bottom"
        selectedId={selectedBottomId}
        onSelect={setSelectedBottomId}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />

      <SaveMatchButton
        topId={selectedTopId}
        bottomId={selectedBottomId}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="REMOVE ITEM?"
        message="This cannot be undone. The photo and all its saved matches will be permanently deleted."
        confirmLabel="DELETE"
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteClothingItem(pendingDelete.id, pendingDelete.imageUrl);
          router.refresh();
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
