import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function OrderPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => query.append(key, v))
    } else if (value !== undefined) {
      query.set(key, value)
    }
  })

  redirect(query.size > 0 ? `/?${query.toString()}` : '/')
}
