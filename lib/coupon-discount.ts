export type CouponRule = {
  discount_type: 'percent' | 'fixed' | 'bogo'
  discount_value: number
  applies_to: 'all' | 'specific'
  product_ids: string[]
}

export type CouponCartItem = { productId: string; pricePerKg: number; quantity: number }

export function calculateCouponDiscount(coupon: CouponRule, items: CouponCartItem[], deliveryFee = 0) {
  if (!Array.isArray(items) || items.length === 0 || items.some(item =>
    !item.productId || !Number.isFinite(item.pricePerKg) || item.pricePerKg < 0 ||
    !Number.isSafeInteger(item.quantity) || item.quantity < 1
  )) throw new Error('Please use whole pack quantities and valid product prices.')

  const eligible = items.filter(item => coupon.applies_to === 'all' || coupon.product_ids.includes(item.productId))
  if (eligible.length === 0) throw new Error('This coupon does not apply to the items in your cart.')

  if (coupon.discount_type === 'bogo') {
    const products = new Map<string, { price: number; quantity: number }>()
    for (const item of eligible) {
      const existing = products.get(item.productId)
      if (existing && existing.price !== item.pricePerKg) throw new Error('Product prices have changed. Please refresh your cart.')
      products.set(item.productId, { price: item.pricePerKg, quantity: (existing?.quantity ?? 0) + item.quantity })
    }
    let discount = 0
    let freeQuantity = 0
    const freeItems: { productId: string; quantity: number }[] = []
    for (const [productId, item] of products) {
      const free = Math.floor(item.quantity / 2)
      if (free > 0) freeItems.push({ productId, quantity: free })
      discount += free * item.price
      freeQuantity += free
    }
    if (!freeQuantity) throw new Error('Add 2 packs of the same eligible product to use Buy 1 Get 1 Free. Different pack sizes cannot be paired.')
    return { discount: Math.round(discount * 100) / 100, label: `Buy 1 Get 1 Free · ${freeQuantity} free pack${freeQuantity === 1 ? '' : 's'}`, freeItems }
  }

  const base = eligible.reduce((sum, item) => sum + item.pricePerKg * item.quantity, 0) + (coupon.applies_to === 'all' ? deliveryFee : 0)
  const discount = Math.min(base, coupon.discount_type === 'percent' ? Math.round(base * coupon.discount_value / 100) : coupon.discount_value)
  return { discount, label: coupon.discount_type === 'percent' ? `${coupon.discount_value}% off` : `₹${coupon.discount_value} off`, freeItems: [] as { productId: string; quantity: number }[] }
}
