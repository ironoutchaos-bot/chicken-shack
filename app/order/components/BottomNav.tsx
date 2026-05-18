'use client'

import { ShoppingBag, ClipboardList, ReceiptText } from 'lucide-react'
import type { Tab } from '../OrderApp'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  activeOrderCount: number
}

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'shop',    label: 'Shop',    Icon: ShoppingBag   },
  { id: 'active',  label: 'Orders',  Icon: ClipboardList },
  { id: 'history', label: 'History', Icon: ReceiptText   },
]

export default function BottomNav({ activeTab, onTabChange, activeOrderCount }: Props) {
  const activeIndex = TABS.findIndex(t => t.id === activeTab)

  return (
    <div
      className="shrink-0 px-4 pt-1.5"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.625rem)' }}
    >
      <nav
        className="relative flex items-stretch h-[60px] rounded-[26px] p-1.5"
        style={{
          background: 'rgba(9, 7, 4, 0.96)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow:
            '0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Sliding amber pill */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 6,
            bottom: 6,
            left: `calc(${activeIndex} * (100% / 3) + 6px)`,
            width: 'calc(100% / 3 - 12px)',
            borderRadius: 18,
            background: 'linear-gradient(150deg, #FBBF24 0%, #D97706 100%)',
            boxShadow: '0 2px 18px rgba(251,191,36,0.55), 0 0 36px rgba(251,191,36,0.18)',
            transition: 'left 360ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />

        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="relative z-10 flex-1 flex flex-col items-center justify-center gap-[4px] rounded-[18px] active:scale-[0.86] transition-transform duration-100"
            >
              {/* Icon with badge */}
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.6 : 1.6}
                  className={`transition-all duration-200 ${
                    active ? 'text-stone-900' : 'text-stone-500'
                  }`}
                />
                {id === 'active' && activeOrderCount > 0 && (
                  <span
                    className={`absolute -top-[5px] -right-[9px] min-w-[15px] h-[15px] px-[3px] rounded-full flex items-center justify-center text-[8px] font-black leading-none tabular-nums transition-colors duration-200 ${
                      active
                        ? 'bg-stone-900 text-amber-400'
                        : 'bg-amber-500 text-stone-950'
                    }`}
                  >
                    {activeOrderCount > 9 ? '9+' : activeOrderCount}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[9.5px] font-bold tracking-wide leading-none transition-colors duration-200 ${
                  active ? 'text-stone-900' : 'text-stone-600'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
