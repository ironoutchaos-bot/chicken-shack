export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTS, mergeWithDb } from '@/lib/products'

// GET /api/products
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[products GET] url:', url ? '✓' : '✗', 'key:', key ? '✓' : '✗')

  if (!url || !key) {
    console.log('[products GET] no env vars — returning static')
    return NextResponse.json(PRODUCTS)
  }

  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` }

  // Try full schema first (after running SCHEMA.sql)
  try {
    const fullEndpoint = `${url}/rest/v1/products?select=id,name,price_per_kg,image_url,stock_quantity,category,discount_percentage,weight_per_unit&order=name.asc`
    const res = await fetch(fullEndpoint, { headers })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        // Normalise: fill in defaults for any nulls
        const rows = data.map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          price_per_kg: p.price_per_kg ?? 0,
          image_url: p.image_url ?? null,
          stock_quantity: p.stock_quantity ?? 50,
          category: p.category ?? 'chicken',
          discount_percentage: p.discount_percentage ?? 0,
          weight_per_unit: p.weight_per_unit ?? null,
        }))
        const uniqueRows = rows.filter((product, index, list) => {
          const nameKey = String(product.name).trim().toLowerCase()
          return list.findIndex(item => String(item.name).trim().toLowerCase() === nameKey) === index
        })
        return NextResponse.json(uniqueRows)
      }
    }

    // If full query failed (missing columns), fall back to basic columns
    const basicEndpoint = `${url}/rest/v1/products?select=id,name,price_per_kg&order=name.asc`
    const res2 = await fetch(basicEndpoint, { headers })

    if (res2.ok) {
      const data2 = await res2.json()
      if (Array.isArray(data2) && data2.length > 0) {
        const rows = data2.map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          price_per_kg: p.price_per_kg ?? 0,
          image_url: null,
          stock_quantity: 50,
          category: 'chicken',
        }))
        return NextResponse.json(rows)
      }
    }

    return NextResponse.json(PRODUCTS)
  } catch (err) {
    console.error('[products GET] threw:', err)
    return NextResponse.json(PRODUCTS)
  }
}

// PATCH /api/products — admin only
export async function PATCH(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const token = cookieHeader
    .split(';')
    .find(c => c.trim().startsWith('admin_token='))
    ?.split('=')[1]?.trim()

  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { id?: string; price_per_kg?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, price_per_kg } = body
  if (!id || typeof price_per_kg !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const skey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !skey) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': skey,
          'Authorization': `Bearer ${skey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ price_per_kg, updated_at: new Date().toISOString() }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('[products PATCH] error:', res.status, err)
      return NextResponse.json({ error: err }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[products PATCH] threw:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
