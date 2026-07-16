export const dynamic = 'force-dynamic'

/**
 * Broadcast image upload.
 *
 * POST /api/admin/broadcast-image   body: FormData { file: File }
 *   Uploads the file through the server (no CORS) to the public `banners`
 *   bucket under a `broadcast_` prefix and returns its public URL.
 *
 * Unlike /api/admin/banner-images this does NOT add the URL to the carousel
 * settings list — it is a one-off hosted image used only inside a WhatsApp
 * broadcast message (shared as a link preview).
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/app/api/admin/login/route'

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

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file in form data' }, { status: 400 })

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const safeName = `broadcast_${Date.now()}.${ext}`

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
    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
