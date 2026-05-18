'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'

type Product = {
  id: string; name: string; price_per_kg: number
  stock_quantity: number; category: string; image_url: string | null
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

  async function load() {
    setLoading(true)
    try {
      const data: Product[] = await fetch('/api/inventory').then(r => r.json())
      setProducts(Array.isArray(data) ? data : [])
    } catch {} finally { setLoading(false) }
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
      await fetch('/api/inventory', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
      setSaved(id); setTimeout(() => setSaved(null), 2000)
    } finally { setSaving(null) }
  }

  async function addProduct(p: Omit<Product, 'id' | 'category'> & { id: string }) {
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
function ProductCard({ product, saving, saved, deleting, onSave, onDelete, threshold }: {
  product: Product; saving: boolean; saved: boolean; deleting: boolean
  onSave: (patch: Partial<Product>) => void
  onDelete: () => void
  threshold: number
}) {
  const [price,    setPrice]    = useState(product.price_per_kg)
  const [stock,    setStock]    = useState(product.stock_quantity)
  const [name,     setName]     = useState(product.name)
  const [imageUrl, setImageUrl] = useState(product.image_url ?? '')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    setPrice(product.price_per_kg)
    setStock(product.stock_quantity)
    setName(product.name); setImageUrl(product.image_url ?? '')
  }, [product])

  const displayImg = product.image_url || FALLBACK_IMAGES[product.id] || null
  const stockColor = stock === 0 ? '#dc2626' : stock <= 5 ? '#f59e0b' : '#16a34a'
  const borderLeft = stock === 0 ? '4px solid #dc2626' : (stock > 0 && stock < threshold) ? '4px solid #f59e0b' : undefined

  function handleSave() {
    onSave({ price_per_kg: price, stock_quantity: stock })
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

      {/* Price + Stock */}
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
          <label style={S.label}>Stock (pcs)</label>
          <input type="number" min={0} step={1} value={stock}
            onChange={e => setStock(Number(e.target.value))}
            style={{ ...S.numInput, borderColor: stockColor }} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ ...S.saveBtn, ...(saved ? S.saveBtnOk : {}) }}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save price & stock'}
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
  onAdd: (p: { id: string; name: string; price_per_kg: number; stock_quantity: number; image_url: string | null }) => void
  saving: boolean
}) {
  const [id,       setId]       = useState('')
  const [name,     setName]     = useState('')
  const [price,    setPrice]    = useState(0)
  const [stock,    setStock]    = useState(50)
  const [imageUrl, setImageUrl] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id.trim() || !name.trim()) return
    onAdd({
      id:             id.trim().toLowerCase().replace(/\s+/g, '-'),
      name:           name.trim(),
      price_per_kg:   price,
      stock_quantity: stock,
      image_url:      imageUrl.trim() || null,
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
              <label style={S.label}>Stock (pcs)</label>
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
