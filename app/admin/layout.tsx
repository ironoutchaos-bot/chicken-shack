'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { href: '/admin/inventory', label: '📦 Inventory'              },
  { href: '/admin/orders',    label: '🛒 Orders'                 },
  { href: '/admin/drivers',   label: '🚗 Drivers'                },
  { href: '/admin/pincodes',  label: '📍 Pincodes'               },
  { href: '/admin/users',     label: '👥 Users'                  },
  { href: '/admin/analytics', label: '📊 Analytics'              },
  { href: '/admin/coupons',   label: '🎟️ Coupons'                },
  { href: '/admin/feedback',  label: '⭐ Feedback'               },
  { href: '/admin/settings',  label: '⚙️ Settings'               },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    await fetch('/api/admin/login', { method: 'DELETE' }).catch(() => {})
    router.push('/admin')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fcfcfc', fontFamily: 'system-ui' }}>
      {/* Top nav bar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        <span style={{
          fontWeight: 700, color: '#1a1109', fontSize: '0.875rem',
          padding: '0.875rem 1rem 0.875rem 1rem',
          whiteSpace: 'nowrap', flexShrink: 0,
          borderRight: '1px solid #f3f4f6',
        }}>
          🐔 Admin
        </span>
        {NAV.map(n => {
          const active = pathname.startsWith(n.href)
          return (
            <Link
              key={n.href}
              href={n.href}
              style={{
                padding: '0.875rem 0.875rem',
                fontWeight: active ? 700 : 500,
                color: active ? '#d97706' : '#6b5744',
                borderBottom: active ? '2px solid #d97706' : '2px solid transparent',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {n.label}
            </Link>
          )
        })}

        {/* Sign out — right-aligned */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '0 0.75rem', flexShrink: 0 }}>
          <button
            onClick={handleSignOut}
            style={{
              background: 'transparent',
              border: '1.5px solid #e5e7eb',
              borderRadius: 8,
              padding: '0.35rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: '#9ca3af',
              fontWeight: 600,
              fontFamily: 'system-ui',
              whiteSpace: 'nowrap',
            }}
          >
            Sign out
          </button>
        </div>
      </nav>
      {children}
    </div>
  )
}
