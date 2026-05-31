import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Privacy Policy | B'LURU Fresh",
  description: "Privacy Policy for B'LURU Fresh chicken delivery platform.",
}

export default function PrivacyPage() {
  return (
    <article style={S.article}>
      <div style={S.badge}>Legal</div>
      <h1 style={S.h1}>Privacy Policy</h1>
      <p style={S.effective}>Effective Date: May 12, 2026</p>

      <Section title="1. Introduction">
        <p>B&apos;LURU Fresh (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), operated by The Chicken Shack, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our website <a href="https://www.blurufresh.com" style={S.link}>www.blurufresh.com</a> and our ordering platform (collectively, the &ldquo;Platform&rdquo;).</p>
        <p style={{ marginTop: 8 }}>By using our Platform, you consent to the practices described in this Policy. This Policy is published in compliance with the <strong>Information Technology Act, 2000</strong>, the <strong>IT (Reasonable Security Practices) Rules, 2011</strong>, and other applicable Indian laws.</p>
      </Section>

      <Section title="2. Information We Collect">
        <h3 style={S.h3}>2.1 Information You Provide</h3>
        <ul style={S.ul}>
          <li><strong>Account Information:</strong> Name, phone number when you create an account.</li>
          <li><strong>Order Information:</strong> Delivery address, pin code, and product preferences when placing an order.</li>
          <li><strong>Communication Data:</strong> Messages, feedback, or complaints you submit via phone or email.</li>
        </ul>

        <h3 style={S.h3}>2.2 Information Collected Automatically</h3>
        <ul style={S.ul}>
          <li><strong>Usage Data:</strong> Pages visited, buttons clicked, time spent on the Platform, browser type, and device type.</li>
          <li><strong>Device Data:</strong> IP address, device identifiers, and operating system.</li>
          <li><strong>Location Data:</strong> Pin code entered for delivery availability check.</li>
        </ul>

        <h3 style={S.h3}>2.3 Payment Information</h3>
        <p>Payments are processed securely by <strong>Cashfree</strong>. We do not store your credit/debit card details, UPI IDs, or banking credentials on our servers. All payment data is governed by <a href="https://cashfree.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={S.link}>Cashfree&apos;s Privacy Policy</a>.</p>

        <h3 style={S.h3}>2.4 Cookies</h3>
        <p>We use cookies to improve your experience on our Platform. Cookies help us remember your preferences and analyze how you use the Platform. You may disable cookies through your browser settings, though this may affect certain features.</p>
      </Section>

      <Section title="3. How We Use Your Information">
        <p>We use your information to:</p>
        <ul style={S.ul}>
          <li>Process and fulfill your orders and send order confirmations.</li>
          <li>Verify delivery availability in your area.</li>
          <li>Communicate with you about your orders, account, and customer support requests.</li>
          <li>Improve our Platform, products, and services.</li>
          <li>Send promotional communications (only with your consent — you may opt out at any time).</li>
          <li>Comply with legal obligations and resolve disputes.</li>
          <li>Detect and prevent fraud, abuse, or security incidents.</li>
        </ul>
      </Section>

      <Section title="4. Sharing Your Information">
        <p>We do not sell your personal information to third parties. We may share your information with:</p>
        <ul style={S.ul}>
          <li><strong>Delivery Partners:</strong> Your name, contact number, and delivery address are shared with our delivery personnel to fulfill your order.</li>
          <li><strong>Payment Processors:</strong> Transaction data is shared with Cashfree to process payments.</li>
          <li><strong>Service Providers:</strong> Trusted third-party vendors who assist in running our Platform (e.g., hosting, analytics), bound by confidentiality obligations.</li>
          <li><strong>Legal Authorities:</strong> Where required by law, court order, or government authority.</li>
          <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
        </ul>
      </Section>

      <Section title="5. Data Security">
        <p>We implement reasonable physical, technical, and administrative safeguards including:</p>
        <ul style={S.ul}>
          <li>Encrypted data transmission (HTTPS/SSL).</li>
          <li>Password hashing and secure authentication mechanisms.</li>
          <li>Restricted access to personal data on a need-to-know basis.</li>
          <li>Regular review of security practices.</li>
        </ul>
        <p style={{ marginTop: 8 }}>However, no method of internet transmission is 100% secure, and we cannot guarantee absolute security.</p>
      </Section>

      <Section title="6. Data Retention">
        <p>We retain your personal information for as long as necessary to fulfill the purposes outlined in this Policy, or as required by applicable law. You may request deletion of your account and associated data by contacting us (subject to legal retention obligations).</p>
      </Section>

      <Section title="7. Your Rights">
        <p>As a user, you have the right to:</p>
        <ul style={S.ul}>
          <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal requirements.</li>
          <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time.</li>
          <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing (note: this may affect your ability to use the Platform).</li>
        </ul>
        <p style={{ marginTop: 8 }}>To exercise any of these rights, contact us at: <a href="mailto:admin@blurufresh.com" style={S.link}>admin@blurufresh.com</a> or <a href="tel:+917012488951" style={S.link}>+91 7012488951</a>.</p>
      </Section>

      <Section title="8. Children's Privacy">
        <p>Our Platform is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal data, we will delete it promptly.</p>
      </Section>

      <Section title="9. Third-Party Links">
        <p>Our Platform may contain links to third-party websites. We are not responsible for the privacy practices of those websites and encourage you to review their respective privacy policies.</p>
      </Section>

      <Section title="10. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the updated Policy on our Platform with a revised &ldquo;Last Updated&rdquo; date. Continued use of the Platform after such changes constitutes your acceptance.</p>
      </Section>

      <Section title="11. Grievance Officer">
        <div style={S.contactBox}>
          <p><strong>Name:</strong> Anirudh Syam</p>
          <p><strong>Designation:</strong> Grievance Officer</p>
          <p><strong>Company:</strong> B&apos;LURU Fresh / The Chicken Shack</p>
          <p><strong>Address:</strong> No. 951, Thirumenahalli Main Road, Agrahara Layout, Yelahanka, B.B.M.P North, Bangalore, Karnataka – 560064</p>
          <p><strong>Email:</strong> <a href="mailto:support@thechickenshack.in" style={S.link}>support@thechickenshack.in</a></p>
          <p><strong>Phone:</strong> <a href="tel:+917012488951" style={S.link}>+91 7012488951</a></p>
          <p><strong>Working Hours:</strong> Monday – Saturday, 9:00 AM – 6:00 PM</p>
          <p style={{ marginTop: 4, color: '#92400e', fontSize: '0.8125rem' }}>Grievances shall be addressed within <strong>30 days</strong> of receipt.</p>
        </div>
      </Section>

      <p style={S.footnote}>This document constitutes an electronic record under the Information Technology Act, 2000.</p>
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
  link:       { color: '#d97706', textDecoration: 'none', fontWeight: 500 },
  contactBox: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem', lineHeight: 1.6 },
  footnote:   { fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic', marginTop: '1rem' },
}
