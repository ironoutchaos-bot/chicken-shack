export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
function srvHeaders() {
  return { 'apikey': SUPA_SRV(), 'Authorization': `Bearer ${SUPA_SRV()}`, 'Content-Type': 'application/json' }
}

export async function GET(req: NextRequest) {
  // Admin auth check
  const cookieHeader = req.headers.get('cookie') ?? ''
  const token = cookieHeader
    .split(';')
    .find(c => c.trim().startsWith('admin_token='))
    ?.split('=')[1]?.trim()

  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch profiles and orders in parallel
    const [profilesRes, ordersRes] = await Promise.all([
      fetch(`${SUPA_URL()}/rest/v1/profiles?select=*&order=created_at.desc`, { headers: srvHeaders() }),
      fetch(`${SUPA_URL()}/rest/v1/orders?select=*&order=created_at.asc`, { headers: srvHeaders() }),
    ])

    const profiles: any[] = await profilesRes.json()
    const orders: any[] = await ordersRes.json()

    if (!Array.isArray(profiles) || !Array.isArray(orders)) {
      return NextResponse.json({ error: 'Unexpected DB response' }, { status: 500 })
    }

    // Group orders by user_id
    const ordersByUser = new Map<string, any[]>()
    for (const order of orders) {
      const uid = order.user_id
      if (!uid) continue
      if (!ordersByUser.has(uid)) ordersByUser.set(uid, [])
      ordersByUser.get(uid)!.push(order)
    }

    const users = profiles.map(profile => {
      const userOrders = ordersByUser.get(profile.id) ?? []

      const totalOrders = userOrders.length
      const completedOrders = userOrders.filter(o => o.order_status === 'delivered').length
      const cancelledOrders = userOrders.filter(o => o.order_status === 'cancelled').length

      const totalSpent = userOrders
        .filter(o => o.order_status !== 'cancelled')
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

      const nonCancelledCount = totalOrders - cancelledOrders
      const avgOrderValue = nonCancelledCount > 0 ? totalSpent / nonCancelledCount : 0

      // Most recent order (orders are sorted asc, so last is most recent)
      const lastOrder = userOrders.length > 0 ? userOrders[userOrders.length - 1] : null

      // Cart fields — column may not exist yet, handle gracefully
      const cartJson = profile.cart_json ?? null
      const cartItems: any[] | null = Array.isArray(cartJson) ? cartJson : null
      const cartTotal = cartItems
        ? cartItems.reduce((sum, item) => sum + ((Number(item.pricePerKg) || 0) * (Number(item.quantity) || 0)), 0)
        : 0
      const cartUpdatedAt: string | null = profile.cart_updated_at ?? null

      return {
        id: profile.id as string,
        phone: profile.phone_number as string,
        name: (profile.full_name as string | null) ?? null,
        joinedAt: profile.created_at as string,
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalSpent,
        avgOrderValue,
        lastOrderAt: lastOrder ? (lastOrder.created_at as string) : null,
        lastOrderStatus: lastOrder ? (lastOrder.order_status as string) : null,
        cartItems,
        cartTotal,
        cartUpdatedAt,
      }
    })

    // Sort by totalSpent descending
    users.sort((a, b) => b.totalSpent - a.totalSpent)

    return NextResponse.json(users)
  } catch (err) {
    console.error('[admin/users GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
