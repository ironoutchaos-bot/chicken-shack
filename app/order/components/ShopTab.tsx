'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertCircle, LogOut, User } from 'lucide-react'
import { type ProductRow, type CartItem } from '@/lib/supabase-browser'
import type { AuthUser } from '@/lib/auth-types'
import { UNIT_LABEL } from '@/lib/units'
import Image from 'next/image'

// ── colour tokens (from mockup) ─────────────────────────────────
const G   = '#91d852'
const GD  = '#6ab82e'
const P   = '#9318cc'
// const PL  = '#c44ef5'
const INK = '#16140f'
// const CREAM = '#faf7f0'

const PRODUCT_IMAGES: Record<string, string> = {
  'boneless':  '/assets/raw_chicken_breast.jpg',
  'curry-cut': '/assets/raw_chicken_cuts.jpg',
  'drumstick': '/assets/raw_chicken_cuts.jpg',
  'wings':     '/assets/packaged_chicken.jpg',
  'liver':     '/assets/packaged_chicken.jpg',
}

function productImage(p: ProductRow): string | null {
  return p.image_url ?? PRODUCT_IMAGES[p.id] ?? null
}

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
  announcement?: string
  bannerImages?: string[]
}

export default function ShopTab({
  user, cart, onAddToCart, onUpdateQty, onOpenCart, onLoginRequired, onLogout, onChangeArea,
  cartTotal, cartItemCount, areaName, pincode, storeOpen = true, announcement,
}: Props) {
  const [products,     setProducts]     = useState<ProductRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/products')
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
  const heroProduct  = products[0] ?? null
  const gridProducts = products.slice(1)

  const locationText = areaName
    ? `${areaName}${pincode ? ` · ${pincode}` : ''}`
    : pincode ?? 'Select area'

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
              boxShadow: '0 0 14px rgba(147,24,204,.12)',
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

        {/* Subtle separator line */}
        <div style={{ height: 1, background: 'rgba(255,255,255,.07)', marginTop: 10 }} />

        {/* Location row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {/* Pulsing green dot via keyframes injected inline */}
            <style>{`
              @keyframes locpulse {
                0%,100%{box-shadow:0 0 0 3px rgba(145,216,82,.2),0 0 0 6px rgba(145,216,82,.06)}
                50%{box-shadow:0 0 0 5px rgba(145,216,82,.3),0 0 0 10px rgba(145,216,82,.1)}
              }
              @keyframes tickerscroll {
                from{transform:translateX(0)}
                to{transform:translateX(-50%)}
              }
              @keyframes tickerGradient {
                0%{background-position:0% 50%}
                100%{background-position:200% 50%}
              }
              @keyframes heroBlink {
                0%,100%{opacity:1}50%{opacity:.2}
              }
              @keyframes heroGlowBtn {
                0%,100%{box-shadow:0 4px 20px rgba(145,216,82,.4)}
                50%{box-shadow:0 4px 30px rgba(145,216,82,.7)}
              }
            `}</style>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: G, flexShrink: 0,
              animation: 'locpulse 2s ease-in-out infinite',
            }} />
            <div>
              <div style={{ fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase' }}>
                Delivering to
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 1 }}>
                {locationText}
              </div>
            </div>
          </div>
          <button
            onClick={onChangeArea}
            style={{
              fontSize: 8, fontWeight: 700, color: `rgba(145,216,82,.8)`,
              padding: '5px 10px', borderRadius: 20, letterSpacing: '0.08em',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >CHANGE ›</button>
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

      {/* ══ STORE CLOSED BANNER ══ */}
      {!storeOpen && (
        <div style={{ margin: '12px 12px 0', borderRadius: 18, overflow: 'hidden', boxShadow: `0 4px 20px rgba(147,24,204,.2)` }}>
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
                boxShadow: `0 2px 8px rgba(147,24,204,.4)`,
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
                <strong style={{ color: P }}>freshly cut and delivered tomorrow morning between 7 AM – 8 AM</strong>.
              </p>
            </div>
          </div>
        </div>
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
              const heroOld = Math.round(heroProduct.price_per_kg / 0.75)
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
                      <div style={{
                        background: 'linear-gradient(135deg,#9318cc,#c44ef5)',
                        color: '#fff', fontSize: 8, fontWeight: 700,
                        padding: '4px 10px', borderRadius: 20, letterSpacing: '0.08em',
                        boxShadow: '0 4px 16px rgba(147,24,204,.5)',
                      }}>⭐ BEST SELLER</div>
                    </div>

                    {/* Bottom block */}
                    <div>
                      <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6 }}>
                        {heroProduct.name}
                      </h2>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', marginBottom: 10, letterSpacing: '0.06em' }}>
                        {UNIT_LABEL} · Cut fresh after order
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', textDecoration: 'line-through' }}>₹{heroOld}</span>
                          <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 28, color: G, letterSpacing: '-0.02em' }}>₹{heroProduct.price_per_kg}</span>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.4)' }}>/pc</span>
                        </div>
                        {!heroOOS && (
                          heroQty === 0 ? (
                            <button
                              onClick={() => onAddToCart({ productId: heroProduct.id, name: heroProduct.name, pricePerKg: heroProduct.price_per_kg, quantity: 1, imageUrl: heroProduct.image_url })}
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
                const qty        = getCartQty(p.id)
                const inCart     = qty > 0
                const outOfStock = p.stock_quantity === 0
                const imgSrc     = productImage(p)
                const cardNum    = String(idx + 2).padStart(2, '0')
                const oldPrice   = Math.round(p.price_per_kg / 0.75)

                return (
                  <div
                    key={p.id}
                    style={{
                      background: '#fff', borderRadius: 18, overflow: 'hidden',
                      border: inCart ? `1.5px solid rgba(147,24,204,.3)` : '1.5px solid rgba(22,20,15,.06)',
                      boxShadow: '0 2px 16px rgba(22,20,15,.06)', position: 'relative',
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

                      {/* FRESH badge */}
                      {!outOfStock && (
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
                    <div style={{ padding: 12 }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14.5, color: INK, lineHeight: 1.25, marginBottom: 4 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'rgba(22,20,15,.38)', marginBottom: 9, letterSpacing: '0.04em' }}>
                        {UNIT_LABEL}
                      </div>

                      {/* Price row */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 10 }}>
                        {!outOfStock && <span style={{ fontSize: 10, color: 'rgba(22,20,15,.28)', textDecoration: 'line-through' }}>₹{oldPrice}</span>}
                        <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 17, color: outOfStock ? 'rgba(22,20,15,.25)' : P }}>
                          ₹{p.price_per_kg}
                        </span>
                        <span style={{ fontSize: 9, color: 'rgba(22,20,15,.3)' }}>/pc</span>
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
                          onClick={() => onAddToCart({ productId: p.id, name: p.name, pricePerKg: p.price_per_kg, quantity: 1, imageUrl: p.image_url })}
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

        {/* Footer */}
        <div style={{ padding: '12px 16px 24px', textAlign: 'center', borderTop: '1px solid rgba(22,20,15,.06)', margin: '0 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 6 }}>
            <a href="/legal/terms"   style={{ fontSize: 10, color: '#a8896a', textDecoration: 'none' }}>Terms</a>
            <a href="/legal/privacy" style={{ fontSize: 10, color: '#a8896a', textDecoration: 'none' }}>Privacy</a>
            <a href="/legal/refund"  style={{ fontSize: 10, color: '#a8896a', textDecoration: 'none' }}>Refunds</a>
          </div>
          <p style={{ fontSize: 10, color: '#c4a882' }}>
            © {new Date().getFullYear()} B&apos;LURU Fresh Chicken. All rights reserved.
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
