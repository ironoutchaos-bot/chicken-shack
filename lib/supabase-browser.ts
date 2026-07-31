import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _browser: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (_browser) return _browser
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'
  _browser = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'bf-auth',
    },
  })
  return _browser
}

export type Profile = {
  id: string
  phone_number: string
  full_name: string | null
  address_json: Record<string, string>
  created_at: string
}

export type ProductRow = {
  id: string
  name: string
  price_per_kg: number
  discount_percentage: number
  weight_per_unit: number | null
  image_url: string | null
  stock_quantity: number
  category: string
}

export type OrderItem = {
  productId: string
  name: string
  pricePerKg: number
  originalPrice?: number
  discountPercentage?: number
  quantity: number   // number of ordered packs/pieces
  weightPerUnit?: number | null
  unit?: 'g' | 'kg' | 'pc' | string
}

export type DeliveryAddress = {
  // legacy fields (old orders)
  line1?: string
  // new fields
  customerName?: string
  houseNumber?: string
  streetAddress?: string
  landmark?: string
  pincode?: string
  lat?: number
  lng?: number
  mapsUrl?: string
  customerPhone?: string

  deliveryDistanceKm?: number
  deliveryRadiusKm?: number
  deliveryZoneCenter?: { lat: number; lng: number }
  formattedAddress?: string
  googlePlaceId?: string
  adminDeleted?: boolean
  adminDeletedAt?: string
  adminDeletedFromStatus?: string | null
}

export type OrderRow = {
  id: string
  user_id: string
  items: OrderItem[]
  total_amount: number
  payment_status: 'pending' | 'paid' | 'failed' | 'cod'
  order_status: 'placed' | 'packed' | 'on_the_way' | 'delivered' | 'cancelled'
  cashfree_order_id: string | null
  cashfree_payment_id: string | null
  eta_minutes: number | null
  notes: string | null
  delivery_address: DeliveryAddress | null
  driver_id: string | null
  driver_name: string | null
  driver_phone: string | null
  customer_phone: string | null
  customer_name: string | null
  feedback_rating: number | null
  feedback_comment: string | null
  feedback_at: string | null
  created_at: string
  updated_at: string | null
}

export type CartItem = {
  productId: string
  name: string
  pricePerKg: number
  originalPrice?: number
  discountPercentage?: number
  quantity: number
  imageUrl: string | null
  weightPerUnit?: number | null
  unit?: 'g' | 'kg' | 'pc' | string
}

export type DriverRow = {
  id: string
  name: string
  user_id: string
  password: string
  phone: string | null
  is_active: boolean
  created_at: string
}
