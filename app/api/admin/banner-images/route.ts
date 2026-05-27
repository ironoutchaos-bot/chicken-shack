export const dynamic = 'force-dynamic'

/**
 * Banner image upload — three endpoints:
 *
 * GET  /api/admin/banner-images?filename=xxx
 *   Returns a Supabase signed upload URL so the browser can PUT the file
 *   directly to Supabase Storage, bypassing the 4.5 MB Vercel function limit.
 *   Response: { uploadUrl, publicUrl }
 *
 * POST /api/admin/banner-images   body: { url: string }
 *   Appends a public URL (already uploaded by the client) to the settings list.
 *
 * DELETE /api/admin/banner-images body: { url: string }
 *   Removes the file from storage + the settings list.
 */

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
  return req.cookies.get('admin_token')?.value === process.env.ADMIN_PASSWORD
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
  const h = srvHeaders({ 'Content-Type': 'application/json' })
  const patch = await fetch(
    `${SUPA_URL()}/rest/v1/settings?key=eq.banner_images`,
    {
      method:  'PATCH',
      headers: { ...h, 'Prefer': 'return=representation' },
      body:    JSON.stringify({ value: urls }),
    }
  )
  const patchBody = await patch.json().catch(() => [])
  const updated   = Array.isArray(patchBody) ? patchBody.length : (patch.ok ? 1 : 0)
  if (updated === 0) {
    await fetch(`${SUPA_URL()}/rest/v1/settings`, {
      method:  'POST',
      headers: { ...h, 'Prefer': 'return=minimal' },
      body:    JSON.stringify({ key: 'banner_images', value: urls }),
    })
  }
}

// ── GET — return a signed upload URL for direct browser → Supabase upload ────
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const filename = new URL(req.url).searchParams.get('filename') ?? 'banner.jpg'
  const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeName = `banner_${Date.now()}.${ext}`

  try {
    // Ask Supabase to create a signed upload URL (service-role key required)
    // Correct endpoint: /storage/v1/object/upload/sign/{bucket}/{path}
    const res = await fetch(
      `${SUPA_URL()}/storage/v1/object/upload/sign/${BUCKET}/${safeName}`,
      {
        method:  'POST',
        headers: srvHeaders({ 'Content-Type': 'application/json' }),
        body:    JSON.stringify({ expiresIn: 3600 }),
      }
    )

    if (!res.ok) {
      const txt = await res.text()
      if (txt.includes('Bucket not found') || res.status === 404) {
        return NextResponse.json(
          { error: 'Storage bucket "banners" not found. Go to Supabase Dashboard → Storage, create a bucket named "banners" and set it to Public.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: `Supabase error: ${txt}` }, { status: 500 })
    }

    const body = await res.json()
    // upload/sign returns { signedUrl, token, path } — signedUrl is a relative path
    const signedPath = body.signedUrl ?? body.signedURL ?? body.url ?? ''
    const uploadUrl  = signedPath.startsWith('http') ? signedPath : `${SUPA_URL()}${signedPath}`
    const publicUrl  = `${SUPA_URL()}/storage/v1/object/public/${BUCKET}/${safeName}`

    return NextResponse.json({ uploadUrl, publicUrl })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── POST — record a URL that was already uploaded directly by the client ──────
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { url?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const current = await getBannerImages()
    await setBannerImages([...current, body.url])
    return NextResponse.json({ url: body.url })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── DELETE — remove image from storage + settings list ───────────────────────
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { url?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const filename = body.url.split(`/public/${BUCKET}/`)[1]
    if (filename) {
      await fetch(
        `${SUPA_URL()}/storage/v1/object/${BUCKET}/${filename}`,
        { method: 'DELETE', headers: srvHeaders() }
      )
    }
    const current = await getBannerImages()
    await setBannerImages(current.filter(u => u !== body.url))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
