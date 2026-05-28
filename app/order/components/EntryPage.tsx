'use client'

import { useEffect, useState } from 'react'

const SEEN_KEY = 'bf-entry-seen'

interface Props {
  onContinue: () => void
}

const promises = [
  {
    icon: '🤝',
    heading: 'Fresh is not a marketing tactic.',
    body: 'It is a promise.',
  },
  {
    icon: '⏱️',
    heading: 'We only start the process',
    body: 'once your order is placed.',
  },
  {
    icon: '🚫',
    heading: 'We never sell stored meat.',
    body: 'Fresh, directly to your kitchen.',
  },
]

export default function EntryPage({ onContinue }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Skip if already seen
    if (localStorage.getItem(SEEN_KEY)) {
      onContinue()
      return
    }
    // Fade in
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [onContinue])

  function handleContinue() {
    localStorage.setItem(SEEN_KEY, '1')
    onContinue()
  }

  return (
    <div
      className="flex-1 flex flex-col"
      style={{
        background: 'linear-gradient(160deg, #0D0601 0%, #1C0A02 60%, #2A1005 100%)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Top brand mark */}
      <div className="flex items-center gap-2.5 px-6 pt-2 pb-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 0 14px rgba(251,191,36,0.4)' }}
        >
          🐔
        </div>
        <span
          className="font-black text-xs tracking-widest"
          style={{ color: '#F59E0B', letterSpacing: '0.14em' }}
        >
          B&apos;LURU FRESH
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-6 gap-5">
        <p
          className="text-xs font-bold tracking-widest uppercase mb-1"
          style={{ color: '#6B5744', letterSpacing: '0.18em' }}
        >
          Our Promise to You
        </p>

        {promises.map((p, i) => (
          <div
            key={i}
            className="flex items-start gap-4"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: `opacity 0.5s ease ${0.15 + i * 0.12}s, transform 0.5s ease ${0.15 + i * 0.12}s`,
            }}
          >
            {/* Icon bubble */}
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 mt-0.5"
              style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              {p.icon}
            </div>

            {/* Text */}
            <div className="flex-1">
              <p className="font-bold text-base leading-snug" style={{ color: '#FEF3C7' }}>
                {p.heading}
              </p>
              <p className="text-sm mt-0.5 leading-snug" style={{ color: '#A87D5A' }}>
                {p.body}
              </p>
            </div>
          </div>
        ))}

        {/* Divider */}
        <div
          className="h-px w-full mt-1"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.25), transparent)' }}
        />

        <p
          className="text-base font-semibold text-center italic"
          style={{ color: '#D97706' }}
        >
          Because we care.
        </p>
      </div>

      {/* CTA */}
      <div
        className="px-6"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease 0.55s, transform 0.5s ease 0.55s',
        }}
      >
        <button
          onClick={handleContinue}
          className="w-full py-4 rounded-2xl font-bold text-base text-white active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 55%, #B45309 100%)',
            boxShadow: '0 6px 28px rgba(217,119,6,0.45)',
          }}
        >
          Order Fresh Chicken →
        </button>
      </div>
    </div>
  )
}
