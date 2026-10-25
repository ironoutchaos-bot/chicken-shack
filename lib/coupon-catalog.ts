import type { CouponCartItem } from './coupon-discount'

// BOGO must use the same current selling price as the product cards.
export async function validateBogoPrices(items: CouponCartItem[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Could not verify product prices. Please try again.')
  const response = await fetch(`${url}/rest/v1/products?select=id,price_per_kg,discount_percentage`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Could not verify product prices. Please try again.')
  const products: { id: string; price_per_kg: number; discount_percentage: number }[] = await response.json()
  for (const item of items) {
    const product = products.find(product => product.id === item.productId)
    if (!product) throw new Error('A product is no longer available. Please refresh your cart.')
    const discount = Math.max(0, Math.min(100, product.discount_percentage ?? 0))
    const price = Math.round(Math.round(product.price_per_kg) * (1 - discount / 100))
    if (Math.abs(price - item.pricePerKg) > 0.01) throw new Error('Product prices have changed. Please refresh your cart and apply the coupon again.')
  }
}
