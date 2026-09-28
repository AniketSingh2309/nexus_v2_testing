import { useState, useEffect } from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";


const CloudIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
);
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

const _base = import.meta.env.BASE_URL;
const monitoringCards = [
  { image: `${_base}images/monitoring_health.png`, title: "Server Health Dashboard", desc: "Real-time CPU, memory, and disk monitoring across all your servers with automated health checks and instant anomaly detection." },
  { image: `${_base}images/monitoring_network.png`, title: "Network Traffic Analytics", desc: "Visualize bandwidth consumption, request rates, and latency metrics with geographic traffic mapping across all regions." },
  { image: `${_base}images/monitoring_performance.png`, title: "Application Performance", desc: "Track response times, throughput, and error rates with service dependency mapping and bottleneck identification." },
  { image: `${_base}images/monitoring_alerts.png`, title: "Alert Management", desc: "Configure intelligent alerting with severity levels, escalation policies, and incident timelines for rapid response." },
];

const billingCards = [
  { image: `${_base}images/billing_overview.png`, title: "Cost Overview Dashboard", desc: "Comprehensive monthly cost breakdown with spending trends, budget utilization tracking, and invoice summaries at a glance." },
  { image: `${_base}images/billing_usage.png`, title: "Usage Breakdown", desc: "Detailed resource usage analysis by service — compute, storage, and networking costs broken down per team and project." },
  { image: `${_base}images/billing_invoices.png`, title: "Invoice Management", desc: "Manage all invoices with payment status tracking, one-click downloads, and complete billing history in one place." },
  { image: `${_base}images/billing_forecast.png`, title: "Budget Forecasting", desc: "AI-powered cost projections with confidence bands, budget vs. actual comparisons, and proactive savings recommendations." },
];

/* ── Carousel Component ── */
function Carousel({ cards, onClose, title }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(null);
  const total = cards.length;

  function goNext() {
    if (current < total - 1) { setDirection("right"); setCurrent(c => c + 1); }
  }
  function goPrev() {
    if (current > 0) { setDirection("left"); setCurrent(c => c - 1); }
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <div className="carousel-overlay" onClick={onClose}>
      <div className="carousel-container" onClick={e => e.stopPropagation()}>
        <div className="carousel-header">
          <div>
            <h3 className="carousel-title">{title}</h3>
            <span className="carousel-counter">{current + 1} of {total}</span>
          </div>
          <button className="carousel-close" onClick={onClose}><XIcon /></button>
        </div>
        <div className="carousel-body">
          <button className="carousel-arrow carousel-arrow-left" onClick={goPrev} disabled={current === 0}>
            <ChevronLeft />
          </button>
          <div className="carousel-card-wrapper">
            <div className="carousel-card" key={current}>
              <div className="carousel-image-wrap">
                <img src={cards[current].image} alt={cards[current].title} className="carousel-image" />
              </div>
              <div className="carousel-info">
                <h4>{cards[current].title}</h4>
                <p>{cards[current].desc}</p>
              </div>
            </div>
          </div>
          <button className="carousel-arrow carousel-arrow-right" onClick={goNext} disabled={current === total - 1}>
            <ChevronRight />
          </button>
        </div>
        <div className="carousel-dots">
          {cards.map((_, i) => (
            <button key={i} className={`carousel-dot ${i === current ? "active" : ""}`} onClick={() => setCurrent(i)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Nav menu items ── */
const makeNavItems = (onNavigate) => [
  {
    label: "Monitoring",
    onClick: () => document.getElementById("solutions")?.scrollIntoView({ behavior: "smooth" }),
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    ),
  },
  {
    label: "Billing",
    onClick: () => document.getElementById("solutions")?.scrollIntoView({ behavior: "smooth" }),
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8"/><path d="M12 18V6"/>
      </svg>
    ),
  },
  {
    label: "Solutions",
    onClick: () => document.getElementById("solutions")?.scrollIntoView({ behavior: "smooth" }),
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    label: "Dashboard",
    onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    label: "Alerts",
    onClick: () => document.getElementById("solutions")?.scrollIntoView({ behavior: "smooth" }),
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </svg>
    ),
  },
  {
    label: "Let's Talk",
    onClick: () => onNavigate("auth:login"),
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
];

/* ── Landing Page ── */
export default function Landing({ onNavigate }) {
  const [activeCarousel, setActiveCarousel] = useState(null);
  const [bundleTab, setBundleTab] = useState("monitoring");
  const [contactForm, setContactForm] = useState({ name: "", phone: "", company: "", email: "", plan: "", message: "" });
  const [contactSent, setContactSent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");

  function scrollToContact(plan = "") {
    if (plan) setContactForm(prev => ({ ...prev, plan }));
    setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  // removed: scroll → scrolled state (Navbar handles it)

  async function handleContactSubmit(e) {
    e.preventDefault();
    setContactLoading(true);
    setContactError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to send");
      setContactSent(true);
      setContactForm({ name: "", phone: "", company: "", email: "", plan: "", message: "" });
    } catch (err) {
      setContactError("Could not send your message. Please try again.");
    } finally {
      setContactLoading(false);
    }
  }

  useEffect(() => {
    if (activeCarousel) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [activeCarousel]);

  return (
    <>
      <Navbar onNavigate={onNavigate} currentPage="home" />

      {/* Hero */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Now with multi-cloud AI forecasting
            </div>
            <h1>Your clouds are talking.<br /><span className="highlight">Start</span> listening.</h1>
            <p className="hero-desc">
              Connect AWS, Azure or GCP in five minutes and watch MyCloudNexus learn your baseline within a day.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-xl" onClick={() => onNavigate("auth:register")}>Start a Free Trial</button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hm-scene">
              {/* Laptop */}
              <div className="hm-laptop">
                <div className="hm-lid">
                  <div className="hm-screen-display">
                    <div className="hm-nav">
                      <div className="hm-logo">
                        <div className="hm-logo-dot" />
                        MyCloud<span>Nexus</span>
                      </div>
                      <div className="hm-nav-links"><span>Monitor</span><span>Billing</span></div>
                    </div>
                    <div className="hm-dash">
                      <div className="hm-dash-row">
                        <div className="hm-ds"><div className="hm-ds-l">CPU</div><div className="hm-ds-v">68%</div></div>
                        <div className="hm-ds"><div className="hm-ds-l">RAM</div><div className="hm-ds-v">4.2GB</div></div>
                        <div className="hm-ds ok"><div className="hm-ds-l">Status</div><div className="hm-ds-v">OK</div></div>
                      </div>
                      <div className="hm-chart">
                        {[30,55,40,70,45,80,55,75,60,85,70,90].map((h,i) => (
                          <div key={i} className="hm-bar" style={{height:`${h}%`}} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="hm-base"><div className="hm-keys" /><div className="hm-trackpad" /></div>
              </div>

              {/* Panel 1 – Server Health */}
              <div className="hm-panel hm-p1">
                <div className="hm-panel-bar">
                  <div className="hm-dots"><i /><i /><i /></div>
                  <span>Server Health</span><span className="hm-ptag">Monitoring</span>
                </div>
                <div className="hm-panel-body">
                  {[['CPU Usage','68%',68],['Memory','54%',54],['Network','82%',82]].map(([l,v,w]) => (
                    <div key={l} className="hm-metric">
                      <div className="hm-ml">{l}</div>
                      <div className="hm-mbar"><div className="hm-mfill" style={{width:`${w}%`}} /></div>
                      <div className="hm-mv">{v}</div>
                    </div>
                  ))}
                  <div className="hm-status-row"><div className="hm-ad hm-green" /><span>All systems go</span></div>
                </div>
              </div>

              {/* Panel 2 – Cost Analytics */}
              <div className="hm-panel hm-p2">
                <div className="hm-panel-bar">
                  <div className="hm-dots"><i /><i /><i /></div>
                  <span>Cost Analytics</span><span className="hm-ptag">Billing</span>
                </div>
                <div className="hm-panel-body hm-cost-body">
                  <div className="hm-cost-info">
                    <div className="hm-cl">Monthly Spend</div>
                    <div className="hm-cv">$12.4K</div>
                    <div className="hm-cc">↓ 8.2% savings</div>
                  </div>
                  <div className="hm-mini-chart">
                    {[40,60,45,70,55,80,65].map((h,i) => (
                      <div key={i} className="hm-mini-bar" style={{height:`${h}%`}} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel 3 – Alert Monitor */}
              <div className="hm-panel hm-p3">
                <div className="hm-panel-bar">
                  <div className="hm-dots"><i /><i /><i /></div>
                  <span>Alert Monitor</span><span className="hm-ptag">Status</span>
                </div>
                <div className="hm-panel-body">
                  <div className="hm-alert"><div className="hm-ad hm-green" /><span>All systems operational</span></div>
                  <div className="hm-alert"><div className="hm-ad hm-yellow" /><span>2 warnings detected</span></div>
                  <div className="hm-alert"><div className="hm-ad hm-grey" /><span>0 critical alerts</span></div>
                  <div className="hm-time">Last checked: 2 min ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Solution Cards: Monitoring & Billing */}
      <section className="solutions-section" id="solutions">
        <div className="section-container">
          <div className="section-header">
            <div className="section-eyebrow">Our Solutions</div>
            <h2 className="section-title">Two powerful platforms,<br />one unified experience</h2>
            <p className="section-desc">Click on either solution to explore detailed features and capabilities.</p>
          </div>
          <div className="solution-cards">
            {/* Monitoring Card — image */}
            <div className="sol-img-card" onClick={() => setActiveCarousel("monitoring")}>
              <img src={`${_base}images/card-monitoring.png`} alt="Monitoring" className="sol-img" />
            </div>

            {/* Billing Card — image */}
            <div className="sol-img-card" onClick={() => setActiveCarousel("billing")}>
              <img src={`${_base}images/card-billing.png`} alt="Billing" className="sol-img" />
            </div>
          </div>
        </div>
      </section>

      {/* AI Capabilities */}
      <section className="ai-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-eyebrow">AI-Powered</div>
            <h2 className="section-title">Three intelligent engines,<br />one unified platform</h2>
            <p className="section-desc">Our AI suite goes beyond dashboards — it actively optimizes, analyses, and forecasts your cloud infrastructure.</p>
          </div>
          <div className="ai-cards">

            {/* AI Optimizer */}
            <div className="ai-card">
              <div className="ai-card-visual ai-opt-visual">
                <div className="ai-icon-glow ai-opt-glow" />
                <div className="ai-icon-circle ai-opt-circle">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div className="ai-card-visual-label">AI Optimizer</div>
              </div>
              <div className="ai-card-body">
                <div className="ai-card-tag ai-opt-tag">Cost Optimization</div>
                <h3 className="ai-card-title">AI Optimizer</h3>
                <p className="ai-card-desc">Automatically identifies and eliminates cloud waste. Our AI engine continuously analyzes resource utilization and recommends right-sizing actions to cut costs by up to 35%.</p>
              </div>
            </div>

            {/* AI Analyser */}
            <div className="ai-card">
              <div className="ai-card-visual ai-ana-visual">
                <div className="ai-icon-glow ai-ana-glow" />
                <div className="ai-icon-circle ai-ana-circle">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    <path d="M11 8v3l2 2"/>
                  </svg>
                </div>
                <div className="ai-card-visual-label">AI Analyser</div>
              </div>
              <div className="ai-card-body">
                <div className="ai-card-tag ai-ana-tag">Deep Analytics</div>
                <h3 className="ai-card-title">AI Analyser</h3>
                <p className="ai-card-desc">Deep infrastructure intelligence at your fingertips. Correlate metrics across compute, network, and storage in real-time to pinpoint bottlenecks before they impact users.</p>
              </div>
            </div>

            {/* AI Forecast */}
            <div className="ai-card">
              <div className="ai-card-visual ai-fore-visual">
                <div className="ai-icon-glow ai-fore-glow" />
                <div className="ai-icon-circle ai-fore-circle">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                    <polyline points="16 7 22 7 22 13"/>
                  </svg>
                </div>
                <div className="ai-card-visual-label">AI Forecast</div>
              </div>
              <div className="ai-card-body">
                <div className="ai-card-tag ai-fore-tag">Budget Forecasting</div>
                <h3 className="ai-card-title">AI Forecast</h3>
                <p className="ai-card-desc">Predict your cloud spend 90 days ahead with confidence. ML models trained on your usage patterns deliver accurate budget projections and proactive spend alerts.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-section" id="pricing">
        <div className="section-container">
          <div className="section-header">
            <div className="section-eyebrow">Pricing</div>
            <h2 className="section-title">Plans for every team</h2>
            <p className="section-desc">Start with what you need. Scale as you grow — no hidden fees, no surprises.</p>
          </div>

          <div className="pricing-grid">

            {/* Bundle card — toggle between Monitoring & Billing */}
            <div className="pricing-card bundle-card">
              <div className="bundle-toggle">
                <button className={`bundle-tab ${bundleTab === "monitoring" ? "active" : ""}`} onClick={() => setBundleTab("monitoring")}>Monitoring</button>
                <button className={`bundle-tab ${bundleTab === "billing" ? "active" : ""}`} onClick={() => setBundleTab("billing")}>Billing</button>
              </div>
              <div key={bundleTab} className="bundle-plan-content">
                <div className="pc-name">
                  {bundleTab === "monitoring" ? "Monitoring Bundle" : "Billing Bundle"}
                </div>
                <div className="pc-price-wrap">
                  <span className="pc-price">₹10,000</span>
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
                <button className="btn btn-secondary btn-lg pc-btn" onClick={() => scrollToContact()}>
                  Contact Us <ArrowRight />
                </button>
              </div>
            </div>

            {/* Standard Pro */}
            <div className="pricing-card">
              <div className="pc-name">Standard Pro</div>
              <div className="pc-price-wrap">
                <span className="pc-price pc-contact">Contact Us</span>
              </div>
              <p className="pc-desc">For growing teams that need full access to both monitoring and billing in one plan.</p>
              <ul className="pc-features">
                {["2 Admins Included", "Monitoring & Billing Access", "Full Dashboard Suite", "Custom Alert Policies", "Priority Email Support"].map(f => (
                  <li key={f}><CheckIcon />{f}</li>
                ))}
              </ul>
              <button className="btn btn-secondary btn-lg pc-btn" onClick={() => scrollToContact()}>
                Contact Us <ArrowRight />
              </button>
            </div>

            {/* Professional — highlighted */}
            <div className="pricing-card pricing-highlight">
              <div className="pc-badge">Most Popular</div>
              <div className="pc-name">Professional</div>
              <div className="pc-price-wrap">
                <span className="pc-price pc-contact">Contact Us</span>
              </div>
              <p className="pc-desc">Scale your team with multi-user access and advanced analytics across all modules.</p>
              <ul className="pc-features">
                {["2 Admins + 3 Users per Module", "Full Platform Access", "Advanced Analytics & Reports", "Dedicated Account Manager", "API Access & Integrations"].map(f => (
                  <li key={f}><CheckIcon />{f}</li>
                ))}
              </ul>
              <button className="btn btn-secondary btn-lg pc-btn" onClick={() => scrollToContact()}>
                Contact Us <ArrowRight />
              </button>
            </div>

            {/* Enterprise */}
            <div className="pricing-card">
              <div className="pc-name">Enterprise</div>
              <div className="pc-price-wrap">
                <span className="pc-price pc-contact">Contact Us</span>
              </div>
              <p className="pc-desc">Unlimited scale, custom integrations, and white-glove support for large organizations.</p>
              <ul className="pc-features">
                {["Unlimited Users", "Full Platform Access", "Custom Integrations & SSO", "24/7 Priority Support", "SLA Guarantee"].map(f => (
                  <li key={f}><CheckIcon />{f}</li>
                ))}
              </ul>
              <button className="btn btn-secondary btn-lg pc-btn" onClick={() => scrollToContact()}>
                Contact Us <ArrowRight />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Contact Us */}
      <section className="contact-section" id="contact">
        <div className="section-container">
          <div className="contact-inner">

            {/* Left — info */}
            <div className="contact-info">
              <div className="contact-badge">Get in Touch</div>
              <h2>See MyCloudNexus<br />in Action</h2>
              <p className="contact-info-sub">
                Top Cloud Management Platform, trusted by engineering teams worldwide. Let our experts walk you through everything MyCloudNexus can do for your infrastructure.
              </p>
              <ul className="contact-perks">
                {[
                  "Live walkthrough of our cloud management platform",
                  "Insights on how our solutions align with your business challenges",
                  "Personalized recommendations for cost optimization and efficiency",
                  "Q&A session with our cloud infrastructure specialists",
                ].map(p => (
                  <li key={p}>
                    <CheckIcon />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — form */}
            <div className="contact-form-card">
              {contactSent ? (
                <div className="cf-success">
                  <div className="cf-success-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3>Message Sent!</h3>
                  <p>Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                  <button className="cf-reset" onClick={() => setContactSent(false)}>Send another message</button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  <div className="contact-form-title">Start Securing Your Business Today!</div>
                  <div className="cf-row">
                    <div className="cf-field">
                      <input
                        className="cf-input"
                        type="text"
                        placeholder="Full Name"
                        value={contactForm.name}
                        onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="cf-field">
                      <input
                        className="cf-input"
                        type="tel"
                        placeholder="Contact No."
                        value={contactForm.phone}
                        onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="cf-field">
                    <input
                      className="cf-input"
                      type="text"
                      placeholder="Company"
                      value={contactForm.company}
                      onChange={e => setContactForm(p => ({ ...p, company: e.target.value }))}
                    />
                  </div>
                  <div className="cf-field">
                    <input
                      className="cf-input"
                      type="email"
                      placeholder="Work Email"
                      value={contactForm.email}
                      onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="cf-field">
                    <select
                      className="cf-input cf-select"
                      value={contactForm.plan}
                      onChange={e => setContactForm(p => ({ ...p, plan: e.target.value }))}
                    >
                      <option value="">Select a Plan</option>
                      <option value="Monitoring Bundle">Monitoring Bundle</option>
                      <option value="Billing Bundle">Billing Bundle</option>
                      <option value="Standard Pro">Standard Pro</option>
                      <option value="Professional">Professional</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="cf-field">
                    <textarea
                      className="cf-input cf-textarea"
                      placeholder="Tell us briefly what you are looking for in MyCloudNexus..."
                      value={contactForm.message}
                      onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                    />
                  </div>
                  {contactError && (
                    <p className="cf-error">{contactError}</p>
                  )}
                  <button type="submit" className="cf-submit" disabled={contactLoading}>
                    {contactLoading ? (
                      <><span className="cf-spinner" /> Sending...</>
                    ) : "Schedule a Free Demo Today"}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />

      {/* Carousel Overlay */}
      {activeCarousel === "monitoring" && (
        <Carousel cards={monitoringCards} title="Monitoring Features" onClose={() => setActiveCarousel(null)} />
      )}
      {activeCarousel === "billing" && (
        <Carousel cards={billingCards} title="Billing Features" onClose={() => setActiveCarousel(null)} />
      )}

    </>
  );
}
