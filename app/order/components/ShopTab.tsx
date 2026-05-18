'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Minus, AlertCircle, User, LogOut, ChevronDown, MapPin, ChevronRight, Phone } from 'lucide-react'
import { type ProductRow, type CartItem } from '@/lib/supabase-browser'
import type { AuthUser } from '@/lib/auth-types'
import { UNIT_LABEL } from '@/lib/units'
import Image from 'next/image'
import BannerCarousel from './BannerCarousel'

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
  cartTotal, cartItemCount, areaName, pincode, storeOpen = true, announcement, bannerImages = [],
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

  return (
    <div className="min-h-full" style={{ background: '#FDF8F0' }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20"
        style={{
          background: 'linear-gradient(145deg, #7C2D12 0%, #B45309 55%, #D97706 100%)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          boxShadow: '0 4px 24px rgba(124,45,18,0.45)',
        }}
      >
        {/* Row 1: brand + actions */}
        <div className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2">

          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <svg width="20" height="20" viewBox="0 0 28 28" aria-hidden="true">
                <circle cx="14" cy="11" r="7" fill="white"/>
                <rect x="12.5" y="15.5" width="3" height="9" rx="1.5" fill="white"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-black text-[13px] text-white leading-none tracking-widest" style={{ letterSpacing: '0.13em' }}>
                B&apos;LURU FRESH
              </p>
              <p className="text-[10px] font-medium leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Farm-fresh chicken, Yelahanka
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="tel:7259516664"
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <Phone size={15} className="text-white" strokeWidth={2.2} />
            </a>

            <div className="relative" ref={menuRef}>
              {user ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    <User size={16} className="text-white" strokeWidth={2.5} />
                  </button>

                  {userMenuOpen && (
                    <div
                      className="fixed w-56 bg-white rounded-2xl overflow-hidden z-[200] animate-fade-in"
                      style={{
                        top: 'calc(env(safe-area-inset-top, 0px) + 4rem)',
                        right: '1rem',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(217,119,6,0.12)',
                      }}
                    >
                      <div className="px-4 py-3" style={{ background: '#FEF9EE', borderBottom: '1px solid #FDE68A' }}>
                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#B45309' }}>Signed in as</p>
                        <p className="text-xs font-semibold mt-0.5 truncate" style={{ color: '#78350F' }}>
                          {user.name ?? `+91 ${user.phone}`}
                        </p>
                      </div>
                      <button
                        onClick={() => { setUserMenuOpen(false); onLogout() }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-red-500 active:bg-red-50 transition-colors"
                      >
                        <LogOut size={14} strokeWidth={2} />
                        <span className="text-sm font-semibold">Sign out</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={onLoginRequired}
                  className="text-[11px] font-black px-4 py-2.5 rounded-xl active:scale-95 transition-all text-white"
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: delivery location pill */}
        <div className="px-4 pb-3">
          <button
            onClick={onChangeArea}
            className="w-full flex items-center gap-2.5 rounded-2xl px-4 py-2.5 active:opacity-80 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <MapPin size={13} className="text-white/70 shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <span className="text-[10px] font-semibold block leading-none" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Delivering to
              </span>
              <span className="text-[13px] font-bold text-white leading-snug truncate block mt-0.5">
                {areaName ? `${areaName}${pincode ? ` · ${pincode}` : ''}` : pincode ?? 'Select your area'}
              </span>
            </div>
            <div
              className="flex items-center gap-1 rounded-full px-2.5 py-1 shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <span className="text-[10px] font-bold text-white/90">Change</span>
              <ChevronRight size={10} className="text-white/70" />
            </div>
          </button>
        </div>

        {/* Row 3: scrollable trust strip */}
        <div
          className="overflow-x-auto pb-2.5"
          style={{ scrollbarWidth: 'none' } as React.CSSProperties}
        >
          <div className="flex items-center gap-4 px-4">
            {[
              { icon: '⚡', text: '~45 min delivery' },
              { icon: '✂️', text: 'Order to cut' },
              { icon: '🥩', text: 'Farm fresh daily' },
              { icon: '🌿', text: 'No preservatives' },
              { icon: '🛡️', text: 'FSSAI licensed' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] leading-none">{icon}</span>
                <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Banners ── */}
      {announcement && (
        <div
          className="mx-3 mt-3 rounded-2xl px-4 py-3 flex items-center gap-2.5"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <span className="text-lg shrink-0">📢</span>
          <p className="text-xs font-semibold leading-snug" style={{ color: '#78350F' }}>{announcement}</p>
        </div>
      )}
      {!storeOpen && (
        <div
          className="mx-3 mt-3 rounded-2xl px-4 py-3 text-center"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
        >
          <p className="text-sm font-bold" style={{ color: '#B91C1C' }}>🚫 Store is currently closed</p>
          <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>We&apos;re not accepting orders right now.</p>
        </div>
      )}

      {/* ── Hero Banner / Carousel ── */}
      <BannerCarousel images={bannerImages} />

      {/* ── Section label ── */}
      {!loading && !error && products.length > 0 && (
        <div className="px-4 pt-5 pb-3 flex items-end justify-between">
          <div>
            <p
              className="text-[9px] font-black uppercase leading-none"
              style={{ color: '#D97706', letterSpacing: '0.18em' }}
            >
              Menu
            </p>
            <p className="text-[22px] font-black leading-tight mt-1 tracking-tight" style={{ color: '#1C0F00' }}>
              Fresh Cuts
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 mb-0.5"
            style={{ background: '#052E16', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[10px] font-bold text-emerald-400 tracking-wide">Live & fresh</span>
          </div>
        </div>
      )}

      {/* ── Product Grid ── */}
      <div className="px-3 pb-3">
        {loading && (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-3xl overflow-hidden border animate-pulse"
                style={{ background: '#FFFDF7', borderColor: '#FDE68A' }}
              >
                <div className="w-full" style={{ paddingBottom: '88%', background: '#FEF3C7' }} />
                <div className="px-3 pt-2.5 pb-3 space-y-2">
                  <div className="h-4 rounded-full w-3/4" style={{ background: '#FEF3C7' }} />
                  <div className="h-3 rounded-full w-1/2" style={{ background: '#FEF9EE' }} />
                  <div className="h-9 rounded-2xl mt-1" style={{ background: '#FEF3C7' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            className="flex items-center gap-2.5 rounded-2xl p-4 text-sm mx-1 mt-2"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {products.map(p => {
              const qty        = getCartQty(p.id)
              const inCart     = qty > 0
              const outOfStock = p.stock_quantity === 0
              const imgSrc     = productImage(p)

              return (
                <div
                  key={p.id}
                  className={`rounded-3xl overflow-hidden flex flex-col transition-all duration-200 ${outOfStock ? 'opacity-60' : ''}`}
                  style={{
                    background: inCart ? '#FFFBF0' : '#FFFFFF',
                    border: inCart
                      ? '2px solid rgba(217,119,6,0.5)'
                      : '1px solid rgba(253,230,138,0.6)',
                    boxShadow: inCart
                      ? '0 8px 32px rgba(217,119,6,0.2), 0 2px 8px rgba(180,83,9,0.1)'
                      : '0 2px 16px rgba(120,53,15,0.07)',
                  }}
                >
                  {/* Image */}
                  <div className="relative w-full" style={{ paddingBottom: '88%', background: '#FEF3C7' }}>
                    {imgSrc ? (
                      <Image
                        src={imgSrc} alt={p.name} fill
                        className="object-cover"
                        sizes="(max-width: 430px) 48vw, 200px"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center text-5xl"
                        style={{ background: '#FEF9EE' }}
                      >
                        🍗
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}
                    />

                    {/* Price on image */}
                    <div className="absolute bottom-2 left-2.5">
                      <span className="font-black text-[19px] leading-none text-white drop-shadow-lg">
                        ₹{p.price_per_kg}
                      </span>
                      <span className="text-white/70 text-[10px] font-medium ml-0.5">/pc</span>
                    </div>

                    {/* FRESH badge */}
                    {!outOfStock && !inCart && (
                      <div
                        className="absolute top-2.5 right-2.5 text-white text-[8px] font-black px-2 py-1 rounded-full tracking-wide shadow"
                        style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                      >
                        FRESH
                      </div>
                    )}

                    {/* In-cart badge */}
                    {inCart && (
                      <div
                        className="absolute top-2.5 left-2.5 text-white text-[9px] font-black px-2 py-1 rounded-full shadow flex items-center gap-1"
                        style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                      >
                        ✓ IN CART
                      </div>
                    )}

                    {/* Low stock */}
                    {!outOfStock && p.stock_quantity > 0 && p.stock_quantity <= 5 && (
                      <div
                        className="absolute top-2.5 right-2.5 text-white text-[8px] font-bold px-2 py-1 rounded-full shadow"
                        style={{ background: '#F97316' }}
                      >
                        ONLY {p.stock_quantity} LEFT
                      </div>
                    )}

                    {/* Out of stock overlay */}
                    {outOfStock && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.75)' }}
                      >
                        <span
                          className="text-xs font-bold px-3 py-1.5 rounded-full shadow-sm"
                          style={{ background: '#fff', color: '#78716C', border: '1px solid #E7E5E4' }}
                        >
                          Out of stock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info + controls */}
                  <div className="px-3 pt-2.5 pb-3 flex flex-col gap-2 flex-1">
                    <div>
                      <h3
                        className="font-black text-[15px] leading-tight tracking-tight"
                        style={{ color: '#1C0F00' }}
                      >
                        {p.name}
                      </h3>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: '#A8896A' }}>
                        {UNIT_LABEL}
                      </p>
                    </div>

                    {!outOfStock && (
                      <div className="mt-auto">
                        {!inCart ? (
                          <button
                            onClick={() => storeOpen && onAddToCart({
                              productId: p.id, name: p.name,
                              pricePerKg: p.price_per_kg, quantity: 1, imageUrl: p.image_url,
                            })}
                            disabled={!storeOpen}
                            className="w-full text-white rounded-2xl py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-40"
                            style={{
                              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 55%, #B45309 100%)',
                              boxShadow: '0 4px 16px rgba(217,119,6,0.38)',
                            }}
                          >
                            <Plus size={14} strokeWidth={2.5} />
                            Add to Cart
                          </button>
                        ) : (
                          <div
                            className="flex items-center rounded-2xl p-0.5 gap-0.5"
                            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 55%, #B45309 100%)' }}
                          >
                            <button
                              onClick={() => onUpdateQty(p.id, qty - 1)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors active:scale-90"
                              style={{ background: 'rgba(0,0,0,0.18)' }}
                            >
                              <Minus size={14} className="text-white" strokeWidth={2.5} />
                            </button>
                            <span className="flex-1 text-center text-sm font-black text-white">{qty}</span>
                            <button
                              onClick={() => onUpdateQty(p.id, qty + 1)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors active:scale-90"
                              style={{ background: 'rgba(255,255,255,0.22)' }}
                            >
                              <Plus size={14} className="text-white" strokeWidth={2.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* ── Footer ── */}
      <div
        className="px-4 pb-6 pt-3 text-center mx-3 mb-2"
        style={{ borderTop: '1px solid rgba(217,119,6,0.12)' }}
      >
        <div className="flex justify-center gap-4 mb-2">
          <a href="/legal/terms"   className="text-[10px] transition-colors" style={{ color: '#A8896A' }}>Terms</a>
          <a href="/legal/privacy" className="text-[10px] transition-colors" style={{ color: '#A8896A' }}>Privacy</a>
          <a href="/legal/refund"  className="text-[10px] transition-colors" style={{ color: '#A8896A' }}>Refunds</a>
        </div>
        <p className="text-[10px]" style={{ color: '#C4A882' }}>
          © {new Date().getFullYear()} B&apos;LURU Fresh Chicken. All rights reserved.
        </p>
      </div>

      {/* ── Sticky cart bar — mobile only (desktop uses sidebar) ── */}
      {hasCart && (
        <div
          className="sticky bottom-0 px-3 pb-3 pt-6 z-10 lg:hidden"
          style={{ background: 'linear-gradient(to top, #FDF8F0 60%, rgba(253,248,240,0))' }}
        >
          <button
            onClick={onOpenCart}
            className="w-full text-white rounded-2xl py-3.5 px-4 flex items-center justify-between active:scale-[0.98] transition-all"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 55%, #B45309 100%)',
              boxShadow: '0 8px 32px rgba(217,119,6,0.5), 0 2px 8px rgba(180,83,9,0.25)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="rounded-xl w-8 h-8 flex items-center justify-center text-sm font-black shadow"
                style={{ background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              >
                {cartItemCount}
              </div>
              <span className="font-bold text-[15px]">View Cart</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-black text-[15px]">₹{cartTotal.toFixed(0)}</span>
              <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
