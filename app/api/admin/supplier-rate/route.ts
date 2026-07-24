export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/app/api/admin/login/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

type ProductPrice = {
  id: string
  price_per_kg: number
}

function headers(prefer?: string) {
  return {
    apikey: SUPA_SRV(),
    Authorization: `Bearer ${SUPA_SRV()}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  }
}

async function getCurrentSupplierRate(): Promise<number> {
  const response = await fetch(
    `${SUPA_URL()}/rest/v1/settings?key=eq.supplier_rate&select=value`,
    { headers: headers(), cache: 'no-store' },
  )
  const rows: { value?: unknown }[] = await response.json().catch(() => [])
  const value = Number(rows[0]?.value)
  return Number.isFinite(value) && value > 0 ? value : 160
}

async function saveSupplierRate(value: number) {
  const patch = await fetch(
    `${SUPA_URL()}/rest/v1/settings?key=eq.supplier_rate`,
    {
      method: 'PATCH',
      headers: headers('return=representation'),
      body: JSON.stringify({ value }),
    },
  )
  const rows = await patch.json().catch(() => [])
  if (!Array.isArray(rows) || rows.length === 0) {
    const insert = await fetch(`${SUPA_URL()}/rest/v1/settings`, {
      method: 'POST',
      headers: headers('return=minimal'),
      body: JSON.stringify({ key: 'supplier_rate', value }),
    })
    if (!insert.ok) throw new Error('Could not save supplier rate')
  }
}

async function updatePrice(product: ProductPrice, price: number) {
  return fetch(
    `${SUPA_URL()}/rest/v1/products?id=eq.${encodeURIComponent(product.id)}`,
    {
      method: 'PATCH',
      headers: headers('return=minimal'),
      body: JSON.stringify({
        price_per_kg: price,
        updated_at: new Date().toISOString(),
      }),
    },
  )
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const newRate = Number(body.supplier_rate)
  if (!Number.isFinite(newRate) || newRate <= 0 || newRate > 10_000) {
    return NextResponse.json({ error: 'Enter a valid supplier rate' }, { status: 400 })
  }

  try {
    const currentRate = await getCurrentSupplierRate()
    const productsResponse = await fetch(
      `${SUPA_URL()}/rest/v1/products?select=*&order=name.asc`,
      { headers: headers(), cache: 'no-store' },
    )
    if (!productsResponse.ok) throw new Error('Could not load products')

    const products = await productsResponse.json()
    if (!Array.isArray(products)) throw new Error('Invalid product data')

    if (Math.abs(newRate - currentRate) < 0.001) {
      return NextResponse.json({
        ok: true,
        supplier_rate: newRate,
        multiplier: 1,
        products,
      })
    }

    const multiplier = newRate / currentRate
    const originalPrices = new Map<string, number>()
    const updatedProducts = products.map(product => {
      const currentPrice = Number(product.price_per_kg) || 0
      originalPrices.set(product.id, currentPrice)
      return {
        ...product,
        price_per_kg: Math.round(currentPrice * multiplier * 100) / 100,
      }
    })

    const updates = await Promise.all(
      updatedProducts.map(product => updatePrice(product, product.price_per_kg)),
    )
    if (updates.some(response => !response.ok)) {
      await Promise.allSettled(
        products.map(product =>
          updatePrice(product, originalPrices.get(product.id) ?? (Number(product.price_per_kg) || 0)),
        ),
      )
      throw new Error('One or more product prices could not be updated')
    }

    try {
      await saveSupplierRate(newRate)
    } catch (error) {
      await Promise.allSettled(
        products.map(product =>
          updatePrice(product, originalPrices.get(product.id) ?? (Number(product.price_per_kg) || 0)),
        ),
      )
      throw error
    }

    return NextResponse.json({
      ok: true,
      supplier_rate: newRate,
      multiplier,
      products: updatedProducts,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update prices' },
      { status: 500 },
    )
  }
}
