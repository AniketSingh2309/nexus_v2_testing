import { useState } from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const MinusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

const faqs = [
  {
    q: "What's included in the Monitoring and Billing Bundles?",
    a: "Each bundle gives you access to one module — Monitoring OR Billing — for 1 Admin + 1 User. The Monitoring Bundle includes real-time dashboards, server health tracking, alert management, and network analytics. The Billing Bundle includes cost analytics, invoice management, AI forecasting, and budget tracking.",
  },
  {
    q: "Can I upgrade my plan later?",
    a: "Absolutely. You can start with a single-module bundle and upgrade to Standard Pro or Professional as your team grows. There's no lock-in — just reach out to our team and we'll handle the transition.",
  },
  {
    q: "Is there a free trial available?",
    a: "We offer a personalized demo so you can see MyCloudNexus working with your actual cloud data. Contact our team to book a session — there's no commitment required.",
  },
  {
    q: "How does pricing work for larger teams?",
    a: "The Professional plan includes 2 Admins + 3 Users per module. For teams beyond that, our Enterprise plan offers unlimited users with custom pricing. Contact us to discuss your specific requirements.",
  },
  {
    q: "What cloud providers does MyCloudNexus support?",
    a: "MyCloudNexus supports AWS, Google Cloud, and Microsoft Azure natively. We also support hybrid and on-premises environments through our agent-based monitoring. More cloud providers are on our roadmap.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. MyCloudNexus is SOC 2 Type II compliant. All data is encrypted in transit and at rest. We never store sensitive credentials — only the metrics we need to provide insights.",
  },
];

const comparisonRows = [
  { feature: "Monitoring module",        bundle: true,  pro: true,  professional: true,  enterprise: true  },
  { feature: "Billing module",           bundle: true,  pro: true,  professional: true,  enterprise: true  },
  { feature: "Number of admins",         bundle: "1",   pro: "2",   professional: "2",   enterprise: "∞"   },
  { feature: "Number of users",          bundle: "1",   pro: "—",   professional: "3/mod", enterprise: "∞" },
  { feature: "Real-time dashboards",     bundle: true,  pro: true,  professional: true,  enterprise: true  },
  { feature: "AI cost forecasting",      bundle: false, pro: true,  professional: true,  enterprise: true  },
  { feature: "Custom alert policies",    bundle: false, pro: true,  professional: true,  enterprise: true  },
  { feature: "Advanced analytics",       bundle: false, pro: false, professional: true,  enterprise: true  },
  { feature: "API access",               bundle: false, pro: false, professional: true,  enterprise: true  },
  { feature: "Dedicated account manager",bundle: false, pro: false, professional: false, enterprise: true  },
  { feature: "Custom integrations & SSO",bundle: false, pro: false, professional: false, enterprise: true  },
  { feature: "SLA guarantee",            bundle: false, pro: false, professional: false, enterprise: true  },
  { feature: "Support",                  bundle: "Email", pro: "Priority Email", professional: "Priority Email", enterprise: "24/7 Priority" },
];

function CellVal({ v }) {
  if (v === true)  return <div className="pp-cell-check"><CheckIcon /></div>;
  if (v === false) return <div className="pp-cell-minus"><MinusIcon /></div>;
  return <span className="pp-cell-text">{v}</span>;
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "faq-open" : ""}`}>
      <button className="faq-q" onClick={() => setOpen(v => !v)}>
        <span>{q}</span>
        <div className={`faq-chevron ${open ? "faq-chevron-open" : ""}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}

export default function PricingPage({ onNavigate }) {
  const [bundleTab, setBundleTab] = useState("monitoring");

  function scrollToContact() {
    onNavigate("home");
    setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 280);
  }

  return (
    <div className="page-wrapper">
      <Navbar onNavigate={onNavigate} currentPage="pricing" />

      {/* ── Hero ── */}
      <section className="pp-hero">
        <div className="section-container pp-hero-inner">
          <div className="page-label">Pricing</div>
          <h1 className="pp-hero-title">Simple, transparent<br /><span className="pp-hero-accent">pricing for every team</span></h1>
          <p className="pp-hero-desc">Start with what you need. Scale as you grow — no hidden fees, no surprises, no long-term lock-in.</p>
        </div>
      </section>

      {/* ── Pricing Grid ── */}
      <section className="pp-plans-section">
        <div className="section-container">
          <div className="pricing-grid">

            {/* Bundle card */}
            <div className="pricing-card bundle-card">
              <div className="bundle-toggle">
                <button className={`bundle-tab ${bundleTab === "monitoring" ? "active" : ""}`} onClick={() => setBundleTab("monitoring")}>Monitoring</button>
                <button className={`bundle-tab ${bundleTab === "billing" ? "active" : ""}`} onClick={() => setBundleTab("billing")}>Billing</button>
              </div>
              <div key={bundleTab} className="bundle-plan-content">
                <div className="pc-name">{bundleTab === "monitoring" ? "Monitoring Bundle" : "Billing Bundle"}</div>
                <div className="pc-price-wrap">
                  <span className="pc-price">₹1</span>
                  <span className="pc-period">per user / year</span>
                </div>
                <p className="pc-desc">
                  {bundleTab === "monitoring"
                    ? "Perfect for teams focused on infrastructure health, real-time alerting, and server analytics."
                    : "Ideal for teams tracking cloud costs, managing invoices, and optimizing spend."}
                </p>
                <ul className="pc-features">
                  {(bundleTab === "monitoring"
                    ? ["1 Admin + 1 User", "Monitoring Module Access", "Real-time Alerts & Dashboards", "Server & Network Health", "Email Support"]
                    : ["1 Admin + 1 User", "Billing Module Access", "Cost Analytics & Forecasting", "Invoice & Budget Management", "Email Support"]
                  ).map(f => <li key={f}><CheckIcon />{f}</li>)}
                </ul>
                <button className="btn btn-secondary btn-lg pc-btn" onClick={scrollToContact}>Contact Us <ArrowRight /></button>
              </div>
            </div>

            {/* Standard Pro */}
            <div className="pricing-card">
              <div className="pc-name">Standard Pro</div>
              <div className="pc-price-wrap"><span className="pc-price pc-contact">Contact Us</span></div>
              <p className="pc-desc">For growing teams that need full access to both monitoring and billing in one plan.</p>
              <ul className="pc-features">
                {["2 Admins Included", "Monitoring & Billing Access", "Full Dashboard Suite", "Custom Alert Policies", "Priority Email Support"].map(f => (
                  <li key={f}><CheckIcon />{f}</li>
                ))}
              </ul>
              <button className="btn btn-secondary btn-lg pc-btn" onClick={scrollToContact}>Contact Us <ArrowRight /></button>
            </div>

            {/* Professional */}
            <div className="pricing-card pricing-highlight">
              <div className="pc-badge">Most Popular</div>
              <div className="pc-name">Professional</div>
              <div className="pc-price-wrap"><span className="pc-price pc-contact">Contact Us</span></div>
              <p className="pc-desc">Scale your team with multi-user access and advanced analytics across all modules.</p>
              <ul className="pc-features">
                {["2 Admins + 3 Users per Module", "Full Platform Access", "Advanced Analytics & Reports", "Dedicated Account Manager", "API Access & Integrations"].map(f => (
                  <li key={f}><CheckIcon />{f}</li>
                ))}
              </ul>
              <button className="btn btn-secondary btn-lg pc-btn" onClick={scrollToContact}>Contact Us <ArrowRight /></button>
            </div>

            {/* Enterprise */}
            <div className="pricing-card">
              <div className="pc-name">Enterprise</div>
              <div className="pc-price-wrap"><span className="pc-price pc-contact">Contact Us</span></div>
              <p className="pc-desc">Unlimited scale, custom integrations, and white-glove support for large organizations.</p>
              <ul className="pc-features">
                {["Unlimited Users", "Full Platform Access", "Custom Integrations & SSO", "24/7 Priority Support", "SLA Guarantee"].map(f => (
                  <li key={f}><CheckIcon />{f}</li>
                ))}
              </ul>
              <button className="btn btn-secondary btn-lg pc-btn" onClick={scrollToContact}>Contact Us <ArrowRight /></button>
            </div>

          </div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="pp-compare-section">
        <div className="section-container">
          <div className="fp-section-header">
            <div className="fp-section-eyebrow fp-eyebrow-blue">Compare Plans</div>
            <h2 className="fp-section-title">Everything side by side</h2>
          </div>
          <div className="pp-table-wrap">
            <table className="pp-table">
              <thead>
                <tr>
                  <th className="pp-th-feature">Feature</th>
                  <th>Bundle</th>
                  <th>Standard Pro</th>
                  <th className="pp-th-highlight">Professional</th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(({ feature, bundle, pro, professional, enterprise }) => (
                  <tr key={feature}>
                    <td className="pp-td-feature">{feature}</td>
                    <td className="pp-td-center"><CellVal v={bundle} /></td>
                    <td className="pp-td-center"><CellVal v={pro} /></td>
                    <td className="pp-td-center pp-td-highlight"><CellVal v={professional} /></td>
                    <td className="pp-td-center"><CellVal v={enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pp-faq-section">
        <div className="section-container pp-faq-inner">
          <div className="fp-section-header">
            <div className="fp-section-eyebrow fp-eyebrow-blue">FAQ</div>
            <h2 className="fp-section-title">Frequently asked questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="fp-cta-section fp-cta-dark">
        <div className="section-container">
          <div className="pp-cta-inner">
            <h2>Not sure which plan is right?</h2>
            <p>Talk to our team — we'll help you find the perfect fit for your infrastructure and budget.</p>
            <div className="fp-cta-btns">
              <button className="btn btn-primary btn-xl" onClick={scrollToContact}>Talk to Sales</button>
              <button className="btn fp-ghost-btn btn-xl" onClick={() => onNavigate("features")}>Explore Features <ArrowRight /></button>
            </div>
          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
