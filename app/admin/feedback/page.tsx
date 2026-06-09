'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/admin/_hooks/useAdminAuth'
import { AdminChecking, AdminLoginForm } from '@/app/admin/_hooks/AdminGate'

type FeedbackRow = {
  id: string
  customer_name: string | null
  customer_phone: string | null
  total_amount: number
  feedback_rating: number
  feedback_comment: string | null
  feedback_at: string
  created_at: string
}

function Stars({ value }: { value: number }) {
  return (
    <span style={{ fontSize: '1rem', letterSpacing: 1 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ opacity: n <= value ? 1 : 0.2 }}>⭐</span>
      ))}
    </span>
  )
}

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function avgRating(rows: FeedbackRow[]) {
  if (!rows.length) return 0
  return rows.reduce((s, r) => s + r.feedback_rating, 0) / rows.length
}

export default function AdminFeedbackPage() {
  const { authed, checking, login } = useAdminAuth()
  const [loginErr,  setLoginErr]  = useState('')
  const [logging,   setLogging]   = useState(false)

  const [rows,    setRows]    = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState<number | null>(null) // filter by star rating

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/feedback')
      if (res.ok) setRows(await res.json())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { if (authed) load() }, [authed])

  async function handleLogin(pw: string) {
    setLogging(true); setLoginErr('')
    const err = await login(pw)
    if (err) setLoginErr(err)
    setLogging(false)
  }

  if (checking) return <AdminChecking />
  if (!authed)  return <AdminLoginForm onLogin={handleLogin} error={loginErr} loading={logging} />

  const displayed = filter ? rows.filter(r => r.feedback_rating === filter) : rows
  const avg       = avgRating(rows)

  const ratingCounts = [5,4,3,2,1].map(star => ({
    star,
    count: rows.filter(r => r.feedback_rating === star).length,
  }))

  return (
    <div style={{ padding: 'clamp(1rem,4vw,2rem) clamp(0.75rem,4vw,2.5rem)', maxWidth: 960, margin: '0 auto', fontFamily: 'system-ui' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.125rem,4vw,1.5rem)', fontWeight: 700, color: '#1a1109', margin: 0 }}>
            Customer Feedback
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#6b5744', marginTop: 4 }}>
            Ratings & comments from delivered orders
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#6b5744' }}
        >
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem 1.25rem', minWidth: 140, flex: '1 1 140px' }}>
            <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Rating</p>
            <p style={{ margin: '6px 0 0', fontSize: '1.375rem', fontWeight: 700, color: '#1a1109' }}>{avg.toFixed(1)} ⭐</p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem 1.25rem', minWidth: 140, flex: '1 1 140px' }}>
            <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Reviews</p>
            <p style={{ margin: '6px 0 0', fontSize: '1.375rem', fontWeight: 700, color: '#1a1109' }}>{rows.length}</p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem 1.25rem', flex: '1 1 200px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Breakdown</p>
            {ratingCounts.map(({ star, count }) => (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '0.75rem', width: 14, textAlign: 'right', color: '#374151' }}>{star}⭐</span>
                <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: rows.length ? `${(count / rows.length) * 100}%` : '0%', height: '100%', background: '#d97706', borderRadius: 99, transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', width: 24, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Star filter */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[null, 5, 4, 3, 2, 1].map(star => (
            <button
              key={star ?? 'all'}
              onClick={() => setFilter(star)}
              style={{
                border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.3rem 0.75rem',
                cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'system-ui',
                background: filter === star ? '#d97706' : '#fff',
                color:      filter === star ? '#fff'    : '#6b5744',
                borderColor: filter === star ? '#d97706' : '#e5e7eb',
              }}
            >
              {star === null ? 'All' : `${star} ⭐`}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && !rows.length && (
        <p style={{ color: '#9ca3af', padding: '3rem 0', textAlign: 'center' }}>Loading feedback…</p>
      )}

      {/* Empty */}
      {!loading && rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>⭐</p>
          <p style={{ fontWeight: 600, color: '#6b7280' }}>No feedback yet</p>
          <p style={{ fontSize: '0.875rem', marginTop: 4 }}>Customers will be asked to rate their order 1 hour after delivery.</p>
        </div>
      )}

      {/* Feedback list */}
      {displayed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(row => {
            const orderDate    = new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            const feedbackDate = new Date(row.feedback_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            return (
              <div key={row.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1a1109' }}>
                        {row.customer_name || 'Customer'}
                      </span>
                      {row.customer_phone && (
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.customer_phone}</span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                      Order #{row.id.slice(0, 8).toUpperCase()} · {fmt(row.total_amount)} · {orderDate}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Stars value={row.feedback_rating} />
                    <p style={{ margin: '2px 0 0', fontSize: '0.6875rem', color: '#9ca3af' }}>{feedbackDate}</p>
                  </div>
                </div>
                {row.feedback_comment && (
                  <p style={{ margin: '10px 0 0', fontSize: '0.875rem', color: '#374151', fontStyle: 'italic', lineHeight: 1.5, borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
                    "{row.feedback_comment}"
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
