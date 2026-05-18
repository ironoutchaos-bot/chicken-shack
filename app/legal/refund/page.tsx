import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | B'LURU Fresh",
  description: "Refund and cancellation policy for B'LURU Fresh chicken delivery.",
}

export default function RefundPage() {
  return (
    <article style={S.article}>
      <div style={S.badge}>Legal</div>
      <h1 style={S.h1}>Refund &amp; Cancellation Policy</h1>
      <p style={S.effective}>Effective Date: May 12, 2026</p>

      <Section title="1. Overview">
        <p>At B&apos;LURU Fresh, we take great pride in delivering fresh, hygienically processed chicken to your doorstep. Since our products are perishable and cut fresh to order, our refund and cancellation policy is designed to be fair to both our customers and our operations.</p>
      </Section>

      <Section title="2. Cancellation Policy">
        <h3 style={S.h3}>2.1 Customer-Initiated Cancellations</h3>
        <ul style={S.ul}>
          <li><strong>Before processing begins:</strong> If you wish to cancel your order, please call us immediately at <a href="tel:+917012488951" style={S.link}>+91 7012488951</a>. Cancellations before the cutting/processing of your order begins may be accepted at our discretion. A full refund will be issued if the cancellation is approved.</li>
          <li><strong>After processing begins:</strong> Once your order has been confirmed and the chicken is being processed/cut, cancellations are <strong>not accepted</strong>, as the product is freshly prepared specifically for your order.</li>
          <li><strong>After dispatch:</strong> Orders cannot be cancelled once they are out for delivery.</li>
        </ul>

        <h3 style={S.h3}>2.2 Company-Initiated Cancellations</h3>
        <p>We may cancel your order in the following circumstances:</p>
        <ul style={S.ul}>
          <li>Non-availability of stock.</li>
          <li>Delivery not feasible to your location on the given day.</li>
          <li>Suspected fraudulent activity or violation of our Terms of Service.</li>
          <li>Force majeure events (natural disasters, curfews, etc.).</li>
        </ul>
        <p style={{ marginTop: 8 }}>In all such cases, you will receive a <strong>full refund</strong> via the original payment method.</p>
      </Section>

      <Section title="3. Refund Policy">
        <h3 style={S.h3}>3.1 Eligible Refund Scenarios</h3>
        <p style={{ marginBottom: 12 }}>Refunds will be processed in the following situations:</p>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Situation</th>
                <th style={S.th}>Refund</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Order cancelled before processing', 'Full refund'],
                ['Order cancelled by B\'LURU Fresh', 'Full refund'],
                ['Product delivered is wrong (different cut/product)', 'Full refund or replacement'],
                ['Product delivered is visibly spoiled or contaminated', 'Full refund or replacement'],
                ['Order not delivered but marked as delivered', 'Full refund after verification'],
                ['Duplicate payment charged', 'Full refund of duplicate amount'],
              ].map(([situation, refund], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf9' }}>
                  <td style={S.td}>{situation}</td>
                  <td style={{ ...S.td, color: '#16a34a', fontWeight: 600 }}>{refund}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 style={S.h3}>3.2 Non-Eligible Refund Scenarios</h3>
        <p>Refunds will <strong>not</strong> be provided in the following cases:</p>
        <ul style={S.ul}>
          <li>Change of mind after the order is confirmed and processing has begun.</li>
          <li>Incorrect delivery address provided by the customer.</li>
          <li>Customer unavailable at the time of delivery after delivery executive attempted contact.</li>
          <li>Dissatisfaction due to personal taste preference (not quality).</li>
          <li>Delay in delivery due to traffic, weather, or other factors beyond our control.</li>
        </ul>
      </Section>

      <Section title="4. How to Request a Refund">
        <ol style={S.ol}>
          <li>Contact us within <strong>2 hours of delivery</strong> (for quality/wrong product issues).</li>
          <li>Call us at <a href="tel:+917012488951" style={S.link}>+91 7012488951</a> or email <a href="mailto:support@blurufresh.com" style={S.link}>support@blurufresh.com</a>.</li>
          <li>Provide your Order ID, contact number, and the reason for your request.</li>
          <li>Where applicable, share a photo of the product to help us investigate.</li>
        </ol>
      </Section>

      <Section title="5. Refund Processing Time">
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Payment Method</th>
                <th style={S.th}>Refund Timeline</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Cashfree (Credit/Debit Card)', '5–7 business days'],
                ['Cashfree (UPI)', '2–3 business days'],
                ['Cashfree (Net Banking / Wallet)', '3–5 business days'],
                ['Cash on Delivery', 'Not applicable (replacement offered)'],
              ].map(([method, timeline], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf9' }}>
                  <td style={S.td}>{method}</td>
                  <td style={{ ...S.td, fontWeight: 500 }}>{timeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 10, fontSize: '0.8125rem', color: '#6b7280' }}>Refunds will be credited to the <strong>original payment method</strong> used during purchase. We do not issue cash refunds for online orders.</p>
      </Section>

      <Section title="6. Replacements">
        <p>In cases where a refund is not feasible (e.g., COD orders or minor quality concerns), we may offer a <strong>replacement with your next order</strong>, subject to our discretion and availability.</p>
      </Section>

      <Section title="7. Disputes">
        <p>If you are unsatisfied with our resolution, you may escalate your concern to:</p>
        <div style={S.contactBox}>
          <p>Email: <a href="mailto:grievance@blurufresh.com" style={S.link}>grievance@blurufresh.com</a></p>
          <p>Phone: <a href="tel:+917012488951" style={S.link}>+91 7012488951</a></p>
          <p>Working Hours: Monday – Saturday, 9:00 AM – 6:00 PM</p>
          <p style={{ marginTop: 4, color: '#92400e', fontSize: '0.8125rem' }}>We aim to resolve all disputes within <strong>7 business days</strong> of escalation.</p>
        </div>
      </Section>

      <Section title="8. Contact Us">
        <div style={S.contactBox}>
          <p><strong>B&apos;LURU Fresh</strong></p>
          <p>The Chicken Shack, No. 951, Thirumenahalli Main Road, Agrahara Layout, Yelahanka, B.B.M.P North, Bangalore, Karnataka – 560064</p>
          <p>Phone: <a href="tel:+917012488951" style={S.link}>+91 7012488951</a></p>
          <p>Email: <a href="mailto:support@blurufresh.com" style={S.link}>support@blurufresh.com</a></p>
        </div>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.section}>
      <h2 style={S.h2}>{title}</h2>
      {children}
    </section>
  )
}

const S: Record<string, React.CSSProperties> = {
  article:    { color: '#1a1109' },
  badge:      { display: 'inline-block', background: '#fef3c7', color: '#92400e', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 100, marginBottom: '0.75rem' },
  h1:         { fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', fontWeight: 800, color: '#1a1109', margin: '0 0 0.375rem', lineHeight: 1.15 },
  effective:  { color: '#9ca3af', fontSize: '0.8125rem', marginBottom: '2.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' },
  section:    { marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #f3f4f6' },
  h2:         { fontSize: '1.0625rem', fontWeight: 700, color: '#1a1109', marginBottom: '0.75rem' },
  h3:         { fontSize: '0.9375rem', fontWeight: 600, color: '#374151', margin: '1rem 0 0.5rem' },
  ul:         { paddingLeft: '1.25rem', margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: 6 },
  ol:         { paddingLeft: '1.25rem', margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: 8 },
  link:       { color: '#d97706', textDecoration: 'none', fontWeight: 500 },
  tableWrap:  { overflowX: 'auto', borderRadius: 10, border: '1px solid #e5e7eb', margin: '0.5rem 0' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th:         { background: '#1a1109', color: '#fff', padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' },
  td:         { padding: '0.625rem 0.875rem', borderBottom: '1px solid #f3f4f6', lineHeight: 1.4 },
  contactBox: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem', lineHeight: 1.6 },
}
