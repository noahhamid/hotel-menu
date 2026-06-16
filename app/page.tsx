"use client";

export const revalidate = 0;

import { useEffect, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import type { MenuItemResult, Category, SearchMode } from "@/lib/ir/types";
import SearchModeSelector from "@/components/SearchModeSelector";
import FilterSidebar from "@/components/FilterSidebar";
import ResultsGrid from "@/components/ResultsGrid";

export default function SearchDashboard() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("lexical");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isVegan, setIsVegan] = useState(false);
  const [isGlutenFree, setIsGlutenFree] = useState(false);

  const [results, setResults] = useState<MenuItemResult[]>([]);
  const [effectiveMode, setEffectiveMode] = useState<SearchMode>("lexical");
  const [fallbackTriggered, setFallbackTriggered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 350);

  // Fetch categories once on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  const runSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("q", debouncedQuery);
      params.set("mode", mode);
      if (selectedCategories.length > 0) {
        params.set("categories", selectedCategories.join(","));
      }
      if (isVegan) params.set("vegan", "true");
      if (isGlutenFree) params.set("glutenFree", "true");

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      setResults(data.results ?? []);
      setEffectiveMode(data.effectiveMode ?? mode);
      setFallbackTriggered(data.fallbackTriggered ?? false);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, mode, selectedCategories, isVegan, isGlutenFree]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Menu <span className="text-amber-400">IR</span> Search
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            A demonstration of lexical, fuzzy, and semantic information
            retrieval
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === "semantic"
                  ? 'Describe a craving... e.g. "something light and refreshing"'
                  : mode === "fuzzy"
                    ? 'Try a misspelled dish name... e.g. "spagetti"'
                    : "Search dishes, ingredients, descriptions..."
              }
              className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-5 py-4 text-base
                         placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50
                         focus:border-amber-400/50 transition-all"
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {fallbackTriggered && (
            <p className="mt-2 text-sm text-amber-400/80">
              No exact matches found — showing typo-tolerant (fuzzy) results
              instead.
            </p>
          )}
        </div>

        {/* Search mode selector */}
        <div className="mb-8">
          <SearchModeSelector mode={mode} onChange={setMode} />
        </div>

        {/* Main layout: sidebar + results */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          <FilterSidebar
            categories={categories}
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            isVegan={isVegan}
            onVeganChange={setIsVegan}
            isGlutenFree={isGlutenFree}
            onGlutenFreeChange={setIsGlutenFree}
          />

          <ResultsGrid
            results={results}
            effectiveMode={effectiveMode}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
