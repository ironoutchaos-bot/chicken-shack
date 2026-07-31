'use client'

import { useEffect, useState } from 'react'

interface Props {
  onContinue: () => void
}

const promises = [
  { icon: '🤝', heading: 'Fresh is not a marketing tactic.', body: 'It is a promise.' },
  { icon: '⏱️', heading: 'We only start the process',        body: 'once your order is placed.' },
  { icon: '🚫', heading: 'We never sell stored meat.',        body: 'Fresh, directly to your kitchen.' },
]

export default function EntryPage({ onContinue }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="flex-1 flex flex-col"
      style={{
        background: '#16140f',
        paddingTop:    'calc(env(safe-area-inset-top, 0px) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
        opacity:    visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        fontFamily: "'DM Mono', monospace",
      }}
    >
      {/* Brand mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px 0' }}>
        {/* "B" letter mark */}
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'rgba(147,24,204,.12)',
          border: '1.5px solid rgba(147,24,204,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 5px 14px rgba(31,17,11,.1)',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 16, color: '#9318cc', lineHeight: 1 }}>B</span>
        </div>
        <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 900, fontSize: 11, color: '#91d852', letterSpacing: '0.1em' }}>
          B&apos;LURU FRESH
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-6 gap-5">

        {/* Kicker */}
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,.25)', marginBottom: 4 }}>
          Our Promise to You
        </p>

        {promises.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              opacity:   visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: `opacity 0.5s ease ${0.15 + i * 0.13}s, transform 0.5s ease ${0.15 + i * 0.13}s`,
            }}
          >
            {/* Icon */}
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              flexShrink: 0, marginTop: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
              background: i === 0 ? 'rgba(145,216,82,.1)'  :
                          i === 1 ? 'rgba(147,24,204,.1)'   : 'rgba(196,78,245,.1)',
              border:     i === 0 ? '1px solid rgba(145,216,82,.2)' :
                          i === 1 ? '1px solid rgba(147,24,204,.2)' : '1px solid rgba(196,78,245,.2)',
            }}>{p.icon}</div>

            {/* Text */}
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: '#fff', lineHeight: 1.25, marginBottom: 3 }}>
                {p.heading}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', lineHeight: 1.5 }}>
                {p.body}
              </p>
            </div>
          </div>
        ))}

        {/* Divider */}
        <div style={{ height: 1, width: '100%', background: 'linear-gradient(90deg, transparent, rgba(145,216,82,.2), rgba(147,24,204,.2), transparent)', marginTop: 4 }} />

        {/* Tagline */}
        <p style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
          fontSize: 17, textAlign: 'center',
          color: '#91d852',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.5s ease 0.55s',
        }}>
          Because we care. ❤️
        </p>
      </div>

      {/* CTA */}
      <div
        className="px-6"
        style={{
          opacity:   visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease 0.6s, transform 0.5s ease 0.6s',
        }}
      >
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg, #9318cc 0%, #7b14ab 55%, #5b0e80 100%)',
            color: '#fff',
            boxShadow: '0 7px 18px rgba(31,17,11,.16)',
            fontFamily: "'Unbounded', sans-serif",
            fontSize: 12, letterSpacing: '0.04em',
          }}
        >
          Order Fresh Chicken →
        </button>
      </div>
    </div>
  )
}
