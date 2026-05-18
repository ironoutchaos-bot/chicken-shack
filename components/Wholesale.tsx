import Link from 'next/link'
import Image from 'next/image'
import Reveal from './Reveal'

const processSteps = [
  'You place the order',
  'We process fresh chicken',
  'Hygienic packing',
  'Delivered fresh to you',
]

export default function Wholesale() {
  return (
    <section className="catering-section" id="catering" aria-labelledby="catering-heading">
      <div className="container">
        <div className="catering-grid">
          {/* Copy */}
          <Reveal className="catering-copy" delay={0}>
            <div className="eyebrow-tag">How It Works</div>
            <h2 className="section-h2" id="catering-heading">
              From cut to kitchen<br />in hours.
            </h2>
            <p className="body-text">
              From cut to kitchen in hours&mdash;not days.
            </p>
            <ol className="process-steps">
              {processSteps.map((step, index) => (
                <li key={step}>
                  <span className="process-step-num">{String(index + 1).padStart(2, '0')}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <Link href="/order" className="btn-primary btn-lg" id="catering-contact-btn">
              <span>Order Now</span>
              <span className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
                </svg>
              </span>
            </Link>
          </Reveal>

          {/* Image */}
          <Reveal className="catering-image" delay={1}>
            <div className="catering-img-shell">
              <div className="catering-img-core" style={{ position: 'relative', overflow: 'hidden' }}>
                <Image
                  src="/assets/packaged_chicken.jpg"
                  alt="B'LURU Fresh vacuum-sealed chicken packaging"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
            <div className="catering-stat-bubble" aria-label="Freshness promise">
              <span className="bubble-num">Same-day</span>
              <span className="bubble-label">Cut, packed and delivered fresh</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
