// localStorage keys renamed from the original template name. Imported first in main.tsx so it runs
// before the persisted Zustand stores read their keys, and returning visitors keep their bag,
// wishlist and recently viewed items.
const RENAMED_KEYS: Record<string, string> = {
  'mybrand-cart': 'nexure-cart',
  'mybrand-wishlist': 'nexure-wishlist',
  'mybrand-recently-viewed': 'nexure-recently-viewed',
};

try {
  for (const [oldKey, newKey] of Object.entries(RENAMED_KEYS)) {
    const value = localStorage.getItem(oldKey);
    if (value === null) continue;
    if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, value);
    localStorage.removeItem(oldKey);
  }
} catch {
  // Storage unavailable (private mode / blocked) — nothing to migrate
}
