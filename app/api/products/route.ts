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

  async function tryFetch(endpoint: string) {
    const res = await fetch(endpoint, { headers, cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) && data.length > 0 ? data : null
  }

  try {

    // Tier 1: full schema including new columns (discount + weight)
    const tier1 = await tryFetch(
      `${url}/rest/v1/products?select=id,name,price_per_kg,discount_percentage,weight_per_unit,image_url,stock_quantity,category&order=name.asc`
    )
    const noCache = { headers: { 'Cache-Control': 'no-store, max-age=0' } }

    if (tier1) {
      return NextResponse.json(tier1.map((p: Record<string, unknown>) => ({
        id:                  p.id,
        name:                p.name,
        price_per_kg:        p.price_per_kg ?? 0,
        discount_percentage: p.discount_percentage ?? 0,
        weight_per_unit:     p.weight_per_unit ?? null,
        image_url:           p.image_url ?? null,
        stock_quantity:      p.stock_quantity ?? 50,
        category:            p.category ?? 'chicken',
      })), noCache)
    }

    // Tier 2: original columns (images + stock, without new columns)
    const tier2 = await tryFetch(
      `${url}/rest/v1/products?select=id,name,price_per_kg,image_url,stock_quantity,category&order=name.asc`
    )
    if (tier2) {
      return NextResponse.json(tier2.map((p: Record<string, unknown>) => ({
        id:                  p.id,
        name:                p.name,
        price_per_kg:        p.price_per_kg ?? 0,
        discount_percentage: 0,
        weight_per_unit:     null,
        image_url:           p.image_url ?? null,
        stock_quantity:      p.stock_quantity ?? 50,
        category:            p.category ?? 'chicken',
      })), noCache)
    }

    // Tier 3: bare minimum
    const tier3 = await tryFetch(
      `${url}/rest/v1/products?select=id,name,price_per_kg&order=name.asc`
    )
    if (tier3) {
      return NextResponse.json(tier3.map((p: Record<string, unknown>) => ({
        id:                  p.id,
        name:                p.name,
        price_per_kg:        p.price_per_kg ?? 0,
        discount_percentage: 0,
        weight_per_unit:     null,
        image_url:           null,
        stock_quantity:      50,
        category:            'chicken',
      })), noCache)
    }

    return NextResponse.json(PRODUCTS, noCache)
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
