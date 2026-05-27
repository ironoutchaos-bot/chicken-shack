export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const BUCKET   = 'banners'

function srvHeaders(extra: Record<string, string> = {}) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    ...extra,
  }
}

function isAdmin(req: NextRequest) {
  const token = req.headers.get('cookie')?.split(';')
    .find(c => c.trim().startsWith('admin_token='))
    ?.split('=')[1]?.trim()
  return token === process.env.ADMIN_PASSWORD
}

async function getBannerImages(): Promise<string[]> {
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/settings?key=eq.banner_images&select=value`,
      { headers: srvHeaders() }
    )
    if (!res.ok) return []
    const rows: { value: unknown }[] = await res.json()
    if (!rows.length) return []
    const v = rows[0].value
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []
  } catch { return [] }
}

async function setBannerImages(urls: string[]) {
  // Use proper upsert — works whether the row exists or not
  await fetch(`${SUPA_URL()}/rest/v1/settings`, {
    method:  'POST',
    headers: { ...srvHeaders({ 'Content-Type': 'application/json' }), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body:    JSON.stringify({ key: 'banner_images', value: urls }),
  })
}

// POST — upload a single image, returns { url }
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG or WebP allowed' }, { status: 400 })
    }
    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Max file size is 2 MB' }, { status: 400 })
    }

    const ext      = file.name.split('.').pop() ?? 'jpg'
    const filename = `banner_${Date.now()}.${ext}`
    const buffer   = await file.arrayBuffer()

    const upload = await fetch(
      `${SUPA_URL()}/storage/v1/object/${BUCKET}/${filename}`,
      {
        method: 'POST',
        headers: srvHeaders({ 'Content-Type': file.type, 'x-upsert': 'true' }),
        body: buffer,
      }
    )

    if (!upload.ok) {
      const txt = await upload.text().catch(() => '')
      // Bucket doesn't exist yet
      if (txt.includes('Bucket not found') || upload.status === 404) {
        return NextResponse.json(
          { error: 'Storage bucket "banners" not found. Please create it in your Supabase Dashboard → Storage, set it to Public.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: `Upload failed: ${txt}` }, { status: 500 })
    }

    const publicUrl = `${SUPA_URL()}/storage/v1/object/public/${BUCKET}/${filename}`

    // Append to existing list
    const current = await getBannerImages()
    await setBannerImages([...current, publicUrl])

    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE — remove an image by URL, body: { url: string }
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { url?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    // Extract filename from URL
    const filename = body.url.split(`/public/${BUCKET}/`)[1]
    if (filename) {
      await fetch(
        `${SUPA_URL()}/storage/v1/object/${BUCKET}/${filename}`,
        { method: 'DELETE', headers: srvHeaders() }
      )
    }

    // Remove from settings list
    const current = await getBannerImages()
    await setBannerImages(current.filter(u => u !== body.url))

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
