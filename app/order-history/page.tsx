import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions, type SessionData } from '@/lib/session'
import OrderHistoryClient from './OrderHistoryClient'

export const dynamic = 'force-dynamic'

export default async function OrderHistoryPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.userId) redirect('/')

  return (
    <OrderHistoryClient
      user={{
        id: session.userId,
        phone: session.phone ?? '',
        name: session.name ?? null,
      }}
    />
  )
}
