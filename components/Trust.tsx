import Reveal from './Reveal'

const reasons = [
  {
    title: 'Same-Day Freshness',
    body: 'Your chicken is cut only after your order is placed.',
  },
  {
    title: 'Hygienic Processing',
    body: 'Handled in clean environments with strict hygiene practices.',
  },
  {
    title: 'No Long Storage',
    body: 'We do not stockpile. What you get is fresh, not frozen.',
  },
  {
    title: 'Transparent Quality',
    body: 'No fake promises. Just honest, fresh chicken.',
  },
]

export default function Trust() {
  return (
    <section className="trust-section" aria-labelledby="trust-heading">
      <div className="container">
        <Reveal className="section-header">
          <div className="eyebrow-tag">Why Choose Us</div>
          <h2 className="section-h2" id="trust-heading">Why B&rsquo;LURU Fresh?</h2>
        </Reveal>

        <div className="trust-grid">
          {reasons.map((reason, index) => (
            <Reveal as="article" className="trust-card" delay={index} key={reason.title}>
              <div className="trust-check" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3>{reason.title}</h3>
              <p>{reason.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
