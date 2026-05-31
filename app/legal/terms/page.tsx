import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Terms of Service | B'LURU Fresh",
  description: 'Terms of Service for B\'LURU Fresh chicken delivery platform.',
}

export default function TermsPage() {
  return (
    <article style={S.article}>
      <div style={S.badge}>Legal</div>
      <h1 style={S.h1}>Terms of Service</h1>
      <p style={S.effective}>Effective Date: May 12, 2026</p>

      <Section title="1. Introduction">
        <p>Welcome to <strong>B&apos;LURU Fresh</strong> (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), operated by The Chicken Shack, a FSSAI-licensed fresh chicken delivery service based in Bangalore, India (FSSAI Lic. No. 11226331000344). By accessing or using our website at <a href="https://www.blurufresh.com" style={S.link}>www.blurufresh.com</a> and/or our ordering platform (collectively, the &ldquo;Platform&rdquo;), you (&ldquo;User&rdquo;, &ldquo;Customer&rdquo;, or &ldquo;you&rdquo;) agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;).</p>
        <p>If you do not agree with any part of these Terms, please do not use our Platform.</p>
      </Section>

      <Section title="2. Eligibility">
        <ul style={S.ul}>
          <li>You must be at least 18 years of age to use our Platform and place orders.</li>
          <li>By using our Platform, you confirm that you are legally capable of entering into a binding contract under the Indian Contract Act, 1872.</li>
          <li>Our services are currently available only in select pin codes in Bangalore. You may use the pin code checker on our Platform to verify delivery availability in your area.</li>
        </ul>
      </Section>

      <Section title="3. Account Registration">
        <ul style={S.ul}>
          <li>To place orders, you may need to create an account using a valid phone number.</li>
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You agree to notify us immediately at <a href="mailto:admin@blurufresh.com" style={S.link}>admin@blurufresh.com</a> if you suspect any unauthorized use of your account.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
        </ul>
      </Section>

      <Section title="4. Products & Ordering">
        <ul style={S.ul}>
          <li>All products listed on our Platform are subject to availability. We reserve the right to modify, discontinue, or limit the quantity of any product at any time.</li>
          <li>Our chicken is processed fresh after your order is placed. Order cut-off times and delivery windows are displayed at the time of ordering.</li>
          <li>Product images are for illustrative purposes only. Actual weights and appearance may vary slightly.</li>
          <li>Prices are displayed in Indian Rupees (INR) and are inclusive of all applicable taxes unless stated otherwise.</li>
          <li>We reserve the right to modify prices at any time without prior notice.</li>
        </ul>
      </Section>

      <Section title="5. Payment">
        <ul style={S.ul}>
          <li>We accept online payments via Cashfree (credit/debit cards, UPI, net banking, wallets) and Cash on Delivery (COD).</li>
          <li>All online transactions are processed securely through Cashfree. We do not store your payment card details on our servers.</li>
          <li>For COD orders, payment must be made at the time of delivery in exact change.</li>
          <li>In the event of a failed online payment, please contact us at <a href="tel:+917012488951" style={S.link}>+91 7012488951</a> before attempting to re-order.</li>
          <li>We reserve the right to cancel any order if payment is not successfully completed.</li>
        </ul>
      </Section>

      <Section title="6. Delivery">
        <ul style={S.ul}>
          <li>Delivery is available within serviceable pin codes in Bangalore only.</li>
          <li>Estimated delivery times are indicative and may vary due to weather, traffic, or operational factors.</li>
          <li>You must provide a valid and complete delivery address. We shall not be held liable for failed deliveries due to incorrect addresses provided by you.</li>
          <li>Deliveries will be made to the address specified at the time of ordering. We do not redirect orders after dispatch.</li>
          <li>A delivery executive will attempt to contact you before delivery. If you are unreachable, the order may be returned. No refund will be provided in such cases unless covered under our Refund Policy.</li>
        </ul>
      </Section>

      <Section title="7. Product Quality & Freshness">
        <ul style={S.ul}>
          <li>All our chicken is sourced from trusted local suppliers, processed hygienically, and packed fresh on the same day.</li>
          <li>Our products are free from added preservatives and chemicals.</li>
          <li>Our facility complies with FSSAI guidelines and food safety standards.</li>
          <li>It is your responsibility to refrigerate or consume the product promptly upon receipt. We are not liable for spoilage due to improper storage after delivery.</li>
        </ul>
      </Section>

      <Section title="8. Cancellations">
        <p>Since our chicken is cut fresh after your order is placed, <strong>orders cannot be cancelled once they are confirmed and processing has begun</strong>.</p>
        <p>If you wish to cancel before processing begins, please contact us immediately at <a href="tel:+917012488951" style={S.link}>+91 7012488951</a>. Cancellations at this stage are at our sole discretion.</p>
        <p>Please refer to our <a href="/legal/refund" style={S.link}>Refund &amp; Cancellation Policy</a> for applicable refunds.</p>
      </Section>

      <Section title="9. Prohibited Conduct">
        <p>You agree not to:</p>
        <ul style={S.ul}>
          <li>Use the Platform for any unlawful purpose or in violation of applicable laws.</li>
          <li>Provide false, misleading, or incomplete information during registration or ordering.</li>
          <li>Attempt to hack, reverse-engineer, or otherwise tamper with our Platform.</li>
          <li>Use the Platform to send spam, malware, or any harmful content.</li>
          <li>Resell products purchased from our Platform for commercial gain without prior written consent.</li>
        </ul>
      </Section>

      <Section title="10. Intellectual Property">
        <p>All content on our Platform including logos, brand name, product descriptions, images, and website design are the property of The Chicken Shack and are protected under applicable intellectual property laws. You may not use, copy, or reproduce any of our content without explicit written permission.</p>
      </Section>

      <Section title="11. Limitation of Liability">
        <ul style={S.ul}>
          <li>B&apos;LURU Fresh shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the Platform.</li>
          <li>Our total liability to you for any claim shall not exceed the amount paid by you for the specific order in question.</li>
          <li>We are not liable for delays, failures, or disruptions caused by factors beyond our reasonable control (force majeure), including natural disasters, network outages, or government actions.</li>
        </ul>
      </Section>

      <Section title="12. Governing Law & Dispute Resolution">
        <ul style={S.ul}>
          <li>These Terms shall be governed by and construed in accordance with the laws of India.</li>
          <li>Any disputes arising out of or in connection with these Terms shall first be attempted to be resolved amicably within 30 days of notice.</li>
          <li>If unresolved, disputes shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka, India.</li>
        </ul>
      </Section>

      <Section title="13. Amendments">
        <p>We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Platform. Your continued use of the Platform after any changes constitutes your acceptance of the revised Terms.</p>
      </Section>

      <Section title="14. Contact Us">
        <div style={S.contactBox}>
          <p><strong>B&apos;LURU Fresh</strong></p>
          <p>The Chicken Shack, No. 951, Thirumenahalli Main Road, Agrahara Layout, Yelahanka, B.B.M.P North, Bangalore, Karnataka – 560064</p>
          <p>Phone: <a href="tel:+917012488951" style={S.link}>+91 7012488951</a></p>
          <p>Email: <a href="mailto:admin@blurufresh.com" style={S.link}>admin@blurufresh.com</a></p>
        </div>
      </Section>

      <p style={S.footnote}>This document constitutes an electronic record under the Information Technology Act, 2000 and the rules thereunder.</p>
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
  h2:         { fontSize: '1.0625rem', fontWeight: 700, color: '#1a1109', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 },
  ul:         { paddingLeft: '1.25rem', margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: 6 },
  link:       { color: '#d97706', textDecoration: 'none', fontWeight: 500 },
  contactBox: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem', lineHeight: 1.6 },
  footnote:   { fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic', marginTop: '1rem' },
}
