'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertCircle, LogOut, User } from 'lucide-react'
import { type ProductRow, type CartItem } from '@/lib/supabase-browser'
import type { AuthUser } from '@/lib/auth-types'
import Image from 'next/image'
import BannerCarousel from './BannerCarousel'

// ── colour tokens (from mockup) ─────────────────────────────────
const G = '#91d852'
const GD = '#6ab82e'
const P = '#9318cc'
// const PL  = '#c44ef5'
const INK = '#16140f'
// const CREAM = '#faf7f0'

const PRODUCT_IMAGES: Record<string, string> = {
  'boneless': '/assets/raw_chicken_breast.jpg',
  'curry-cut': '/assets/raw_chicken_cuts.jpg',
  'drumstick': '/assets/raw_chicken_cuts.jpg',
  'wings': '/assets/packaged_chicken.jpg',
  'liver': '/assets/packaged_chicken.jpg',
}


// Display a product's pack size using the admin-chosen unit (pc / g / kg).
// `amount` is the raw number the admin entered; `unit` decides how to label it.
function formatUnit(amount: number | null | undefined, unit?: string | null): string {
  if (!amount) return ''
  const u = unit ?? 'g'
  if (u === 'pc') return `${amount} pc${amount > 1 ? 's' : ''}`
  if (u === 'kg') return `${amount % 1 === 0 ? amount : amount.toFixed(2)} kg`
  return `${amount}g`
}

function productImage(p: ProductRow): string | null {
  return p.image_url ?? PRODUCT_IMAGES[p.id] ?? null
}

const REVIEWS: { name: string; initial: string; grad: string; text: string }[] = [
  {
    name: 'Roshan Chandy', initial: 'R', grad: 'linear-gradient(135deg,#3b82f6,#2563eb)',
    text: 'Ordered from you for our Sunday family lunch. The pieces you sent were nicely cut and very fresh. Even my mother, who never trusts ordering meat online, was impressed 😄 well done team!',
  },
  {
    name: 'Dhanya Ramakrishnan', initial: 'D', grad: 'linear-gradient(135deg,#ec4899,#db2777)',
    text: 'Being a working mother I rarely get time to visit the market, so thank you for making this so easy. The chicken you delivered was so clean and fresh — no smell even while cooking. Such a relief 🙏',
  },
  {
    name: 'Harsha', initial: 'H', grad: 'linear-gradient(135deg,#14b8a6,#0d9488)',
    text: 'No more standing in line at the meat shop. Order in the morning, get it cut fresh and delivered. Quality is consistently great every time.',
  },
  {
    name: 'Hemanth', initial: 'H', grad: 'linear-gradient(135deg,#9318cc,#c44ef5)',
    text: 'Honestly fed up of frozen and old stuff. Ordered from you late evening and it reached chilled and fresh. Made chilli chicken the same night, turned out superb 😋 you guys have got a regular customer now!',
  },
  {
    name: 'Prajwal Aiyappa Mallengada', initial: 'P', grad: 'linear-gradient(135deg,#9318cc,#6d28d9)',
    text: 'The webApp is super-friendly and ordering is very easy within 4 clicks, that’s excellent. Also the product is toooo good 😍👍🏻',
  },
  {
    name: 'Rakesh Sathish', initial: 'R', grad: 'linear-gradient(135deg,#91d852,#6ab82e)',
    text: 'Really impressed with this order! The chicken arrived on time, was very well packed and had zero smell. Tasted fresh and delicious. Great job on packaging and delivery!👍🏻',
  },
  {
    name: 'Sooraj Kumar', initial: 'S', grad: 'linear-gradient(135deg,#f59e0b,#d97706)',
    text: 'My wife is very particular about meat and even she had no complaints with what you sent. Properly cleaned, hardly any extra fat and the weight was exactly as mentioned. At this age I value honesty in business, and you people deliver it. Keep it up 🙏',
  },
]

interface Props {
  user: AuthUser | null
  cart: CartItem[]
  onAddToCart: (item: CartItem) => void
  onUpdateQty: (productId: string, qty: number) => void
  onOpenCart: () => void
  onLoginRequired: () => void
  onLogout: () => void
  onChangeArea?: () => void
  cartTotal: number
  cartItemCount: number
  areaName?: string
  pincode?: string
  storeOpen?: boolean
  outOfStock?: boolean
  announcement?: string
  bannerImages?: string[]
  productOrder?: string[]
  productUnits?: Record<string, string>
}

export default function ShopTab({
  user, cart, onAddToCart, onUpdateQty, onOpenCart, onLoginRequired, onLogout, onChangeArea,
  cartTotal, cartItemCount, areaName, pincode, storeOpen = true, outOfStock = false, announcement, bannerImages = [], productOrder = [], productUnits = {},
}: Props) {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const [expandedNameIdx, setExpandedNameIdx] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/products', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setProducts(await res.json())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  function getCartQty(productId: string) {
    return cart.find(c => c.productId === productId)?.quantity ?? 0
  }

  const hasCart = cartItemCount > 0

  // Apply the admin's custom display order: products listed in `productOrder`
  // come first (in that order); any not listed keep their original order at the end.
  const orderedProducts = (() => {
    if (!productOrder.length) return products
    const rank = new Map(productOrder.map((id, i) => [id, i]))
    return [...products].sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER
      const rb = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER
      return ra - rb
    })
  })()

  const heroProduct = orderedProducts[0] ?? null

  const gridProducts = orderedProducts.slice(1)

  const hasDeliveryAddress = Boolean(areaName || pincode)
  const locationText = areaName
    ? `${areaName}${pincode ? ` · ${pincode}` : ''}`
    : pincode ?? 'Add pincode with address'

  return (
    <div style={{ minHeight: '100%', background: '#faf7f0', fontFamily: "'DM Mono', monospace" }}>

      {/* ══ HEADER ══ */}
      <div className="sticky top-0 z-20" style={{ flexShrink: 0 }}>

        {/* Row 1: brand + buttons — WHITE background */}
        <div style={{ padding: '10px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', borderBottom: '1px solid rgba(22,20,15,.07)' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Purple "B" letter mark */}
            <div style={{
              width: 42, height: 42, borderRadius: 11,
              background: 'rgba(147,24,204,.08)',
              border: '1.5px solid rgba(147,24,204,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 5px 14px rgba(31,17,11,.08)',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 22, color: '#9318cc', lineHeight: 1 }}>B</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 11.5, color: INK, letterSpacing: '0.04em' }}>
                B&apos;LURU FRESH
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            <a
              href="tel:7259516664"
              style={{
                width: 36, height: 36, borderRadius: 11,
                background: 'rgba(22,20,15,.06)', border: '1px solid rgba(22,20,15,.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                textDecoration: 'none',
              }}
            >📞</a>

            <div style={{ position: 'relative' }} ref={menuRef}>
              {user ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    style={{
                      width: 36, height: 36, borderRadius: 11,
                      background: 'rgba(22,20,15,.06)', border: '1px solid rgba(22,20,15,.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <User size={16} color={INK} strokeWidth={2.5} />
                  </button>
                  {userMenuOpen && (
                    <div style={{
                      position: 'fixed', width: 220, background: '#fff', borderRadius: 16,
                      overflow: 'hidden', zIndex: 200,
                      top: 'calc(env(safe-area-inset-top, 0px) + 4rem)', right: '1rem',
                      boxShadow: '0 8px 40px rgba(0,0,0,.18)',
                      border: '1px solid rgba(147,24,204,.12)',
                    }}>
                      <div style={{ padding: '10px 16px', background: '#f3e8ff', borderBottom: `1px solid rgba(147,24,204,.15)` }}>
                        <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: P }}>Signed in as</p>
                        <p style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.name ?? `+91 ${user.phone}`}
                        </p>
                      </div>
                      <button
                        onClick={() => { setUserMenuOpen(false); onLogout() }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <LogOut size={14} strokeWidth={2} />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Sign out</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={onLoginRequired}
                  style={{
                    width: 36, height: 36, borderRadius: 11,
                    background: 'rgba(22,20,15,.06)', border: '1px solid rgba(22,20,15,.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, cursor: 'pointer',
                  }}
                >👤</button>
              )}
            </div>
          </div>
        </div>

        {/* Location row — white background, black text */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 10px', background: '#ffffff', borderBottom: '1px solid rgba(22,20,15,.07)' }}>
          <style>{`
            @keyframes locpulse {
              0%,100%{box-shadow:0 0 0 3px rgba(145,216,82,.25),0 0 0 6px rgba(145,216,82,.08)}
              50%{box-shadow:0 0 0 5px rgba(145,216,82,.35),0 0 0 10px rgba(145,216,82,.12)}
            }
            @keyframes tickerscroll {from{transform:translateX(0)}to{transform:translateX(-50%)}}
            @keyframes tickerGradient {0%{background-position:0% 50%}100%{background-position:200% 50%}}
            @keyframes heroBlink {0%,100%{opacity:1}50%{opacity:.2}}
            @keyframes heroGlowBtn {0%,100%{box-shadow:0 4px 20px rgba(145,216,82,.4)}50%{box-shadow:0 4px 30px rgba(145,216,82,.7)}}
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: G, flexShrink: 0, animation: 'locpulse 2s ease-in-out infinite' }} />
            <div>
              <div style={{ fontSize: 8, letterSpacing: '0.12em', color: 'rgba(22,20,15,.4)', textTransform: 'uppercase' }}>
                {hasDeliveryAddress ? 'Delivering to' : 'Delivery check'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginTop: 1 }}>
                {locationText}
              </div>
            </div>
          </div>
          <button onClick={onChangeArea ?? onOpenCart} style={{ fontSize: 8.5, fontWeight: 700, color: P, padding: '5px 10px', borderRadius: 20, letterSpacing: '0.08em', background: 'rgba(147,24,204,.07)', border: '1px solid rgba(147,24,204,.18)', cursor: 'pointer' }}>
            {hasDeliveryAddress ? 'CHANGE ›' : 'AT CHECKOUT ›'}
          </button>
        </div>
      </div>

      {/* ══ GREEN → VIOLET TICKER STRIP ══ */}
      <div style={{ background: 'linear-gradient(90deg, #91d852 0%, #b44ef5 50%, #91d852 100%)', backgroundSize: '200% 100%', animation: 'tickerGradient 4s linear infinite', padding: '6px 0', overflow: 'hidden', display: 'flex', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 18, animation: 'tickerscroll 9s linear infinite', whiteSpace: 'nowrap' }}>
          {['NO FOUL SMELL', 'CUT AFTER ORDER', '1 HOUR DELIVERY', 'ZERO PRESERVATIVES', 'FSSAI LICENSED',
            'NO FOUL SMELL', 'CUT AFTER ORDER', '1 HOUR DELIVERY', 'ZERO PRESERVATIVES', 'FSSAI LICENSED'].map((t, i) => (
              <span key={i} style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.15em', color: '#16140f', flexShrink: 0 }}>
                {t} <span style={{ opacity: 0.35 }}>✦</span>
              </span>
            ))}
        </div>
      </div>

      {/* ══ ANNOUNCEMENT ══ */}
      {announcement && (
        <div style={{ margin: '12px 12px 0', borderRadius: 16, padding: '10px 14px', background: '#f3e8ff', border: `1px solid rgba(147,24,204,.18)`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>📢</span>
          <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: P }}>{announcement}</p>
        </div>
      )}

      {/* ══ OUT OF STOCK BANNER ══ */}
      {outOfStock && (
        <div style={{ margin: '12px 12px 0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 20px rgba(217,119,6,.18)' }}>
          <div style={{ height: 4, background: 'linear-gradient(90deg,#d97706,#f59e0b,#d97706)' }} />
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg,#fff7ed 0%,#fffbf5 100%)',
            border: '1.5px solid rgba(217,119,6,.15)', borderTop: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, background: 'linear-gradient(135deg,#d97706,#f59e0b)',
                boxShadow: '0 2px 8px rgba(217,119,6,.4)',
              }}>📦</div>
              <div>
                <p style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.2, color: INK }}>Oops, you just missed it!</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#d97706' }}>Item sold out. But you can still pre-order! 🥰</p>
              </div>
            </div>
            <div style={{ borderRadius: 12, padding: '10px 14px', background: 'rgba(217,119,6,.07)', border: '1px solid rgba(217,119,6,.12)', display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🚚</span>
              <p style={{ fontSize: 11, lineHeight: 1.6, color: INK }}>
                Place your order now and it will be{' '}
                <strong style={{ color: '#d97706' }}>freshly cut and delivered in the morning between 7 AM – 9 AM</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══ STORE CLOSED BANNER ══ */}
      {!storeOpen && (
        <div style={{ margin: '12px 12px 0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 5px 18px rgba(31,17,11,.1)' }}>
          <div style={{ height: 4, background: `linear-gradient(90deg,${P},#c44ef5,${P})` }} />
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg,#f3e8ff 0%,#faf5ff 100%)',
            border: `1.5px solid rgba(147,24,204,.15)`, borderTop: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, background: `linear-gradient(135deg,${P},#c44ef5)`,
                boxShadow: '0 2px 7px rgba(31,17,11,.14)',
              }}>🌙</div>
              <div>
                <p style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.2, color: INK }}>We&apos;re closed right now</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: P }}>But you can still order!</p>
              </div>
            </div>
            <div style={{ borderRadius: 12, padding: '10px 14px', background: 'rgba(147,24,204,.07)', border: `1px solid rgba(147,24,204,.12)`, display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🚚</span>
              <p style={{ fontSize: 11, lineHeight: 1.6, color: INK }}>
                Place your order now and it will be{' '}
                <strong style={{ color: P }}>freshly cut and delivered in the morning between 7 AM – 9 AM</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══ BANNER CAROUSEL ══ */}
      {bannerImages.length > 0 && (
        <BannerCarousel images={bannerImages} />
      )}

      {/* ══ SCROLLABLE BODY ══ */}
      <div style={{ background: '#faf7f0' }}>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 12px 0' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ borderRadius: 18, overflow: 'hidden', border: '1.5px solid rgba(22,20,15,.06)', background: '#fff', animation: 'pulse 1.5s ease-in-out infinite' }}>
                <div style={{ height: 145, background: '#f2ede0' }} />
                <div style={{ padding: 10 }}>
                  <div style={{ height: 14, borderRadius: 8, background: '#f2ede0', marginBottom: 6 }} />
                  <div style={{ height: 10, borderRadius: 8, background: '#f7f4ee', width: '60%', marginBottom: 8 }} />
                  <div style={{ height: 32, borderRadius: 10, background: '#f2ede0' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ margin: '12px', borderRadius: 16, padding: '14px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── EDITORIAL HERO (first product) ── */}
            {heroProduct && (() => {
              const heroImg = productImage(heroProduct)

              const heroDiscount = heroProduct.discount_percentage ?? 0
              const heroSalePrice = heroDiscount > 0
                ? Math.round(heroProduct.price_per_kg * (1 - heroDiscount / 100))
                : heroProduct.price_per_kg
              const heroQty = getCartQty(heroProduct.id)
              const heroOOS = heroProduct.stock_quantity === 0
              return (
                <div style={{ position: 'relative', height: 240, overflow: 'hidden', background: INK }}>
                  {/* Background image */}
                  {heroImg && (
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.55, transform: 'scale(1.05)' }}>
                      <Image src={heroImg} alt={heroProduct.name} fill className="object-cover" sizes="430px" />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(135deg,rgba(22,20,15,.9) 0%,rgba(22,20,15,.5) 50%,transparent 100%)',
                  }} />
                  {/* Content */}
                  <div style={{ position: 'absolute', inset: 0, padding: '18px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 8, letterSpacing: '0.2em', color: G, textTransform: 'uppercase',
                        borderBottom: `1px solid rgba(145,216,82,.3)`, paddingBottom: 3,
                      }}>
                        <span style={{ width: 5, height: 5, background: G, borderRadius: '50%', animation: 'heroBlink 1.2s ease infinite', display: 'inline-block' }} />
                        Most Popular
                      </div>
                      {heroDiscount > 0 ? (
                        <div style={{
                          background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                          color: '#fff', fontSize: 8, fontWeight: 700,
                          padding: '4px 10px', borderRadius: 20, letterSpacing: '0.08em',
                          boxShadow: '0 4px 16px rgba(22,163,74,.5)',
                        }}>{heroDiscount}% OFF</div>
                      ) : (
                        <div style={{
                          background: 'linear-gradient(135deg,#9318cc,#c44ef5)',
                          color: '#fff', fontSize: 8, fontWeight: 700,
                          padding: '4px 10px', borderRadius: 20, letterSpacing: '0.08em',
                          boxShadow: '0 4px 12px rgba(31,17,11,.14)',
                        }}>⭐ BEST SELLER</div>
                      )}
                    </div>

                    {/* Bottom block */}
                    <div>
                      <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6 }}>
                        {heroProduct.name}
                      </h2>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', marginBottom: 10, letterSpacing: '0.06em' }}>
                        {formatUnit(heroProduct.weight_per_unit, productUnits[heroProduct.id])} · Cut fresh after order
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          {heroDiscount > 0 && (
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', textDecoration: 'line-through' }}>₹{heroProduct.price_per_kg}</span>
                          )}
                          <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 28, color: G, letterSpacing: '-0.02em' }}>₹{heroSalePrice}</span>
                        </div>
                        {!heroOOS && (
                          heroQty === 0 ? (
                            <button
                              onClick={() => onAddToCart({ productId: heroProduct.id, name: heroProduct.name, pricePerKg: heroSalePrice, quantity: 1, imageUrl: heroProduct.image_url, weightPerUnit: heroProduct.weight_per_unit, unit: productUnits[heroProduct.id] ?? 'g' })}
                              style={{
                                background: G, color: INK, border: 'none',
                                borderRadius: 14, padding: '11px 20px',
                                fontFamily: "'Unbounded', sans-serif", fontSize: 9, fontWeight: 700,
                                letterSpacing: '0.06em', cursor: 'pointer',
                                animation: 'heroGlowBtn 3s ease infinite',
                              }}
                            >ADD TO CART →</button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button onClick={() => onUpdateQty(heroProduct.id, heroQty - 1)} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,.35)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>−</button>
                              <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, color: '#fff', minWidth: 24, textAlign: 'center' }}>{heroQty}</span>
                              <button onClick={() => onUpdateQty(heroProduct.id, heroQty + 1)} style={{ width: 32, height: 32, borderRadius: 10, background: G, border: 'none', color: INK, fontSize: 18, cursor: 'pointer' }}>+</button>
                            </div>
                          )
                        )}
                        {heroOOS && (
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 700 }}>Out of Stock</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── SECTION HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '14px 14px 8px' }}>
              <div>
                <div style={{ fontSize: 8.5, letterSpacing: '0.2em', color: P, textTransform: 'uppercase', marginBottom: 3 }}>Today&apos;s Menu</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em', lineHeight: 0.92, color: INK }}>
                  More{' '}
                  <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: GD, fontSize: 24 }}>Fresh Cuts.</em>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: INK, borderRadius: 20, padding: '5px 11px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: G, animation: 'heroBlink 1.2s ease infinite' }} />
                <span style={{ fontSize: 8.5, fontWeight: 700, color: G, letterSpacing: '0.08em' }}>LIVE</span>
              </div>
            </div>

            {/* ── 2-COLUMN PRODUCT GRID ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 12px', paddingBottom: hasCart ? 120 : 24 }}>
              {gridProducts.map((p, idx) => {
                const qty = getCartQty(p.id)
                const inCart = qty > 0
                const outOfStock = p.stock_quantity === 0

                const imgSrc     = productImage(p)
                const cardNum    = String(idx + 2).padStart(2, '0')
                const discount   = p.discount_percentage ?? 0
                const salePrice  = discount > 0
                  ? Math.round(p.price_per_kg * (1 - discount / 100))
                  : p.price_per_kg

                return (
                  <div
                    key={p.id}
                    style={{
                      background: '#fff', borderRadius: 18, overflow: 'hidden',
                      border: inCart ? `1.5px solid rgba(147,24,204,.3)` : '1.5px solid rgba(22,20,15,.06)',
                      boxShadow: '0 2px 16px rgba(22,20,15,.06)', position: 'relative',
                      display: 'flex', flexDirection: 'column', height: '100%',
                    }}
                  >
                    {/* Image area */}
                    <div style={{ width: '100%', height: 145, overflow: 'hidden', position: 'relative', background: '#f2ede0' }}>
                      {outOfStock && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(0,0,0,.04)' }}>
                          {imgSrc && <Image src={imgSrc} alt={p.name} fill className="object-cover" style={{ filter: 'grayscale(.5)', opacity: 0.6 }} sizes="180px" />}
                        </div>
                      )}
                      {!outOfStock && imgSrc && (
                        <Image src={imgSrc} alt={p.name} fill className="object-cover" sizes="180px" />
                      )}
                      {!outOfStock && !imgSrc && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🍗</div>
                      )}

                      {/* Card number badge */}
                      <div style={{
                        position: 'absolute', top: 8, left: 8, zIndex: 2,
                        fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 11,
                        color: 'rgba(255,255,255,.9)',
                        background: 'rgba(22,20,15,.55)', backdropFilter: 'blur(4px)',
                        width: 24, height: 24, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        letterSpacing: '-0.02em',
                      }}>{cardNum}</div>

                      {/* Discount badge (replaces FRESH when active) */}
                      {!outOfStock && discount > 0 && (
                        <div style={{
                          position: 'absolute', bottom: 7, right: 7, zIndex: 2,
                          background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff',
                          fontSize: 7.5, fontWeight: 700, padding: '3px 7px',
                          borderRadius: 20, letterSpacing: '0.1em',
                        }}>{discount}% OFF</div>
                      )}
                      {!outOfStock && discount === 0 && (
                        <div style={{
                          position: 'absolute', bottom: 7, right: 7, zIndex: 2,
                          background: GD, color: '#fff',
                          fontSize: 7.5, fontWeight: 700, padding: '3px 7px',
                          borderRadius: 20, letterSpacing: '0.1em',
                        }}>FRESH</div>
                      )}

                      {/* In-cart indicator */}
                      {inCart && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8, zIndex: 3,
                          background: `linear-gradient(135deg,${P},#c44ef5)`,
                          color: '#fff', fontSize: 8, fontWeight: 700,
                          padding: '3px 7px', borderRadius: 20,
                        }}>✓ {qty}</div>
                      )}

                      {/* Low stock */}
                      {!outOfStock && p.stock_quantity > 0 && p.stock_quantity <= 5 && !inCart && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8, zIndex: 3,
                          background: '#f97316', color: '#fff', fontSize: 7.5, fontWeight: 700,
                          padding: '3px 7px', borderRadius: 20,
                        }}>ONLY {p.stock_quantity} LEFT</div>
                      )}
                    </div>

                    {/* Card body */}
                    <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14.5, color: INK, lineHeight: 1.25, marginBottom: 4 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'rgba(22,20,15,.38)', marginBottom: 9, letterSpacing: '0.04em' }}>
                        {formatUnit(p.weight_per_unit, productUnits[p.id])}
                      </div>

                      {/* Price row */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 10, marginTop: 'auto' }}>
                        {!outOfStock && discount > 0 && (
                          <span style={{ fontSize: 10, color: 'rgba(22,20,15,.28)', textDecoration: 'line-through' }}>₹{p.price_per_kg}</span>
                        )}
                        <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 17, color: outOfStock ? 'rgba(22,20,15,.25)' : discount > 0 ? '#16a34a' : P }}>
                          ₹{outOfStock ? p.price_per_kg : salePrice}
                        </span>
                      </div>

                      {/* Button */}
                      {outOfStock ? (
                        <button disabled style={{
                          width: '100%', background: 'rgba(22,20,15,.04)', color: 'rgba(22,20,15,.25)',
                          border: '1.5px solid rgba(22,20,15,.07)', borderRadius: 12, padding: '9px 0',
                          fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                          cursor: 'default',
                        }}>Out of Stock</button>
                      ) : qty === 0 ? (
                        <button
                          onClick={() => onAddToCart({ productId: p.id, name: p.name, pricePerKg: salePrice, quantity: 1, imageUrl: p.image_url, weightPerUnit: p.weight_per_unit, unit: productUnits[p.id] ?? 'g' })}
                          style={{
                            width: '100%',
                            background: 'rgba(147,24,204,.08)', color: P,
                            border: `1.5px solid rgba(147,24,204,.22)`, borderRadius: 12, padding: '9px 0',
                            fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700,
                            letterSpacing: '0.07em', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          }}
                        >+ Add to Cart</button>
                      ) : (
                        <div style={{
                          display: 'flex', alignItems: 'center', borderRadius: 12,
                          background: `linear-gradient(135deg,${P},#7b14ab)`, overflow: 'hidden',
                        }}>
                          <button onClick={() => onUpdateQty(p.id, qty - 1)} style={{ width: 38, height: 36, background: 'rgba(0,0,0,.2)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ flex: 1, textAlign: 'center', fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 14, color: '#fff' }}>{qty}</span>
                          <button onClick={() => onUpdateQty(p.id, qty + 1)} style={{ width: 38, height: 36, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ══ CUSTOMER REVIEWS ══ */}
        <div style={{ padding: '22px 0 10px' }}>
          <div style={{ padding: '0 16px', marginBottom: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 8, letterSpacing: '0.2em', color: GD, textTransform: 'uppercase', fontWeight: 700 }}>Loved by people</p>
              <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: INK, marginTop: 4, letterSpacing: '-0.01em', lineHeight: 1.1 }}>What customers say</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(145,216,82,.12)', border: '1px solid rgba(145,216,82,.3)', borderRadius: 20, padding: '5px 11px', flexShrink: 0 }}>
              <span style={{ color: '#f5a623', fontSize: 13, lineHeight: 1 }}>★</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>5.0</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(22,20,15,.45)' }}>· 1.1k</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '2px 16px 10px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
            {REVIEWS.map((rv, i) => (
              <div
                key={i}
                style={{
                  flexShrink: 0, width: 256, scrollSnapAlign: 'start',
                  background: '#fff', border: '1.5px solid rgba(22,20,15,.07)', borderRadius: 16,
                  padding: 14, boxShadow: '0 2px 10px rgba(22,20,15,.04)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', background: rv.grad, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 15, fontFamily: "'Unbounded', sans-serif",
                  }}>{rv.initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      onClick={() => setExpandedNameIdx(expandedNameIdx === i ? null : i)}
                      style={{ fontSize: 13, fontWeight: 700, color: INK, cursor: 'pointer', ...(expandedNameIdx === i ? {} : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}
                    >{rv.name}</p>
                    <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>

                      {[0,1,2,3,4].map(s => <span key={s} style={{ color: '#f5a623', fontSize: 11, lineHeight: 1 }}>★</span>)}

                    </div>
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 700, color: GD, background: 'rgba(106,184,46,.1)', border: '1px solid rgba(106,184,46,.25)', borderRadius: 20, padding: '3px 7px', flexShrink: 0, letterSpacing: '0.04em' }}>✓ Verified</span>
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(22,20,15,.62)' }}>{rv.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px 24px', textAlign: 'center', borderTop: '1px solid rgba(22,20,15,.06)', margin: '0 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 6 }}>
            <a href="/legal/terms" style={{ fontSize: 10, color: '#a8896a', textDecoration: 'none' }}>Terms</a>
            <a href="/legal/privacy" style={{ fontSize: 10, color: '#a8896a', textDecoration: 'none' }}>Privacy</a>
            <a href="/legal/refund" style={{ fontSize: 10, color: '#a8896a', textDecoration: 'none' }}>Refunds</a>
          </div>
          <p style={{ fontSize: 10, color: '#c4a882' }}>
            © {new Date().getFullYear()} The Chicken Shack. All rights reserved.
          </p>
        </div>

        {/* Cart FAB (hidden — cart is in BottomNav) */}
        {hasCart && (
          <div
            className="lg:hidden"
            style={{ position: 'sticky', bottom: 0, padding: '8px 12px 16px', background: 'linear-gradient(to top,#faf7f0 55%,transparent)', zIndex: 10 }}
            onClick={onOpenCart}
          >
            {/* intentionally empty — cart pill lives in BottomNav on mobile */}
          </div>
        )}
      </div>
    </div>
  )
}
