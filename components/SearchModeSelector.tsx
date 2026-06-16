"use client";

import type { SearchMode } from "@/lib/ir/types";

interface SearchModeSelectorProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

const MODES: { value: SearchMode; label: string; description: string }[] = [
  {
    value: "lexical",
    label: "Keyword Search",
    description: "Tokenized, stemmed, weighted full-text ranking (ts_rank)",
  },
  {
    value: "fuzzy",
    label: "Typo-Tolerant Search",
    description: "Trigram similarity — forgives misspellings",
  },
  {
    value: "semantic",
    label: "AI Semantic Search",
    description: "Embedding + cosine similarity — matches intent, not words",
  },
];

export default function SearchModeSelector({
  mode,
  onChange,
}: SearchModeSelectorProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-xl bg-neutral-900 border border-neutral-800 p-1.5">
        {MODES.map((m) => {
          const isActive = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => onChange(m.value)}
              className={`flex-1 min-w-[140px] rounded-lg px-4 py-2.5 text-sm font-medium transition-all
                ${
                  isActive
                    ? "bg-amber-400 text-neutral-950 shadow-lg shadow-amber-400/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {MODES.find((m) => m.value === mode)?.description}
      </p>
    </div>
  );
}
