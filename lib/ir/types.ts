export type SearchMode = 'lexical' | 'fuzzy' | 'semantic';

export interface SearchFilters {
  query: string;
  categories?: string[];
  isVegan?: boolean;
  isGlutenFree?: boolean;
  mode: SearchMode;
}

export interface MenuItemResult {
  id: string;
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  ingredients: string[];
  is_vegan: boolean;
  is_gluten_free: boolean;
  image_url: string | null;
  score: number;
  score_type: 'rank' | 'similarity_score' | 'similarity';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}