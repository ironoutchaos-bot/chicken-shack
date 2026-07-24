export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.userId) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  let name = session.name
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    try {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(session.userId)}&select=full_name&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(8_000),
        },
      )
      let latestName = ''
      if (profileRes.ok) {
        const profiles = await profileRes.json()
        latestName =
          Array.isArray(profiles) && typeof profiles[0]?.full_name === 'string'
            ? profiles[0].full_name.trim()
            : ''
      }

      if (!latestName) {
        const orderRes = await fetch(
          `${supabaseUrl}/rest/v1/orders?user_id=eq.${encodeURIComponent(session.userId)}` +
            '&select=customer_name&customer_name=not.is.null&order=created_at.desc&limit=1',
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(8_000),
          },
        )
        if (orderRes.ok) {
          const orders = await orderRes.json()
          latestName =
            Array.isArray(orders) && typeof orders[0]?.customer_name === 'string'
              ? orders[0].customer_name.trim()
              : ''
        }
        if (latestName) {
          await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(session.userId)}`,
            {
              method: 'PATCH',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ full_name: latestName }),
              signal: AbortSignal.timeout(8_000),
            },
          )
        }
      }

      if (latestName) {
        name = latestName
        if (session.name !== latestName) {
          session.name = latestName
          await session.save()
        }
      }
    } catch {
      // The existing authenticated session remains usable if profile lookup fails.
    }
  }

  return NextResponse.json({
    user: {
      id:    session.userId,
      phone: session.phone,
      name,
    },
  })
}
