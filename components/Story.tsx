import Image from 'next/image'
import Reveal from './Reveal'

export default function Story() {
  return (
    <section className="story-section" id="story" aria-labelledby="story-heading">
      <div className="container">
        <div className="story-grid">
          {/* Image column */}
          <Reveal className="story-image-col" delay={0}>
            <div className="story-img-shell">
              <div className="story-img-core" style={{ position: 'relative' }}>
                <Image
                  src="/assets/chicken_farm.jpg"
                  alt="Fresh chicken sourcing for B'LURU FRESH Bangalore"
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, 45vw"
                />
              </div>
            </div>
            <Reveal className="story-pull-quote" delay={2}>
              <blockquote>&ldquo;Freshness isn&rsquo;t a marketing word. It&rsquo;s a responsibility.&rdquo;</blockquote>
            </Reveal>
          </Reveal>

          {/* Copy column */}
          <Reveal className="story-copy" delay={1}>
            <div className="eyebrow-tag">Our Story</div>
            <h2 className="section-h2" id="story-heading">B&rsquo;LURU Fresh<br />Chicken</h2>
            <div className="story-copy-panel">
              <p className="body-text story-lead">
                At B&rsquo;LURU Fresh, we started with a simple observation&mdash;buying fresh chicken shouldn&rsquo;t feel uncertain.
              </p>

              <div className="story-question-card">
                <span className="story-card-label">What customers are left guessing</span>
                <ul>
                  <li>How fresh is it?</li>
                  <li>Am I getting a frozen product?</li>
                  <li>When was it slaughtered?</li>
                  <li>Was it handled hygienically?</li>
                </ul>
              </div>

              <p className="body-text story-belief">
                We believed you deserved better.
              </p>

              <div className="story-promise-card">
                <span className="story-card-label">Our promise</span>
                <p>
                  Freshly cut, cleanly handled, and honestly delivered chicken&mdash;every single day.
                </p>
              </div>

              <p className="body-text">
                We work closely with trusted local suppliers and process chicken in hygienic environments, ensuring that every order is handled with care, precision, and speed. From cutting to packing to delivery, everything is done with one goal&mdash;to get you fresh meat, not stored meat.
              </p>

              <div className="story-simple-list">
                <span>No unnecessary storage.</span>
                <span>No confusing claims.</span>
                <span>Just clean, same-day processed chicken delivered to your doorstep.</span>
              </div>

              <p className="body-text story-closing">
                Because for us, freshness isn&rsquo;t a marketing word&mdash;it&rsquo;s a responsibility.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
