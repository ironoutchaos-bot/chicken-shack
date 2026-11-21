import { createHash, createSign } from 'node:crypto'
import { after } from 'next/server'
type PushJob = {
  id: string
  event_key: string
  role: 'customer' | 'driver'
  recipient_id?: string | null
  order_id: string
  kind: 'order_status' | 'driver_dispatch'
  title: string
  body: string
  attempts: number
}
type Device = { token: string; recipient_id: string }
export type MobilePushInput = Omit<PushJob, 'id' | 'attempts'>
let access: { value: string; expires: number } | undefined
let accessRequest: Promise<string> | undefined
function configured() {
  return (
    process.env.MOBILE_PUSH_ENABLED === 'true' &&
    !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
async function db<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('mobile-push-db-unconfigured')
  const result = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!result.ok) throw new Error(`mobile-push-db-${result.status}`)
  const raw = await result.text()
  return (raw ? JSON.parse(raw) : undefined) as T
}
async function bearer() {
  if (access && access.expires > Date.now()) return access.value
  if (accessRequest) return accessRequest
  accessRequest = (async () => {
    const account = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '{}'
    ) as { client_email?: string; private_key?: string; project_id?: string }
    if (!account.client_email || !account.private_key || !account.project_id)
      throw new Error('mobile-push-service-account-invalid')
    const now = Math.floor(Date.now() / 1000)
    const encoded = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString('base64url')
    const unsigned = `${encoded({ alg: 'RS256', typ: 'JWT' })}.${encoded({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })}`
    const signature = createSign('RSA-SHA256')
      .update(unsigned)
      .sign(account.private_key)
      .toString('base64url')
    const result = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${signature}`,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!result.ok) throw new Error(`mobile-push-oauth-${result.status}`)
    const data = (await result.json()) as {
      access_token?: string
      expires_in?: number
    }
    if (!data.access_token) throw new Error('mobile-push-oauth-invalid')
    access = {
      value: data.access_token,
      expires: Date.now() + (data.expires_in ?? 3600) * 1000 - 120000,
    }
    return data.access_token
  })()
  try {
    return await accessRequest
  } finally {
    accessRequest = undefined
  }
}
export function scheduleMobilePush(input: MobilePushInput) {
  if (!configured()) return
  // Request lifetime is extended by Next after; persisted events survive subsequent send failures.
  try {
    after(async () => {
      try {
        await db('mobile_push_outbox?on_conflict=event_key', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify({
            ...input,
            expires_at: new Date(
              Date.now() + (input.role === 'driver' ? 600 : 86400) * 1000
            ).toISOString(),
          }),
        })
        await drainMobilePush(5)
      } catch (error) {
        console.error(
          '[mobile push]',
          error instanceof Error ? error.message : 'failed'
        )
      }
    })
  } catch {
    console.error('[mobile push] scheduling unavailable; web flow continues')
  }
}
export async function drainMobilePush(limit = 10) {
  if (!configured()) return { configured: false, accepted: 0, failed: 0 }
  const jobs = await db<PushJob[]>('rpc/claim_mobile_push_jobs', {
    method: 'POST',
    body: JSON.stringify({ p_limit: limit }),
  })
  const deadline = Date.now() + 30000
  let accepted = 0,
    failed = 0
  for (const job of jobs) {
    try {
      if (Date.now() >= deadline) throw new Error('mobile-push-worker-budget')
      let recipients = job.recipient_id ? [job.recipient_id] : []
      if (job.role === 'driver') {
        const drivers = await db<{ id: string }[]>(
          `drivers?select=id&is_active=eq.true${
            job.recipient_id
              ? `&id=eq.${encodeURIComponent(job.recipient_id)}`
              : ''
          }`
        )
        recipients = drivers.map((driver) => driver.id)
      }
      if (!recipients.length) {
        await complete(job.id)
        continue
      }
      const devices = await db<Device[]>(
        `mobile_push_devices?select=token,recipient_id&role=eq.${
          job.role
        }&recipient_id=in.(${recipients.map(encodeURIComponent).join(',')})`
      )
      const receipts = await db<{ token_hash: string }[]>(
        `mobile_push_receipts?event_id=eq.${job.id}&select=token_hash`
      )
      const seen = new Set(receipts.map((receipt) => receipt.token_hash))
      const account = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON!
      ) as { project_id: string }
      // Bound concurrency to keep provider/worker load predictable.
      for (let offset = 0; offset < devices.length; offset += 8) {
        if (Date.now() >= deadline) throw new Error('mobile-push-worker-budget')
        await Promise.all(
          devices.slice(offset, offset + 8).map(async (device) => {
            const hash = createHash('sha256').update(device.token).digest('hex')
            if (seen.has(hash)) return
            const result = await fetch(
              `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
                account.project_id
              )}/messages:send`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${await bearer()}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message: {
                    token: device.token,
                    notification: { title: job.title, body: job.body },
                    data: {
                      eventId: job.id,
                      orderId: job.order_id,
                      role: job.role,
                      type: job.kind,
                      version: '1',
                    },
                    android: {
                      priority: 'HIGH',
                      ttl: job.role === 'driver' ? '600s' : '86400s',
                      notification: {
                        channel_id:
                          job.role === 'driver' ? 'deliveries_reward_v1' : 'orders',
                        ...(job.role === 'driver' ? { sound: 'partner_reward' } : {}),
                        tag: job.event_key,
                        icon: 'ic_stat_bluru',
                      },
                    },
                  },
                }),
                signal: AbortSignal.timeout(8000),
              }
            )
            if (!result.ok) {
              const data = (await result.json().catch(() => ({}))) as {
                error?: { details?: { errorCode?: string }[] }
              }
              if (
                data.error?.details?.some(
                  (detail) => detail.errorCode === 'UNREGISTERED'
                )
              ) {
                await db(
                  `mobile_push_devices?token=eq.${encodeURIComponent(
                    device.token
                  )}`,
                  { method: 'DELETE' }
                )
                return
              }
              if (result.status === 401) access = undefined
              throw new Error(`mobile-push-fcm-${result.status}`)
            }
            await db('mobile_push_receipts?on_conflict=event_id,token_hash', {
              method: 'POST',
              headers: {
                Prefer: 'resolution=ignore-duplicates,return=minimal',
              },
              body: JSON.stringify({ event_id: job.id, token_hash: hash }),
            })
            accepted++
          })
        )
      }
      await complete(job.id)
    } catch (error) {
      failed++
      const budget =
        error instanceof Error && error.message === 'mobile-push-worker-budget'
      await db(`mobile_push_outbox?id=eq.${job.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          lease_until: null,
          attempts: budget ? Math.max(0, job.attempts - 1) : job.attempts,
          last_error:
            error instanceof Error ? error.message : 'mobile-push-failed',
          available_at: new Date(
            Date.now() +
              (budget ? 5000 : Math.min(3600, 15 * 2 ** job.attempts) * 1000)
          ).toISOString(),
        }),
      }).catch(() => {})
    }
  }
  return { configured: true, accepted, failed }
}
async function complete(id: string) {
  await db(`mobile_push_outbox?id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      delivered_at: new Date().toISOString(),
      lease_until: null,
      last_error: null,
    }),
  })
}
export function scheduleNewOrderPush(orderId: string) {
  if (!configured()) return
  try {
    after(async () => {
      try {
        const rows = await db<
          {
            user_id?: string
            driver_id?: string
            payment_status: string
            order_status: string
          }[]
        >(
          `orders?id=eq.${encodeURIComponent(
            orderId
          )}&select=user_id,driver_id,payment_status,order_status`
        )
        const order = rows[0]
        if (
          !order ||
          !['cod', 'paid'].includes(order.payment_status) ||
          ['delivered', 'cancelled'].includes(order.order_status)
        )
          return
        const inputs: MobilePushInput[] = [
          {
            event_key: order.driver_id
              ? `order:${orderId}:assigned:${order.driver_id}`
              : `order:${orderId}:available`,
            role: 'driver',
            recipient_id: order.driver_id ?? null,
            order_id: orderId,
            kind: 'driver_dispatch',
            title: order.driver_id
              ? 'New delivery assigned'
              : 'New fresh order',
            body: 'Open your delivery desk to review the order.',
          },
        ]
        if (order.user_id)
          inputs.push({
            event_key: `order:${orderId}:placed:${order.user_id}`,
            role: 'customer',
            recipient_id: order.user_id,
            order_id: orderId,
            kind: 'order_status',
            title: 'Order received',
            body: 'Your order is confirmed. We’re getting it ready.',
          })
        for (const input of inputs)
          await db('mobile_push_outbox?on_conflict=event_key', {
            method: 'POST',
            headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
            body: JSON.stringify({
              ...input,
              expires_at: new Date(
                Date.now() + (input.role === 'driver' ? 600 : 86400) * 1000
              ).toISOString(),
            }),
          })
        await drainMobilePush(5)
      } catch (error) {
        console.error(
          '[mobile push queue]',
          error instanceof Error ? error.message : 'failed'
        )
      }
    })
  } catch {
    console.error('[mobile push] scheduling unavailable; web flow continues')
  }
}
