import type { Category } from '@/types/product';

export interface CategoryOption {
  id: number;
  name: string;
  /** For a select: indented under its parent, e.g. "— T-Shirts" */
  label: string;
  depth: number;
}

/** Every category in tree order, subcategories under their parent, for category pickers and filters */
export function flattenCategories(categories: Category[], depth = 0): CategoryOption[] {
  return categories.flatMap((cat) => [
    { id: cat.id, name: cat.name, label: `${'— '.repeat(depth)}${cat.name}`, depth },
    ...flattenCategories(cat.children ?? [], depth + 1),
  ]);
}
