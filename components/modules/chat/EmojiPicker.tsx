"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

const EMOJIS = [
  "😀", "😂", "😊", "😉", "😍", "🥰", "😘", "😎",
  "🤔", "😅", "😭", "😢", "😡", "😱", "😴", "🤗",
  "👍", "👎", "👏", "🙌", "🙏", "👋", "💪", "✌️",
  "❤️", "💛", "💚", "💙", "💜", "🧡", "🤍", "💯",
  "🎉", "🎊", "✅", "❌", "⭐", "🔥", "✨", "👏",
  "📌", "📎", "📅", "⏰", "📢", "🔔", "💰", "📄",
  "🎈", "🎁", "🍎", "☀️", "🌧️", "❄️", "🐣", "🎓",
];

export function EmojiPicker({ onSelect, disabled }: { onSelect: (emoji: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-label="Inserir emoji"
        title="Inserir emoji"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-cda-text3 hover:bg-white hover:text-cda-text2 disabled:opacity-50"
      >
        <Smile className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-2 grid w-64 max-h-56 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-cda-border bg-white p-2 shadow-lg">
          {EMOJIS.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-cda-bg"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
