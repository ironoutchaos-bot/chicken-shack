// Sends the WhatsApp order-confirmation message via AiSensy's Campaign API and
// writes the order details onto the customer's AiSensy contact record (the
// `attributes` below match the custom fields created in Manage > User Attributes).
//
// Required env vars (set in .env.local and in your hosting provider's env settings):
//   AISENSY_API_KEY       - from Developer > API Campaign Key
//   AISENSY_API_URL       - https://backend.aisensy.com/campaign/t1/api/v2
//   AISENSY_CAMPAIGN_NAME - order_confirmation

type OrderConfirmationInput = {
  phone: string
  name: string
  orderId: string
  itemsText: string
  total: number | string
  paymentMode: string
  address?: unknown
}

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function srvHeaders(extra?: Record<string, string>) {
  return {
    'apikey': SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

// AiSensy expects the number in international format with the country code and
// a leading '+' (e.g. +919876543210) - confirmed with AiSensy support. Checkout
// stores a bare 10-digit Indian mobile, so the 91 country code is added here.
// Returns '' if the number is unusable.
function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1)
  if (digits.length === 10) digits = '91' + digits
  if (digits.length < 11) return ''
  return '+' + digits
}

// WhatsApp rejects template parameters that are empty or contain newlines, tabs
// or 4+ consecutive spaces, so every value is squashed to a safe single line.
function safeParam(value: unknown, fallback: string): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text || fallback
}

// The DB id is a long UUID. Show the customer a short readable reference that
// still matches the beginning of the real order id (e.g. 7C3F9A12).
function shortOrderRef(orderId: string): string {
  return String(orderId || '').replace(/-/g, '').slice(0, 8).toUpperCase()
}

// Sends the message. Returns true only when AiSensy accepted the request.
export async function sendOrderConfirmation(input: OrderConfirmationInput): Promise<boolean> {
  const { phone, name, orderId, itemsText, total, paymentMode, address } = input
  const apiUrl = process.env.AISENSY_API_URL
  const apiKey = process.env.AISENSY_API_KEY
  const campaignName = process.env.AISENSY_CAMPAIGN_NAME

  if (!apiUrl || !apiKey || !campaignName) {
    console.error('[aisensy] Missing AISENSY_API_URL / AISENSY_API_KEY / AISENSY_CAMPAIGN_NAME - skipping WhatsApp confirmation')
    return false
  }

  const destination = normalizePhone(phone)
  if (!destination) {
    console.error('[aisensy] Unusable customer phone - skipping WhatsApp confirmation for order', orderId)
    return false
  }

  const customerName = safeParam(name, 'Customer')
  const orderRef = shortOrderRef(orderId)
  const items = safeParam(itemsText, 'Your order')
  const amount = safeParam(total, '0')

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      campaignName,
      destination,
      userName: customerName,
      // Must match the approved template's placeholders in order:
      // {{1}} customer name, {{2}} order id, {{3}} items, {{4}} total
      templateParams: [customerName, orderRef, items, amount],
      source: 'Website order',
      tags: [paymentMode === 'COD' ? 'cod' : 'prepaid', 'ordered'],
      attributes: {
        orderId,
        orderRef,
        orderItems: items,
        orderAmount: amount,
        paymentMode,
        deliveryStatus: 'confirmed',
        orderPlacedAt: new Date().toISOString(),
        // AiSensy attributes must be strings, and the address is an object.
        deliveryAddress: address ? JSON.stringify(address) : '',
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[aisensy] send failed (${res.status}) for order ${orderId}: ${text}`)
    return false
  }

  console.log('[aisensy] order confirmation sent for order', orderId)
  return true
}

// Fallback de-duplication for deployments where the orders.confirmation_sent_at
// column has not been added yet. Only covers a single warm serverless instance,
// which is why the column is preferred.
const sentInThisInstance = new Set<string>()

// Claims the order in the database and only then sends, so exactly one message
// goes out per order no matter which path gets there first (COD save, the
// return-URL PATCH, the Cashfree webhook, or admin confirm-payment).
//
// The claim is a conditional update that matches only rows where
// confirmation_sent_at is still null. If the send fails the claim is released so
// a later path can retry. Never throws - order handling must never break because
// WhatsApp is unavailable.
export async function sendOrderConfirmationOnce(input: OrderConfirmationInput): Promise<void> {
  const orderId = input.orderId
  if (!orderId) return

  let claimed = false

  if (SUPA_URL() && SUPA_SRV()) {
    try {
      const res = await fetch(
        `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&confirmation_sent_at=is.null`,
        {
          method: 'PATCH',
          headers: srvHeaders({ 'Prefer': 'return=representation' }),
          body: JSON.stringify({ confirmation_sent_at: new Date().toISOString() }),
        }
      )
      if (res.ok) {
        const rows = await res.json().catch(() => [])
        if (Array.isArray(rows) && rows.length === 0) {
          console.log('[aisensy] confirmation already sent for order', orderId, '- skipping')
          return
        }
        claimed = true
      } else {
        const err = await res.text().catch(() => '')
        console.warn('[aisensy] could not claim confirmation_sent_at - add the column for cross-instance duplicate protection:', err)
      }
    } catch (err) {
      console.warn('[aisensy] confirmation claim failed, falling back to in-memory de-duplication', err)
    }
  }

  if (!claimed) {
    if (sentInThisInstance.has(orderId)) {
      console.log('[aisensy] confirmation already sent by this instance for order', orderId, '- skipping')
      return
    }
    sentInThisInstance.add(orderId)
  }

  const ok = await sendOrderConfirmation(input).catch((err) => {
    console.error('[aisensy] order confirmation failed', err)
    return false
  })

  if (ok) return

  // Send failed - release the claim so a later path can retry this order.
  if (!claimed) {
    sentInThisInstance.delete(orderId)
    return
  }

  try {
    await fetch(
      `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
      {
        method: 'PATCH',
        headers: srvHeaders({ 'Prefer': 'return=minimal' }),
        body: JSON.stringify({ confirmation_sent_at: null }),
      }
    )
  } catch { /* best-effort */ }
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
