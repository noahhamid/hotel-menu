"use client";

import type { MenuItemResult, SearchMode } from "@/lib/ir/types";

interface ResultsGridProps {
  results: MenuItemResult[];
  effectiveMode: SearchMode;
  isLoading: boolean;
}

function formatScore(item: MenuItemResult): { label: string; pct: number } {
  switch (item.score_type) {
    case "rank":
      // ts_rank values are typically small (0 - ~1, often < 0.5)
      return { label: "Relevance", pct: Math.min(item.score * 100, 100) };
    case "similarity_score":
      // pg_trgm similarity is already 0-1
      return { label: "Match", pct: item.score * 100 };
    case "similarity":
      // cosine similarity is 0-1 (after 1 - distance)
      return { label: "Semantic Match", pct: item.score * 100 };
    default:
      return { label: "Score", pct: 0 };
  }
}

function ScoreBadge({ item }: { item: MenuItemResult }) {
  if (item.score === 0 && item.score_type === "rank") return null;

  const { label, pct } = formatScore(item);

  const colorClass =
    pct > 60
      ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
      : pct > 30
        ? "bg-amber-400/10 text-amber-400 border-amber-400/20"
        : "bg-neutral-700/30 text-neutral-400 border-neutral-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${colorClass}`}
    >
      {label}: {pct.toFixed(1)}%
    </span>
  );
}

export default function ResultsGrid({
  results,
  effectiveMode,
  isLoading,
}: ResultsGridProps) {
  if (isLoading && results.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-56 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-neutral-800 text-center px-6">
        <p className="text-neutral-400 font-medium">No dishes found</p>
        <p className="text-sm text-neutral-500 mt-1">
          Try a different search term, mode, or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {results.map((item) => (
        <div
          key={item.id}
          className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-3
                     hover:border-neutral-700 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-neutral-100 leading-tight">
              {item.name}
            </h3>
            <span className="text-amber-400 font-semibold whitespace-nowrap">
              ${item.price.toFixed(2)}
            </span>
          </div>

          <p className="text-sm text-neutral-400 leading-relaxed line-clamp-3">
            {item.description}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
            <ScoreBadge item={item} />
            {item.is_vegan && (
              <span className="rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2.5 py-1 text-xs font-medium">
                Vegan
              </span>
            )}
            {item.is_gluten_free && (
              <span className="rounded-full bg-sky-400/10 text-sky-400 border border-sky-400/20 px-2.5 py-1 text-xs font-medium">
                Gluten-Free
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {item.ingredients.slice(0, 5).map((ing) => (
              <span
                key={ing}
                className="rounded-md bg-neutral-800 text-neutral-400 px-2 py-0.5 text-xs"
              >
                {ing}
              </span>
            ))}
            {item.ingredients.length > 5 && (
              <span className="rounded-md bg-neutral-800 text-neutral-500 px-2 py-0.5 text-xs">
                +{item.ingredients.length - 5} more
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
