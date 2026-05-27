export const dynamic = 'force-dynamic'

/**
 * Banner image upload — three endpoints:
 *
 * GET  /api/admin/banner-images?filename=xxx
 *   Returns a Supabase signed upload URL (kept for reference, not used by UI).
 *
 * POST /api/admin/banner-images   body: FormData { file: File }
 *   Uploads the file through the server (no CORS) and records the public URL.
 *   Also accepts legacy { url: string } JSON to record a pre-uploaded URL.
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

// ── GET — return a signed upload URL (kept for reference) ─────────────────────
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const filename = new URL(req.url).searchParams.get('filename') ?? 'banner.jpg'
  const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeName = `banner_${Date.now()}.${ext}`

  try {
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
    const signedPath = body.signedUrl ?? body.signedURL ?? body.url ?? ''
    const uploadUrl  = signedPath.startsWith('http') ? signedPath : `${SUPA_URL()}${signedPath}`
    const publicUrl  = `${SUPA_URL()}/storage/v1/object/public/${BUCKET}/${safeName}`

    return NextResponse.json({ uploadUrl, publicUrl })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── POST — upload file through server (no CORS) and record URL ────────────────
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') ?? ''

  // Legacy: accept { url } JSON body (record a pre-uploaded URL)
  if (contentType.includes('application/json')) {
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

  // Primary: multipart form data — upload file through server to avoid browser CORS
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file in form data' }, { status: 400 })

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const safeName = `banner_${Date.now()}.${ext}`

    // Server-to-server upload — no CORS
    const arrayBuf  = await file.arrayBuffer()
    const uploadRes = await fetch(
      `${SUPA_URL()}/storage/v1/object/${BUCKET}/${safeName}`,
      {
        method:  'POST',
        headers: srvHeaders({ 'Content-Type': file.type, 'x-upsert': 'true' }),
        body:    arrayBuf,
      }
    )

    if (!uploadRes.ok) {
      const txt = await uploadRes.text()
      if (txt.includes('Bucket not found') || uploadRes.status === 404) {
        return NextResponse.json(
          { error: 'Storage bucket "banners" not found. Go to Supabase Dashboard → Storage, create a bucket named "banners" and set it to Public.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: `Storage upload failed: ${txt}` }, { status: 500 })
    }

    const publicUrl = `${SUPA_URL()}/storage/v1/object/public/${BUCKET}/${safeName}`
    const current   = await getBannerImages()
    await setBannerImages([...current, publicUrl])
    return NextResponse.json({ url: publicUrl })
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
