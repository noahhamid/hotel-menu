"use client";

import type { Category } from "@/lib/ir/types";

interface FilterSidebarProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  isVegan: boolean;
  onVeganChange: (value: boolean) => void;
  isGlutenFree: boolean;
  onGlutenFreeChange: (value: boolean) => void;
}

export default function FilterSidebar({
  categories,
  selectedCategories,
  onCategoriesChange,
  isVegan,
  onVeganChange,
  isGlutenFree,
  onGlutenFreeChange,
}: FilterSidebarProps) {
  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== id));
    } else {
      onCategoriesChange([...selectedCategories, id]);
    }
  };

  return (
    <aside className="space-y-6">
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5">
        <h3 className="text-sm font-semibold text-neutral-200 mb-3 uppercase tracking-wide">
          Categories
        </h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.id)}
                onChange={() => toggleCategory(cat.id)}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-amber-400
                           focus:ring-amber-400/50 focus:ring-offset-0"
              />
              <span className="text-sm text-neutral-400 group-hover:text-neutral-200 transition-colors">
                {cat.name}
              </span>
            </label>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-neutral-500">Loading categories...</p>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5">
        <h3 className="text-sm font-semibold text-neutral-200 mb-3 uppercase tracking-wide">
          Dietary
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={isVegan}
              onChange={(e) => onVeganChange(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-emerald-400
                         focus:ring-emerald-400/50 focus:ring-offset-0"
            />
            <span className="text-sm text-neutral-400 group-hover:text-neutral-200 transition-colors">
              Vegan
            </span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={isGlutenFree}
              onChange={(e) => onGlutenFreeChange(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-sky-400
                         focus:ring-sky-400/50 focus:ring-offset-0"
            />
            <span className="text-sm text-neutral-400 group-hover:text-neutral-200 transition-colors">
              Gluten-Free
            </span>
          </label>
        </div>
      </div>
    </aside>
  );
}
