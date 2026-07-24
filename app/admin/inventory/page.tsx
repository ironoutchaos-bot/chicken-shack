'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'

type Product = {
  id: string; name: string; price_per_kg: number
  stock_quantity: number; discount_percentage: number
  weight_per_unit: number | null
  category: string; image_url: string | null
}

const FALLBACK_IMAGES: Record<string, string> = {
  boneless:  '/assets/raw_chicken_breast.jpg',
  'curry-cut': '/assets/raw_chicken_cuts.jpg',
  drumstick: '/assets/raw_chicken_cuts.jpg',
  wings:     '/assets/packaged_chicken.jpg',
  liver:     '/assets/packaged_chicken.jpg',
}

export default function AdminInventoryPage() {
  const [authed,   setAuthed]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [logging,  setLogging]  = useState(false)
  const [loginErr, setLoginErr] = useState('')

  const [products,  setProducts]  = useState<Product[]>([])
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState<string | null>(null)
  const [saved,     setSaved]     = useState<string | null>(null)
  const [addOpen,   setAddOpen]   = useState(false)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)
  const [threshold, setThreshold] = useState(10)
  const [supplierRate, setSupplierRate] = useState(160)
  const [supplierRateInput, setSupplierRateInput] = useState('160')
  const [savingSupplierRate, setSavingSupplierRate] = useState(false)
  const [supplierRateMessage, setSupplierRateMessage] = useState('')
  const [supplierRateError, setSupplierRateError] = useState('')

  // Display-order arrangement (stored in settings.product_order)
  const [order,       setOrder]       = useState<string[]>([])
  const [orderOpen,   setOrderOpen]   = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderSaved,  setOrderSaved]  = useState(false)

  // Per-product display unit (pc / g / kg), stored in settings.product_units
  const [units, setUnits] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    try {
      const [data, settings] = await Promise.all([
        fetch('/api/inventory').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()).catch(() => ({})),
      ])
      const prods: Product[] = Array.isArray(data) ? data : []
      setProducts(prods)
      // Reconcile saved order with current products: saved ones first, new ones appended.
      const saved: string[] = Array.isArray(settings.product_order) ? settings.product_order : []
      const ids = prods.map(p => p.id)
      setOrder([...saved.filter(id => ids.includes(id)), ...ids.filter(id => !saved.includes(id))])
      setUnits(settings.product_units && typeof settings.product_units === 'object' ? settings.product_units : {})
      const currentSupplierRate = Number(settings.supplier_rate)
      const validSupplierRate = Number.isFinite(currentSupplierRate) && currentSupplierRate > 0
        ? currentSupplierRate
        : 160
      setSupplierRate(validSupplierRate)
      setSupplierRateInput(String(validSupplierRate))
    } catch {} finally { setLoading(false) }
  }

  async function saveUnit(id: string, unit: string) {
    const next = { ...units, [id]: unit }
    setUnits(next)
    await fetch('/api/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'product_units', value: next }),
    }).catch(() => {})
  }

  function moveOrder(index: number, dir: -1 | 1) {
    setOrder(prev => {
      const next = [...prev]
      const j = index + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  async function saveOrder() {
    setSavingOrder(true)
    try {
      await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'product_order', value: order }),
      })
      setOrderSaved(true); setTimeout(() => setOrderSaved(false), 2500)
    } finally { setSavingOrder(false) }
  }

  useEffect(() => {
    const stored = localStorage.getItem('bf-stock-threshold')
    if (stored !== null) setThreshold(Number(stored))
    fetch('/api/admin/ping').then(r => { if (r.ok) { setAuthed(true); load() } }).catch(() => {}).finally(() => setChecking(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleThresholdChange(val: number) {
    setThreshold(val)
    localStorage.setItem('bf-stock-threshold', String(val))
  }

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLogging(true); setLoginErr('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setLoginErr('Incorrect password'); return }
      setAuthed(true); load()
    } catch { setLoginErr('Network error') } finally { setLogging(false) }
  }

  async function saveProduct(id: string, patch: Partial<Product>) {
    setSaving(id)
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        alert('Save failed: ' + (err.error ?? 'Unknown error'))
        return
      }
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
      setSaved(id); setTimeout(() => setSaved(null), 2000)
    } finally { setSaving(null) }
  }

  async function updateAllPricesFromSupplierRate() {
    const nextRate = Number(supplierRateInput)
    setSupplierRateMessage('')
    setSupplierRateError('')
    if (!Number.isFinite(nextRate) || nextRate <= 0) {
      setSupplierRateError('Enter a valid supplier rate')
      return
    }

    setSavingSupplierRate(true)
    try {
      const response = await fetch('/api/admin/supplier-rate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_rate: nextRate }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSupplierRateError(data.error ?? 'Could not update product prices')
        return
      }

      if (Array.isArray(data.products)) setProducts(data.products)
      setSupplierRate(nextRate)
      setSupplierRateInput(String(nextRate))
      setSupplierRateMessage(
        Math.abs(nextRate - supplierRate) < 0.001
          ? 'Prices are already set for this supplier rate.'
          : `All product prices updated for ₹${nextRate}/kg.`,
      )
    } catch {
      setSupplierRateError('Network error. Prices were not changed.')
    } finally {
      setSavingSupplierRate(false)
    }
  }

  async function addProduct(p: Omit<Product, 'category' | 'image_url'> & { image_url: string | null }) {
    setSaving('new')
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      })
      if (!res.ok) { alert('Error: ' + (await res.json()).error); return }
      const created: Product = await res.json()
      setProducts(prev => [...prev, created])
      setAddOpen(false)
    } finally { setSaving(null) }
  }

  async function deleteProduct(id: string) {
    setSaving(id + '-del')
    try {
      await fetch(`/api/inventory?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setProducts(prev => prev.filter(p => p.id !== id))
      setDeleteId(null)
    } finally { setSaving(null) }
  }

  if (checking) return null
  if (!authed) return (
    <div style={S.loginWrap}>
      <div style={S.loginBox}>
        <h1 style={S.loginTitle}>Admin Sign In</h1>
        <form onSubmit={login} style={S.form}>
          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} style={S.input} autoFocus />
          {loginErr && <p style={S.err}>{loginErr}</p>}
          <button type="submit" style={S.loginBtn} disabled={logging}>
            {logging ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )

  const outOfStock = products.filter(p => p.stock_quantity === 0)
  const lowStock   = products.filter(p => p.stock_quantity > 0 && p.stock_quantity < threshold)

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Inventory</h1>
          <p style={S.subtitle}>
            {loading
              ? '⏳ Loading…'
              : `${products.length} products · ${outOfStock.length} out of stock · ${lowStock.length} low stock`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#6b5744' }}>
            <span>Low stock alert below:</span>
            <input
              type="number" min={1} value={threshold}
              onChange={e => handleThresholdChange(Number(e.target.value))}
              style={{ ...S.numInput, width: 64, fontSize: '0.875rem', padding: '0.3rem 0.5rem' }}
            />
            <span>pcs</span>
          </div>
          <span style={{ color: '#d1d5db' }}>|</span>
          <button onClick={load} style={S.refreshBtn}>↻ Refresh</button>
          <button onClick={() => setAddOpen(true)} style={S.addBtn}>+ Add Product</button>
        </div>
      </div>

      <section style={S.supplierCard}>
        <div>
          <p style={S.supplierEyebrow}>Today&apos;s Supplier Rate</p>
          <h2 style={S.supplierTitle}>Update every product price</h2>
          <p style={S.supplierText}>
            Current rate: <strong>₹{supplierRate}/kg</strong>. Product prices change proportionally; discounts and stock stay unchanged.
          </p>
        </div>
        <div style={S.supplierAction}>
          <label style={S.supplierLabel}>
            Rate per kg
            <span style={S.supplierInputWrap}>
              <span style={S.supplierCurrency}>₹</span>
              <input
                type="number"
                min={1}
                max={10000}
                step="0.01"
                value={supplierRateInput}
                onChange={event => setSupplierRateInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') updateAllPricesFromSupplierRate()
                }}
                style={S.supplierInput}
              />
            </span>
          </label>
          <button
            type="button"
            onClick={updateAllPricesFromSupplierRate}
            disabled={savingSupplierRate}
            style={{
              ...S.supplierButton,
              opacity: savingSupplierRate ? 0.65 : 1,
            }}
          >
            {savingSupplierRate ? 'Updating prices…' : 'Update All Prices'}
          </button>
        </div>
        {(supplierRateMessage || supplierRateError) && (
          <p style={{
            ...S.supplierMessage,
            color: supplierRateError ? '#b91c1c' : '#166534',
          }}>
            {supplierRateError || supplierRateMessage}
          </p>
        )}
      </section>

      {/* Out of stock banner */}
      {outOfStock.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '0.75rem 1.25rem', color: '#991b1b', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          🚫 Out of stock: {outOfStock.map(p => p.name).join(', ')}
        </div>
      )}

      {/* Low stock banner */}
      {lowStock.length > 0 && (
        <div style={{ background: '#fff8ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '0.75rem 1.25rem', color: '#92400e', fontWeight: 500, fontSize: '0.875rem', marginBottom: '1rem' }}>
          ⚠️ {lowStock.length} item(s) running low on stock: {lowStock.map(p => p.name).join(', ')}
        </div>
      )}

      {/* Display order arranger */}
      {products.length > 1 && (
        <div style={S.orderCard}>
          <button onClick={() => setOrderOpen(o => !o)} style={S.orderToggle}>
            <span>↕️ Arrange display order on order page</span>
            <span style={{ color: '#9ca3af' }}>{orderOpen ? '▲' : '▼'}</span>
          </button>
          {orderOpen && (
            <div style={{ padding: '0.25rem 1rem 1rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#6b5744', margin: '0 0 0.75rem' }}>
                The top product is shown <strong>first (the big hero card)</strong>. Use ▲ ▼ to rearrange, then Save.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {order.map((id, i) => {
                  const p = products.find(pr => pr.id === id)
                  if (!p) return null
                  const img = p.image_url || FALLBACK_IMAGES[p.id] || null
                  return (
                    <div key={id} style={S.orderRow}>
                      <span style={S.orderNum}>{i === 0 ? '★' : i + 1}</span>
                      {img
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={img} alt={p.name} style={S.orderThumb} />
                        : <div style={{ ...S.orderThumb, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7' }}>🍗</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#1a1109', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                        {i === 0 && <p style={{ margin: 0, fontSize: '0.7rem', color: '#d97706', fontWeight: 700 }}>Shown first (hero)</p>}
                      </div>
                      <button onClick={() => moveOrder(i, -1)} disabled={i === 0} style={{ ...S.moveBtn, opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                      <button onClick={() => moveOrder(i, 1)} disabled={i === order.length - 1} style={{ ...S.moveBtn, opacity: i === order.length - 1 ? 0.3 : 1 }}>▼</button>
                    </div>
                  )
                })}
              </div>
              <button onClick={saveOrder} disabled={savingOrder} style={{ ...S.saveBtn, marginTop: '0.875rem', ...(orderSaved ? S.saveBtnOk : {}) }}>
                {savingOrder ? 'Saving…' : orderSaved ? '✓ Order saved' : 'Save display order'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div style={S.grid}>
        {products.map(p => (
          <ProductCard
            key={p.id}
            product={p}
            saving={saving === p.id}
            saved={saved === p.id}
            deleting={saving === p.id + '-del'}
            onSave={patch => saveProduct(p.id, patch)}
            onDelete={() => setDeleteId(p.id)}
            threshold={threshold}
            unit={units[p.id] ?? 'g'}
            onUnitChange={u => saveUnit(p.id, u)}
          />
        ))}
      </div>

      {!loading && products.length === 0 && (
        <div style={S.hint}>⚠️ No products found. Run the SQL schema in Supabase first.</div>
      )}

      {/* Add Product Modal */}
      {addOpen && (
        <AddProductModal
          onClose={() => setAddOpen(false)}
          onAdd={addProduct}
          saving={saving === 'new'}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={S.overlay} onClick={() => setDeleteId(null)}>
          <div style={S.confirmBox} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 700, color: '#1a1109', margin: '0 0 8px' }}>Delete product?</p>
            <p style={{ fontSize: '0.875rem', color: '#6b5744', margin: '0 0 1.5rem' }}>
              This will remove <strong>{deleteId}</strong> permanently.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteId(null)} style={S.cancelBtn}>Cancel</button>
              <button onClick={() => deleteProduct(deleteId!)} style={S.deleteBtn}>
                {saving === deleteId + '-del' ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Product Card ──────────────────────────────────────────── */
function ProductCard({ product, saving, saved, deleting, onSave, onDelete, threshold, unit, onUnitChange }: {
  product: Product; saving: boolean; saved: boolean; deleting: boolean
  onSave: (patch: Partial<Product>) => void
  onDelete: () => void
  threshold: number
  unit: string
  onUnitChange: (u: string) => void
}) {
  const [price,      setPrice]      = useState(product.price_per_kg)
  const [stock,      setStock]      = useState(product.stock_quantity)
  const [discount,   setDiscount]   = useState(product.discount_percentage ?? 0)
  const [weightGrams, setWeightGrams] = useState<number | ''>(product.weight_per_unit ?? '')
  const [name,       setName]       = useState(product.name)
  const [imageUrl,   setImageUrl]   = useState(product.image_url ?? '')
  const [editOpen,   setEditOpen]   = useState(false)

  useEffect(() => {
    setPrice(product.price_per_kg)
    setStock(product.stock_quantity)
    setDiscount(product.discount_percentage ?? 0)
    setWeightGrams(product.weight_per_unit ?? '')
    setName(product.name); setImageUrl(product.image_url ?? '')
  }, [product])

  const displayImg = product.image_url || FALLBACK_IMAGES[product.id] || null
  const stockColor = stock === 0 ? '#dc2626' : stock <= 5 ? '#f59e0b' : '#16a34a'
  const borderLeft = stock === 0 ? '4px solid #dc2626' : (stock > 0 && stock < threshold) ? '4px solid #f59e0b' : undefined

  function handleSave() {
    onSave({
      price_per_kg:        price,
      stock_quantity:      stock,
      discount_percentage: discount,
      weight_per_unit:     weightGrams === '' ? null : weightGrams,
    })
  }

  function handleSaveDetails() {
    onSave({
      name:      name.trim() || product.name,
      image_url: imageUrl.trim() || null,
    })
    setEditOpen(false)
  }

  return (
    <div style={{ ...S.card, ...(borderLeft ? { borderLeft } : {}) }}>
      {/* Image preview */}
      <div style={S.imgWrap}>
        {displayImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayImg} alt={product.name} style={S.img} />
        ) : (
          <div style={S.imgFallback}>🍗</div>
        )}
        {!product.image_url && (
          <span style={S.imgBadge}>fallback</span>
        )}
      </div>

      {/* Name + ID row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={S.cardName}>{product.name}</p>
          <p style={S.cardId}>{product.id}</p>
        </div>
        <div style={{ ...S.stockBadge, background: stockColor + '18', color: stockColor, borderColor: stockColor + '30' }}>
          {stock === 0 ? 'Out' : stock <= 5 ? 'Low' : 'In stock'}
        </div>
      </div>

      {/* Price + Discount */}
      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Price / pc</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#6b5744', fontWeight: 600 }}>₹</span>
            <input type="number" min={0} step={1} value={price}
              onChange={e => setPrice(Number(e.target.value))} style={S.numInput} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Discount %</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="number" min={0} max={100} step={1} value={discount}
              onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
              style={{ ...S.numInput, borderColor: discount > 0 ? '#16a34a' : undefined }} />
            <span style={{ color: '#6b5744', fontWeight: 600, flexShrink: 0 }}>%</span>
          </div>
          {discount > 0 && (
            <p style={{ fontSize: '0.7rem', color: '#16a34a', margin: '3px 0 0', fontWeight: 600 }}>
              Sale: ₹{Math.round(price * (1 - discount / 100))}
            </p>
          )}
        </div>
      </div>

      {/* Weight per unit + Quantity */}
      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Pack size · unit</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number" min={0} step={unit === 'kg' ? 0.1 : 1}
              value={weightGrams}
              placeholder={unit === 'pc' ? 'e.g. 6' : unit === 'kg' ? 'e.g. 1' : 'e.g. 500'}
              onChange={e => setWeightGrams(e.target.value === '' ? '' : Number(e.target.value))}
              style={{ ...S.numInput, borderColor: '#9318cc' }}
            />
            <select
              value={unit}
              onChange={e => onUnitChange(e.target.value)}
              style={{ ...S.numInput, width: 'auto', borderColor: '#9318cc', cursor: 'pointer', padding: '0.5rem 0.4rem' }}
            >
              <option value="pc">pc</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#9318cc', margin: '3px 0 0', fontWeight: 600 }}>
            Shows as: {weightGrams === '' ? '—' : unit === 'pc' ? `${weightGrams} pc${Number(weightGrams) > 1 ? 's' : ''}` : unit === 'kg' ? `${weightGrams} kg` : `${weightGrams}g`}
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Qty in Stock (pcs)</label>
          <input type="number" min={0} step={1} value={stock}
            onChange={e => setStock(Number(e.target.value))}
            style={{ ...S.numInput, borderColor: stockColor }} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ ...S.saveBtn, ...(saved ? S.saveBtnOk : {}) }}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
      </button>

      {/* Edit Details toggle */}
      <button onClick={() => setEditOpen(o => !o)} style={S.editToggleBtn}>
        {editOpen ? '▲ Hide details' : '✏️ Edit name & image'}
      </button>

      {editOpen && (
        <div style={S.editSection}>
          <div>
            <label style={S.label}>Product Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={product.name} style={S.textInput} />
          </div>
          <div>
            <label style={S.label}>Image URL <span style={{ fontWeight: 400, color: '#9ca3af' }}>(leave blank to use fallback)</span></label>
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..." style={S.textInput} />
            {imageUrl && (
              <div style={{ marginTop: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="preview"
                  style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSaveDetails} disabled={saving}
              style={{ ...S.saveBtn, flex: 1 }}>
              {saving ? 'Saving…' : 'Save name & image'}
            </button>
            <button onClick={() => { onDelete() }} disabled={deleting}
              style={S.delBtn}>
              {deleting ? '…' : '🗑'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Add Product Modal ─────────────────────────────────────── */
function AddProductModal({ onClose, onAdd, saving }: {
  onClose: () => void
  onAdd: (p: { id: string; name: string; price_per_kg: number; stock_quantity: number; discount_percentage: number; weight_per_unit: number | null; image_url: string | null }) => void
  saving: boolean
}) {
  const [id,          setId]          = useState('')
  const [name,        setName]        = useState('')
  const [price,       setPrice]       = useState(0)
  const [stock,       setStock]       = useState(50)
  const [discount,    setDiscount]    = useState(0)
  const [weightGrams, setWeightGrams] = useState<number | ''>('')
  const [imageUrl,    setImageUrl]    = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id.trim() || !name.trim()) return
    onAdd({
      id:                  id.trim().toLowerCase().replace(/\s+/g, '-'),
      name:                name.trim(),
      price_per_kg:        price,
      stock_quantity:      stock,
      discount_percentage: discount,
      weight_per_unit:     weightGrams === '' ? null : weightGrams,
      image_url:           imageUrl.trim() || null,
    })
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.confirmBox, width: 480, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
        <p style={{ fontWeight: 700, color: '#1a1109', fontSize: '1.125rem', margin: '0 0 1.25rem' }}>
          Add New Product
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={S.formRow}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>ID (slug) *</label>
              <input type="text" value={id} onChange={e => setId(e.target.value)}
                placeholder="e.g. whole-chicken" style={S.textInput} required />
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 3 }}>Lowercase, no spaces</p>
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Whole Chicken" style={S.textInput} required />
            </div>
          </div>
          <div style={S.formRow}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Price / pc (₹)</label>
              <input type="number" min={0} value={price}
                onChange={e => setPrice(Number(e.target.value))} style={S.numInput} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Discount %</label>
              <input type="number" min={0} max={100} value={discount}
                onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))} style={S.numInput} />
            </div>
          </div>
          <div style={S.formRow}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Weight / unit (g)</label>
              <input type="number" min={1} value={weightGrams}
                placeholder="e.g. 500"
                onChange={e => setWeightGrams(e.target.value === '' ? '' : Number(e.target.value))} style={S.numInput} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Qty in Stock (pcs)</label>
              <input type="number" min={0} value={stock}
                onChange={e => setStock(Number(e.target.value))} style={S.numInput} />
            </div>
          </div>
          <div>
            <label style={S.label}>Image URL <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..." style={{ ...S.textInput, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={S.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving || !id.trim() || !name.trim()} style={S.addBtn}>
              {saving ? 'Adding…' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Styles ─────────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  loginWrap:    { minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loginBox:     { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '2.5rem 2rem', width: 340, textAlign: 'center' },
  loginTitle:   { fontWeight: 700, color: '#1a1109', marginBottom: '1.5rem' },
  form:         { display: 'flex', flexDirection: 'column', gap: 12 },
  input:        { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.9375rem', outline: 'none' },
  err:          { color: '#dc2626', fontSize: '0.8125rem', margin: 0 },
  loginBtn:     { background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' },

  wrap:         { padding: 'clamp(1rem, 4vw, 2rem) clamp(0.75rem, 4vw, 2.5rem)' },
  header:       { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 },
  title:        { fontSize: 'clamp(1.125rem, 4vw, 1.5rem)', fontWeight: 700, color: '#1a1109', margin: 0 },
  subtitle:     { fontSize: '0.8125rem', color: '#6b5744', marginTop: 4 },
  refreshBtn:   { background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#6b5744' },
  addBtn:       { background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.875rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem' },
  hint:         { background: '#fff8ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '1.25rem', color: '#92400e', fontWeight: 500 },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },

  supplierCard: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'end', gap: '1rem 1.5rem', background: '#fff8ed', border: '1.5px solid #f59e0b', borderRadius: 12, padding: '1rem 1.125rem', marginBottom: '1rem' },
  supplierEyebrow: { margin: '0 0 4px', color: '#b45309', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' },
  supplierTitle: { margin: 0, color: '#1a1109', fontSize: '1rem', fontWeight: 800 },
  supplierText: { margin: '5px 0 0', color: '#6b5744', fontSize: '0.8125rem', lineHeight: 1.45 },
  supplierAction: { display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  supplierLabel: { display: 'flex', flex: '1 1 150px', flexDirection: 'column', gap: 4, color: '#6b5744', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  supplierInputWrap: { display: 'flex', alignItems: 'center', minHeight: 44, background: '#fff', border: '1.5px solid #d97706', borderRadius: 8, overflow: 'hidden' },
  supplierCurrency: { paddingLeft: 12, color: '#92400e', fontSize: '1rem', fontWeight: 800 },
  supplierInput: { width: '100%', minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: '0.65rem 0.75rem 0.65rem 0.4rem', color: '#1a1109', fontSize: '1rem', fontWeight: 800 },
  supplierButton: { flex: '1 1 170px', minHeight: 44, border: 'none', borderRadius: 8, background: '#1a1109', color: '#fff', padding: '0.65rem 1rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 800, whiteSpace: 'nowrap' },
  supplierMessage: { gridColumn: '1 / -1', margin: 0, fontSize: '0.8125rem', fontWeight: 700 },

  orderCard:    { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: '1rem', overflow: 'hidden' },
  orderToggle:  { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', padding: '0.875rem 1rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, color: '#1a1109' },
  orderRow:     { display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.625rem', border: '1px solid #f3f4f6', borderRadius: 10, background: '#fafafa' },
  orderNum:     { width: 22, textAlign: 'center', fontSize: '0.8125rem', fontWeight: 800, color: '#d97706', flexShrink: 0 },
  orderThumb:   { width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb' },
  moveBtn:      { width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', color: '#374151', flexShrink: 0 },

  card:         { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', overflow: 'hidden' },
  imgWrap:      { position: 'relative', width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6' },
  img:          { width: '100%', height: '100%', objectFit: 'cover' },
  imgFallback:  { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', background: '#fef3c7' },
  imgBadge:     { position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  cardName:     { fontWeight: 700, color: '#1a1109', margin: 0, fontSize: '1rem' },
  cardId:       { color: '#9ca3af', fontSize: '0.75rem', margin: '2px 0 0', fontFamily: 'monospace' },
  stockBadge:   { border: '1px solid', borderRadius: 6, padding: '3px 8px', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 },
  row:          { display: 'flex', gap: 12 },
  label:        { fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block', marginBottom: 4 },
  numInput:     { width: '100%', border: '1.5px solid #d97706', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '1rem', fontWeight: 600, color: '#1a1109', outline: 'none', boxSizing: 'border-box' as const },
  textInput:    { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.875rem', outline: 'none', color: '#1a1109', fontFamily: 'system-ui', boxSizing: 'border-box' as const },
  saveBtn:      { width: '100%', background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  saveBtnOk:    { background: '#16a34a' },
  editToggleBtn:{ background: 'transparent', border: '1px dashed #e5e7eb', borderRadius: 8, padding: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#6b5744', fontWeight: 500 },
  editSection:  { borderTop: '1px solid #f3f4f6', paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  delBtn:       { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' },

  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  confirmBox:   { background: '#fff', borderRadius: 16, padding: '1.75rem', width: 340, boxShadow: '0 20px 60px -10px rgba(0,0,0,0.25)' },
  formRow:      { display: 'flex', gap: 12 },
  cancelBtn:    { background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: '#6b5744' },
  deleteBtn:    { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' },
}
