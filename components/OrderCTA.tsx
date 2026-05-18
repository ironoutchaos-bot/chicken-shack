import Link from 'next/link'
import Reveal from './Reveal'

export default function OrderCTA() {
  return (
    <section className="order-cta-section" id="order" aria-labelledby="order-heading">
      <div className="order-cta-inner">
        <Reveal>
          <div className="eyebrow-tag eyebrow-tag--light">Freshness You Can Trust</div>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="order-cta-h2" id="order-heading">
            Ready to experience<br /><em>real freshness?</em>
          </h2>
        </Reveal>
        <Reveal delay={2}>
          <p className="order-cta-sub">
            We do not believe in overpromising. We believe in delivering clean, fresh chicken consistently. Order now and taste the difference.
          </p>
        </Reveal>
        <Reveal className="order-cta-actions" delay={3}>
          <Link href="/order" className="btn-primary btn-xl" id="order-pickup-btn">
            <span>Order Now</span>
            <span className="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
              </svg>
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
