'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, X, Plus, Minus, ShoppingBag, ClipboardList, ReceiptText } from 'lucide-react'
import type { AuthUser } from '@/lib/auth-types'
import type { CartItem } from '@/lib/supabase-browser'
import BottomNav from './components/BottomNav'
import ShopTab from './components/ShopTab'
import ActiveOrdersTab from './components/ActiveOrdersTab'
import HistoryTab from './components/HistoryTab'
import LoginDrawer from './components/LoginDrawer'
import CartSheet from './components/CartSheet'
import PincodeGate from './components/PincodeGate'
import InstallPrompt from './components/InstallPrompt'
import VisitTracker from './components/VisitTracker'
import { usePushNotifications } from './hooks/usePushNotifications'

export type Tab = 'shop' | 'active' | 'history'

export default function OrderApp() {
  const [user,       setUser]       = useState<AuthUser | null>(null)
  const [activeTab,  setActiveTab]  = useState<Tab>('shop')
  const [cart,       setCart]       = useState<CartItem[]>([])
  const [loginOpen,  setLoginOpen]  = useState(false)
  const [cartOpen,   setCartOpen]   = useState(false)
  const [activeCount,          setActiveCount]          = useState(0)
  const [activeOrdersRefresh,  setActiveOrdersRefresh]  = useState(0)

  // Pincode gate
  const [pincode,  setPincode]  = useState<string | null>(null)
  const [areaName, setAreaName] = useState('')

  // Live settings
  const [storeOpen,    setStoreOpen]    = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const [minOrder,     setMinOrder]     = useState(0)
  const [deliveryFee,  setDeliveryFee]  = useState(0)
  const [bannerImages, setBannerImages] = useState<string[]>([])

  const { status: pushStatus, subscribe: subscribePush } = usePushNotifications(user?.id ?? null)
  const [pushDismissed, setPushDismissed] = useState(false)

  const showPushBanner = (
    user &&
    !pushDismissed &&
    pushStatus === 'idle' &&
    (activeTab === 'active' || activeTab === 'history') &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'default'
  )

  // ── Auth hydration ────────────────────────────────────────────
  // Reads iron-session cookie on mount; no Supabase auth listener needed.
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => { if (data.user) setUser(data.user) })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
    setCart([])
    setActiveTab('shop')
  }

  // ── Cashfree payment return handler ──────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cfOrderId = params.get('cashfree_order_id')
    if (!cfOrderId) return

    window.history.replaceState({}, '', window.location.pathname)

    const pendingStr = localStorage.getItem('bf-pending-payment')
    if (!pendingStr) {
      // No localStorage entry — order was already handled (e.g. by webhook).
      // Still clear the cart and show active orders.
      setCart([])
      setActiveTab('active')
      return
    }
    localStorage.removeItem('bf-pending-payment')

    async function completePayment() {
      // The order was already saved to DB with payment_status:'pending' before
      // the redirect — so clear the cart and show active orders immediately.
      // Then verify + update payment status in the background.
      setCart([])
      setActiveTab('active')

      // Verify with Cashfree, then mark the DB order as paid
      try {
        const vRes = await fetch('/api/cashfree/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: cfOrderId }),
        })
        if (!vRes.ok) {
          console.error('[completePayment] Cashfree verify failed:', await vRes.text().catch(() => ''))
          return // webhook will handle it if payment did go through
        }

        await fetch('/api/orders/cod', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashfree_order_id: cfOrderId,
            payment_status:    'paid',
          }),
        }).catch(err => console.error('[completePayment] PATCH error:', err))

        // Force ActiveOrdersTab to re-fetch now that payment_status is 'paid'
        setActiveOrdersRefresh(k => k + 1)
      } catch (err) {
        console.error('[completePayment] error:', err)
      }
    }

    completePayment().catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Settings ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setStoreOpen(d.store_open !== false)
        setAnnouncement(typeof d.announcement === 'string' ? d.announcement : '')
        setMinOrder(typeof d.min_order_amount === 'number' ? d.min_order_amount : 0)
        setDeliveryFee(typeof d.delivery_fee === 'number' ? d.delivery_fee : 0)
        setBannerImages(Array.isArray(d.banner_images) ? d.banner_images : [])
      })
      .catch(() => {})
  }, [])

  // ── Cart persistence ──────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bf-cart')
      if (saved) setCart(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('bf-cart', JSON.stringify(cart))
    // Push cart snapshot to server for logged-in users (abandoned cart tracking)
    if (user) {
      fetch('/api/user/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, updatedAt: new Date().toISOString() }),
      }).catch(() => {})
    }
  }, [cart, user])

  // ── Cart helpers ──────────────────────────────────────────────
  const addToCart = useCallback((item: CartItem) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.productId === item.productId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: +(next[idx].quantity + item.quantity).toFixed(1) }
        return next
      }
      return [...prev, item]
    })
  }, [])

  const updateCartQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.productId !== productId))
    } else {
      setCart(prev => prev.map(c => c.productId === productId ? { ...c, quantity: qty } : c))
    }
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const cartTotal     = cart.reduce((s, c) => s + c.pricePerKg * c.quantity, 0)
  const cartItemCount = cart.reduce((s, c) => s + c.quantity, 0)

  // ── Tab switch with auth guard ────────────────────────────────
  const goToTab = useCallback((tab: Tab) => {
    if ((tab === 'active' || tab === 'history') && !user) {
      setLoginOpen(true)
      return
    }
    setActiveTab(tab)
  }, [user])

  const handlePincodeVerified = useCallback((pc: string, area: string) => {
    setPincode(pc)
    setAreaName(area)
  }, [])

  const handleAreaChange = useCallback(() => {
    try {
      localStorage.removeItem('bf-pincode')
      localStorage.removeItem('bf-area-name')
    } catch {}
    setPincode(null)
    setAreaName('')
  }, [])

  const DESKTOP_TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'shop',    label: 'Shop',    Icon: ShoppingBag  },
    { id: 'active',  label: 'Orders',  Icon: ClipboardList },
    { id: 'history', label: 'History', Icon: ReceiptText  },
  ]

  return (
    <div className="bg-stone-100 flex items-start justify-center overflow-hidden lg:overflow-visible" style={{ height: '100dvh' }}>
      <div className="w-full max-w-[430px] lg:max-w-none h-full bg-white flex flex-col lg:flex-row shadow-app">

        {!pincode ? (
          <PincodeGate onVerified={handlePincodeVerified} />
        ) : (
          <>
            {/* ── Main content column ─────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

              {/* Desktop tab bar */}
              <div
                className="hidden lg:flex items-center gap-1 px-5 py-2.5 shrink-0 border-b"
                style={{ borderColor: 'rgba(217,119,6,0.12)', background: '#FFFDF9' }}
              >
                <div className="flex items-center gap-2 mr-4">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #F59E0B, #B45309)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 28 28" aria-hidden="true">
                      <circle cx="14" cy="11" r="7" fill="white"/>
                      <rect x="12.5" y="15.5" width="3" height="9" rx="1.5" fill="white"/>
                    </svg>
                  </div>
                  <span className="font-black text-sm tracking-widest" style={{ color: '#7C2D12', letterSpacing: '0.1em' }}>
                    B&apos;LURU FRESH
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {DESKTOP_TABS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => goToTab(id)}
                      className="relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      style={activeTab === id ? {
                        background: 'linear-gradient(135deg, #FEF9EE, #FEF3C7)',
                        border: '1px solid rgba(217,119,6,0.25)',
                        color: '#92400E',
                      } : { color: '#78716C', border: '1px solid transparent' }}
                    >
                      <Icon size={15} strokeWidth={activeTab === id ? 2.5 : 1.8} />
                      {label}
                      {id === 'active' && activeCount > 0 && (
                        <span
                          className="min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black leading-none flex items-center justify-center"
                          style={{ background: '#F59E0B', color: '#fff' }}
                        >
                          {activeCount > 9 ? '9+' : activeCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable tab content */}
              <main className="flex-1 overflow-y-auto overscroll-contain"
                    style={{ WebkitOverflowScrolling: 'touch' }}>
                {activeTab === 'shop' && (
                  <ShopTab
                    user={user}
                    cart={cart}
                    onAddToCart={addToCart}
                    onUpdateQty={updateCartQty}
                    onOpenCart={() => setCartOpen(true)}
                    onLoginRequired={() => setLoginOpen(true)}
                    onLogout={handleLogout}
                    onChangeArea={handleAreaChange}
                    cartTotal={cartTotal}
                    cartItemCount={cartItemCount}
                    areaName={areaName}
                    pincode={pincode ?? undefined}
                    storeOpen={storeOpen}
                    announcement={announcement}
                    bannerImages={bannerImages}
                  />
                )}
                {activeTab === 'active' && user && (
                  <ActiveOrdersTab
                    user={user}
                    onTabCountChange={setActiveCount}
                    refreshTrigger={activeOrdersRefresh}
                  />
                )}
                {activeTab === 'history' && user && (
                  <HistoryTab
                    user={user}
                    onReorder={(items) => {
                      items.forEach(addToCart)
                      setActiveTab('shop')
                      setCartOpen(true)
                    }}
                  />
                )}
              </main>

              {showPushBanner && (
                <div className="shrink-0 px-3 pt-2 animate-fade-in">
                  <div className="bg-stone-900 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                      <Bell size={17} className="text-white" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white leading-tight">Get order updates</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Know when your order is packed &amp; on the way</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => subscribePush()}
                        className="text-[11px] font-bold bg-amber-500 text-white px-3 py-1.5 rounded-xl active:scale-95 transition-all"
                      >
                        Allow
                      </button>
                      <button
                        onClick={() => setPushDismissed(true)}
                        className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
                      >
                        <X size={13} className="text-stone-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom nav — mobile only */}
              <div className="lg:hidden">
                <BottomNav
                  activeTab={activeTab}
                  onTabChange={goToTab}
                  activeOrderCount={activeCount}
                />
              </div>
            </div>

            {/* ── Desktop cart sidebar ─────────────────────────── */}
            <div
              className="hidden lg:flex flex-col w-80 xl:w-96 shrink-0 border-l"
              style={{ borderColor: 'rgba(217,119,6,0.15)', background: '#FFFDF9' }}
            >
              {/* Sidebar header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b shrink-0"
                style={{ borderColor: 'rgba(217,119,6,0.12)' }}
              >
                <h2 className="font-black text-base tracking-tight" style={{ color: '#1C0F00' }}>Your Cart</h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] font-semibold text-red-400 hover:text-red-500 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-4xl mb-3">🛒</div>
                    <p className="text-sm font-semibold text-stone-400">Your cart is empty</p>
                    <p className="text-xs text-stone-300 mt-1">Add items to get started</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-3 bg-white rounded-2xl p-3"
                      style={{ border: '1px solid rgba(253,230,138,0.7)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#1C0F00' }}>{item.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#A8896A' }}>₹{item.pricePerKg}/pc</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(217,119,6,0.12)' }}
                        >
                          <Minus size={12} style={{ color: '#D97706' }} strokeWidth={2.5} />
                        </button>
                        <span className="text-sm font-black w-6 text-center" style={{ color: '#1C0F00' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                        >
                          <Plus size={12} className="text-white" strokeWidth={2.5} />
                        </button>
                      </div>
                      <p className="text-sm font-black w-12 text-right shrink-0" style={{ color: '#B45309' }}>
                        ₹{(item.pricePerKg * item.quantity).toFixed(0)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Sidebar footer: totals + checkout */}
              {cart.length > 0 && (
                <div
                  className="px-4 pb-6 pt-3 border-t space-y-3 shrink-0"
                  style={{ borderColor: 'rgba(217,119,6,0.12)' }}
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#78716C' }}>Subtotal</span>
                      <span className="font-semibold" style={{ color: '#1C0F00' }}>₹{cartTotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#78716C' }}>Delivery</span>
                      <span className="font-semibold" style={{ color: deliveryFee === 0 ? '#059669' : '#1C0F00' }}>
                        {deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}
                      </span>
                    </div>
                    <div
                      className="flex justify-between font-black text-base pt-1.5 border-t"
                      style={{ borderColor: 'rgba(217,119,6,0.12)' }}
                    >
                      <span style={{ color: '#1C0F00' }}>Total</span>
                      <span style={{ color: '#B45309' }}>₹{(cartTotal + deliveryFee).toFixed(0)}</span>
                    </div>
                  </div>

                  {minOrder > 0 && cartTotal < minOrder && (
                    <p className="text-xs text-center rounded-xl px-3 py-2" style={{ background: '#FFFBEB', color: '#B45309' }}>
                      Add ₹{(minOrder - cartTotal).toFixed(0)} more to reach minimum order
                    </p>
                  )}

                  <button
                    onClick={() => setCartOpen(true)}
                    disabled={minOrder > 0 && cartTotal < minOrder}
                    className="w-full text-white rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 55%, #B45309 100%)',
                      boxShadow: '0 4px 20px rgba(217,119,6,0.4)',
                    }}
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <VisitTracker />
        <InstallPrompt />

        <LoginDrawer
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSuccess={(u) => {
            setUser(u)
            setLoginOpen(false)
          }}
        />

        <CartSheet
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          onUpdateQty={updateCartQty}
          onClear={clearCart}
          user={user}
          onLoginRequired={() => { setCartOpen(false); setLoginOpen(true) }}
          savedPincode={pincode ?? undefined}
          minOrderAmount={minOrder}
          deliveryFee={deliveryFee}
          onOrderPlaced={() => {
            clearCart()
            setCartOpen(false)
            setActiveTab('active')
          }}
        />
      </div>
    </div>
  )
}
