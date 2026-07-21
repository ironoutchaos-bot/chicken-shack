// Sends the WhatsApp order-confirmation message via AiSensy's Campaign API and
// writes the order details onto the customer's AiSensy contact record (the
// `attributes` below match the custom fields created in Manage > User Attributes).
//
// Required env vars (set in .env.local and in your hosting provider's env settings):
// AISENSY_API_KEY - from Developer > API Campaign Key
// AISENSY_API_URL - https://backend.aisensy.com/campaign/t1/api/v2
// AISENSY_CAMPAIGN_NAME - order_confirmation

type OrderConfirmationInput = {
  phone: string
  name: string
  orderId: string
  itemsText: string
  total: number | string
  paymentMode: string
  address?: unknown
}

// AiSensy needs the number in international format with country code (e.g.
// +919876543210). Checkout stores a bare 10-digit Indian mobile, so add the
// +91 country code here. Returns empty string if the number is unusable.
function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1)
  if (digits.length === 10) digits = '91' + digits
  if (digits.length < 11) return ''
  return '+' + digits
}

export async function sendOrderConfirmation(input: OrderConfirmationInput) {
  const { phone, name, orderId, itemsText, total, paymentMode, address } = input
  const apiUrl = process.env.AISENSY_API_URL
  const apiKey = process.env.AISENSY_API_KEY
  const campaignName = process.env.AISENSY_CAMPAIGN_NAME

if (!apiUrl || !apiKey || !campaignName || !phone) {
  console.error('[aisensy] Missing AISENSY_API_URL / AISENSY_API_KEY / AISENSY_CAMPAIGN_NAME or phone - skipping WhatsApp confirmation')
  return
}

const res = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey,
    campaignName,
      destination: normalizePhone(phone),
      userName: name,
    // Must match the approved template's placeholders in order:
    // {{1}} customer name, {{2}} order id, {{3}} items, {{4}} total
    templateParams: [name, orderId, itemsText, String(total)],
    source: 'Website order',
    tags: [paymentMode === 'COD' ? 'cod' : 'prepaid', 'ordered'],
    attributes: {
      orderId,
      orderItems: itemsText,
      orderAmount: String(total),
      paymentMode,
      deliveryStatus: 'confirmed',
      orderPlacedAt: new Date().toISOString(),
      deliveryAddress: address,
    },
  }),
})

if (!res.ok) {
  const text = await res.text().catch(() => '')
  console.error(`[aisensy] send failed (${res.status}): ${text}`)
}
}

// Turns a cart items array into a short readable string for the WhatsApp
// template, e.g. "Chicken Curry Cut 500g x1, Chicken Breast 400g x1".
export function summarizeItems(items: unknown): string {
  if (!Array.isArray(items)) return ''
  return items
  .map((item) => {
    const record = item as Record<string, unknown>
    const label = record.name ?? record.id ?? 'Item'
    const qty = record.quantity ?? 1
    return `${label} x${qty}`
  })
  .join(', ')
}
