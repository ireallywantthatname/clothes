"use client";

import { useEffect, useId, useRef, useState } from "react";

const NICKNAME_MAX = 40;

type Props = {
  nickname: string | null;
  /** When set, the tag is editable and calls this on save. Omit for read-only. */
  onSave?: (nickname: string | null) => Promise<void> | void;
  /** Used for aria labels, e.g. "top" or "bottom" */
  categoryLabel?: string;
  className?: string;
};

/**
 * Hang-tag style nickname under a garment photo.
 * Click to name or rename; blur / Enter saves, Escape cancels.
 */
export default function NicknameTag({
  nickname,
  onSave,
  categoryLabel = "item",
  className = "",
}: Props) {
  const editable = typeof onSave === "function";
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nickname ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(nickname ?? "");
    setEditing(true);
  };

  const commit = async () => {
    if (!onSave || saving) return;
    const next = draft.trim().replace(/\s+/g, " ").slice(0, NICKNAME_MAX);
    const normalized = next || null;
    const current = nickname?.trim() || null;
    if (normalized === current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(normalized);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setEditing(false);
  };

  if (editing && editable) {
    return (
      <div className={`nickname-tag nickname-tag-edit ${className}`}>
        <label className="sr-only" htmlFor={inputId}>
          Nickname for this {categoryLabel}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={NICKNAME_MAX}
          disabled={saving}
          placeholder="name this piece"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            void commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
          className="nickname-input"
          aria-label={`Nickname for this ${categoryLabel}`}
        />
      </div>
    );
  }

  const display = nickname?.trim() || null;

  if (!editable) {
    if (!display) return null;
    return (
      <p className={`nickname-tag nickname-tag-readonly ${className}`}>
        {display}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        startEditing();
      }}
      className={`nickname-tag nickname-tag-button ${
        display ? "" : "nickname-tag-empty"
      } ${className}`}
      aria-label={
        display
          ? `Rename ${display}`
          : `Add a nickname for this ${categoryLabel}`
      }
    >
      {display ?? "name this piece"}
    </button>
  );
}
