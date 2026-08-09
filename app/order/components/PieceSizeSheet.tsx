'use client'

import { Check, Scissors, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PieceSize } from '@/lib/piece-size'

type Props = { open: boolean; productName: string; options: PieceSize[]; onClose: () => void; onConfirm: (size: PieceSize) => void }

export default function PieceSizeSheet({ open, productName, options, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<PieceSize>('Medium')
  useEffect(() => { if (open) setSelected(options.includes('Medium') ? 'Medium' : options[0] ?? 'Medium') }, [open, productName])
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])
  if (!open) return null

  return (
    <div className="piece-size-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="piece-size-sheet" role="dialog" aria-modal="true" aria-labelledby="piece-size-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="piece-size-handle" />
        <div className="piece-size-heading">
          <span className="piece-size-icon"><Scissors size={20} strokeWidth={2.4} /></span>
          <div><p className="piece-size-kicker">CUT PREFERENCE</p><h2 id="piece-size-title">How should we cut it?</h2></div>
          <button type="button" className="piece-size-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <p className="piece-size-product">{productName}</p>
        <div className="piece-size-options" role="radiogroup" aria-label="Piece size">
          {options.map((option) => (
            <button type="button" key={option} role="radio" aria-checked={selected === option} className={`piece-size-option${selected === option ? ' selected' : ''}`} onClick={() => setSelected(option)}>
              <span>{option} pieces</span><span className="piece-size-check">{selected === option && <Check size={16} strokeWidth={3} />}</span>
            </button>
          ))}
        </div>
        <button type="button" className="piece-size-confirm" onClick={() => onConfirm(selected)}>Add to Cart</button>
        <style jsx global>{`
          .piece-size-backdrop{position:fixed;inset:0;z-index:2147483646;background:rgba(20,10,7,.58);display:flex;align-items:flex-end;justify-content:center}
          .piece-size-sheet{width:100%;max-width:480px;background:#fff;border-radius:22px 22px 0 0;padding:10px 20px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -18px 60px rgba(20,10,7,.24)}
          .piece-size-handle{width:42px;height:4px;border-radius:99px;background:#d8d1ca;margin:0 auto 18px}.piece-size-heading{display:grid;grid-template-columns:44px 1fr 38px;gap:12px;align-items:center}
          .piece-size-icon{width:44px;height:44px;border-radius:12px;background:#f2ffe5;color:#4c0381;display:grid;place-items:center}.piece-size-kicker{margin:0 0 3px;color:#60079d;font-size:10px;font-weight:800;letter-spacing:.12em}
          h2{margin:0;color:#1f110b;font-size:21px;line-height:1.15;font-weight:800;letter-spacing:0}.piece-size-close{width:38px;height:38px;border:1px solid #e7dfd9;border-radius:50%;background:#fff;color:#1f110b;display:grid;place-items:center;cursor:pointer}
          .piece-size-product{margin:16px 0 12px;color:#6b554b;font-size:13px;line-height:1.4}.piece-size-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
          .piece-size-option{height:58px;padding:0 14px;border:1.5px solid #dcd4ce;border-radius:10px;background:#fff;color:#1f110b;font-size:15px;font-weight:750;display:flex;align-items:center;justify-content:space-between;cursor:pointer}.piece-size-option.selected{border-color:#60079d;background:#faf5ff;color:#4c0381}
          .piece-size-check{width:23px;height:23px;border:1.5px solid #cfc5be;border-radius:50%;display:grid;place-items:center}.piece-size-option.selected .piece-size-check{background:#8eea2f;border-color:#8eea2f;color:#1f110b}
          .piece-size-confirm{width:100%;height:54px;margin-top:14px;border:0;border-radius:10px;background:#4c0381;color:#fff;font-size:15px;font-weight:800;cursor:pointer}
          @media(min-width:700px){.piece-size-backdrop{align-items:center;padding:24px}.piece-size-sheet{border-radius:18px;padding:12px 24px 24px}.piece-size-handle{display:none}}
        `}</style>
      </section>
    </div>
  )
}
