"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import ClothesStrip from "./ClothesStrip";
import SaveMatchButton from "./SaveMatchButton";
import ConfirmDialog from "./ConfirmDialog";
import { usePasscode } from "@/lib/passcode";
import type { ClothingItem } from "@/lib/types";
import type { Id } from "../../convex/_generated/dataModel";

type Props = {
  tops: ClothingItem[];
  bottoms: ClothingItem[];
};

export default function ClothesSlotMachine({ tops, bottoms }: Props) {
  const { passcode } = usePasscode();
  const toggleStatus = useMutation(api.clothes.toggleStatus);
  const updateNickname = useMutation(api.clothes.updateNickname);
  const removeItem = useMutation(api.clothes.remove);
  const [selectedTopId, setSelectedTopId] = useState<Id<"clothes"> | null>(
    null,
  );
  const [selectedBottomId, setSelectedBottomId] =
    useState<Id<"clothes"> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Id<"clothes"> | null>(
    null,
  );

  const handleToggleStatus = async (id: Id<"clothes">) => {
    if (passcode === null) return;
    await toggleStatus({ passcode, itemId: id });
  };

  const handleDelete = (id: Id<"clothes">) => {
    setPendingDelete(id);
  };

  const handleNicknameChange = async (
    id: Id<"clothes">,
    nickname: string | null,
  ) => {
    if (passcode === null) return;
    await updateNickname({ passcode, itemId: id, nickname });
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
        onNicknameChange={handleNicknameChange}
        autoScrollDirection="forward"
        autoScrollOffsetMs={0}
        autoScrollPaused={pendingDelete !== null}
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
        onNicknameChange={handleNicknameChange}
        autoScrollDirection="backward"
        autoScrollOffsetMs={2100}
        autoScrollPaused={pendingDelete !== null}
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
          if (!pendingDelete || passcode === null) return;
          await removeItem({ passcode, itemId: pendingDelete });
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
