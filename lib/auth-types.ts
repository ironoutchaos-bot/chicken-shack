export type AuthUser = {
  id: string        // UUID from profiles table (= auth.users UUID for existing users)
  phone: string     // 10-digit phone number, no country code
  name: string | null
}
