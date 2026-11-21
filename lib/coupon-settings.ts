import type { Coupon } from '@/app/api/coupons/route'

async function readSetting(key: string): Promise<unknown> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const credential = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !credential) throw new Error('Coupon settings are not configured')

  const response = await fetch(`${url}/rest/v1/settings?key=eq.${key}&select=value`, {
    headers: { apikey: credential, Authorization: `Bearer ${credential}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`Settings read failed for ${key}: HTTP ${response.status}`)

  const rows: { value: unknown }[] = await response.json()
  if (!Array.isArray(rows)) throw new Error(`Unexpected settings response for ${key}`)
  return rows[0]?.value
}

export async function loadCoupon(code: string): Promise<Coupon | undefined> {
  const coupons = await readSetting('coupons')
  if (coupons === undefined) return undefined
  if (!Array.isArray(coupons)) throw new Error('Unexpected coupon settings format')
  return (coupons as Coupon[]).find(coupon => coupon.code === code)
}

export async function loadCouponUsage(): Promise<Record<string, number>> {
  const usage = await readSetting('coupon_usage_tracker')
  if (usage === undefined) return {}
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) throw new Error('Unexpected coupon usage format')
  return usage as Record<string, number>
}

export async function loadCouponDeliveryFee(): Promise<number> {
  const fee = Number((await readSetting('delivery_fee')) ?? 0)
  if (!Number.isFinite(fee) || fee < 0) throw new Error('Invalid delivery fee')
  return fee
}

export const couponUnavailableMessage = 'Coupon verification is temporarily unavailable. Please try again.'
