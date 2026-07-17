import OrderApp from './OrderApp'

// Force dynamic — auth and realtime need server per request
export const dynamic = 'force-dynamic'

export default function OrderPage() {
  return <OrderApp />
}
