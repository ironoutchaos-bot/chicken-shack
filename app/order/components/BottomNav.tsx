'use client'

import type { Tab } from '../OrderApp'

const INK = '#16140f'
const G   = '#91d852'
const P   = '#9318cc'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  activeOrderCount: number
  cartTotal: number
  cartItemCount: number
  onOpenCart: () => void
}


export default function BottomNav({ activeTab, onTabChange, activeOrderCount, cartTotal, cartItemCount, onOpenCart }: Props) {
  const hasCart = cartItemCount > 0

  return (
    <div
      style={{
        paddingLeft: 12, paddingRight: 12, paddingTop: 6,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
        flexShrink: 0,
      }}
    >
      <nav
        style={{
          display: 'flex', alignItems: 'stretch',
          background: INK,
          borderRadius: 26, padding: 6, gap: 4,
          boxShadow: `0 -2px 0 rgba(145,216,82,.12),0 8px 32px rgba(0,0,0,.35)`,
        }}
      >
        {/* Shop tab */}
        <TabBtn
          id="shop"
          icon="🛒"
          label="Shop"
          active={activeTab === 'shop'}
          badge={0}
          onClick={() => onTabChange('shop')}
        />

        {/* Cart pill (between Shop and Orders when items in cart) */}
        {hasCart && (
          <button
            onClick={onOpenCart}
            style={{
              display: 'flex', alignItems: 'center', gap: 0,
              background: `linear-gradient(135deg,${P},#7b14ab)`,
              borderRadius: 16, padding: 0, overflow: 'hidden',
              boxShadow: '0 4px 18px rgba(147,24,204,.5)',
              margin: '0 4px', flexShrink: 0, cursor: 'pointer',
              border: 'none',
            }}
          >
            {/* Item count */}
            <div style={{
              background: 'rgba(255,255,255,.15)',
              padding: '10px 11px',
              fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 900, color: '#fff',
              borderRight: '1px solid rgba(255,255,255,.15)',
            }}>{Math.round(cartItemCount)}</div>
            {/* Text */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.7)', letterSpacing: '0.06em', lineHeight: 1 }}>VIEW CART</div>
              <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                ₹{cartTotal.toFixed(0)}
              </div>
            </div>
            {/* Arrow */}
            <div style={{ padding: '10px 12px 10px 4px', fontSize: 16, color: 'rgba(255,255,255,.6)' }}>›</div>
          </button>
        )}

        {/* Orders tab */}
        <TabBtn
          id="active"
          icon="📋"
          label="Orders"
          active={activeTab === 'active'}
          badge={activeOrderCount}
          onClick={() => onTabChange('active')}
        />

        {/* History tab */}
        <TabBtn
          id="history"
          icon="📜"
          label="History"
          active={activeTab === 'history'}
          badge={0}
          onClick={() => onTabChange('history')}
        />
      </nav>
    </div>
  )
}

function TabBtn({ icon, label, active, badge, onClick }: {
  id: Tab
  icon: string
  label: string
  active: boolean
  badge: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 4, padding: '10px 4px', borderRadius: 18, cursor: 'pointer',
        background: active ? `rgba(145,216,82,.12)` : 'transparent',
        border: 'none', position: 'relative',
      }}
    >
      {/* Badge */}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: 4, right: '50%', transform: 'translateX(8px)',
          minWidth: 15, height: 15, padding: '0 3px',
          background: active ? INK : G,
          color: active ? G : INK,
          borderRadius: 999, fontSize: 8, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge > 9 ? '9+' : badge}</span>
      )}
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        color: active ? G : 'rgba(255,255,255,.4)',
        textTransform: 'uppercase', lineHeight: 1,
        fontFamily: "'DM Mono', monospace",
      }}>{label}</span>
    </button>
  )
}
