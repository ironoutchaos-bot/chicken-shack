export type Product = {
  id: string
  name: string
  price_per_kg: number   // 0 = "call for price"
  unit: string           // 'kg' | 'piece'
}

/** Canonical list — IDs must match Supabase rows */
export const PRODUCTS: Product[] = [
  { id: 'boneless', name: 'Boneless', price_per_kg: 0, unit: 'kg' },
  { id: 'curry-cut', name: 'Curry Cut', price_per_kg: 0, unit: 'kg' },
  { id: 'wings', name: 'Wings', price_per_kg: 0, unit: 'kg' },
  { id: 'liver', name: 'Liver and Other', price_per_kg: 0, unit: 'kg' },
  { id: 'drumstick', name: 'Drumstick', price_per_kg: 0, unit: 'kg' },
]

/** Merge DB rows into the canonical list (fallback to 0 if row missing) */
export function mergeWithDb(dbRows: { id: string; price_per_kg: number }[]): Product[] {
  const map = Object.fromEntries(dbRows.map(r => [r.id, r.price_per_kg]))
  return PRODUCTS.map(p => ({ ...p, price_per_kg: map[p.id] ?? p.price_per_kg }))
}

export function formatPrice(price: number): string {
  return price > 0 ? `₹${price}/kg` : 'Fresh packed'
}