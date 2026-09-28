import { useEffect } from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

/* ── Icons ── */
const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

const monitoringFeatures = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
    title: "Real-Time Metrics",
    desc: "Monitor CPU, memory, disk I/O, and network stats across all your servers in real time with sub-second granularity.",
    color: "#eff6ff",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
    title: "Intelligent Alerts",
    desc: "AI-driven anomaly detection sends alerts before issues escalate. Configure severity levels, escalation policies, and on-call rotations.",
    color: "#eff6ff",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    title: "Multi-Region Coverage",
    desc: "Track infrastructure across AWS, GCP, Azure, and hybrid environments from a single unified view with global latency maps.",
    color: "#eff6ff",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>,
    title: "Custom Dashboards",
    desc: "Build drag-and-drop dashboards with 40+ widget types. Share read-only views with stakeholders without granting full access.",
    color: "#eff6ff",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
    title: "Service Dependency Maps",
    desc: "Automatically trace service dependencies across your stack. Instantly visualize which service is causing downstream failures.",
    color: "#eff6ff",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    title: "Incident Timeline & Reports",
    desc: "Every alert, escalation, and resolution is recorded in a searchable incident timeline. Export PDF post-mortems in one click.",
    color: "#eff6ff",
  },
];

const billingFeatures = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8"/><path d="M12 18V6"/></svg>,
    title: "Cost Overview Dashboard",
    desc: "See your total cloud spend at a glance — broken down by service, region, team, or project with month-over-month comparisons.",
    color: "#f0fdf4",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    title: "AI Cost Forecasting",
    desc: "ML models trained on your usage patterns project spend 90 days ahead with confidence intervals and proactive budget alerts.",
    color: "#f0fdf4",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    title: "Invoice Management",
    desc: "All invoices in one place with payment status tracking, one-click PDF downloads, and automated payment reminders.",
    color: "#f0fdf4",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    title: "Right-Sizing Recommendations",
    desc: "Identify over-provisioned instances and idle resources. Our AI optimizer surfaces actionable right-sizing suggestions that cut waste by up to 35%.",
    color: "#f0fdf4",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    title: "Team & Project Allocation",
    desc: "Tag resources to teams and projects for granular cost attribution. Generate per-team reports for accurate internal chargebacks.",
    color: "#f0fdf4",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    title: "Multi-Cloud Aggregation",
    desc: "Pull billing data from AWS Cost Explorer, GCP Billing, and Azure Cost Management into one normalized, deduplicated view.",
    color: "#f0fdf4",
  },
];

const integrations = [
  { name: "AWS", color: "#FF9900" },
  { name: "Google Cloud", color: "#4285F4" },
  { name: "Microsoft Azure", color: "#0078D4" },
  { name: "Slack", color: "#4A154B" },
  { name: "PagerDuty", color: "#06AC38" },
  { name: "Datadog", color: "#632CA6" },
  { name: "Terraform", color: "#7B42BC" },
  { name: "Kubernetes", color: "#326CE5" },
  { name: "Prometheus", color: "#E6522C" },
  { name: "Grafana", color: "#F46800" },
  { name: "GitHub Actions", color: "#24292F" },
  { name: "Jira", color: "#0052CC" },
];

const highlights = [
  { value: "99.9%", label: "Platform Uptime SLA" },
  { value: "<30s", label: "Alert Delivery Time" },
  { value: "35%", label: "Avg Cost Savings" },
  { value: "500+", label: "Happy Customers" },
];

export default function FeaturesPage({ onNavigate }) {
  useEffect(() => {
    const els = document.querySelectorAll('.fp-reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('fp-visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  function scrollToContact() {
    onNavigate("home");
    setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 280);
  }

  return (
    <div className="page-wrapper">
      <Navbar onNavigate={onNavigate} currentPage="features" />

      {/* ── Hero ── */}
      <section className="fp-hero">
        <div className="fp-hero-glow fp-hero-glow-1" />
        <div className="fp-hero-glow fp-hero-glow-2" />
        <div className="fp-hero-glow fp-hero-glow-3" />
        <div className="fp-hero-grid" />
        <div className="section-container fp-hero-inner">
          <div className="page-label">Platform Features</div>
          <h1 className="fp-hero-title">
            Everything you need to<br />
            <span className="fp-hero-accent">monitor and optimize</span><br />
            your cloud
          </h1>
          <p className="fp-hero-desc">
            Two powerful modules — infrastructure monitoring and cost intelligence — unified into one platform built for modern engineering teams.
          </p>
          <div className="fp-hero-actions">
            <button className="btn btn-primary btn-xl" onClick={scrollToContact}>Book a Demo</button>
            <button className="btn fp-ghost-btn btn-xl" onClick={() => onNavigate("pricing")}>See Pricing <ArrowRight /></button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="fp-stats-bar">
        {highlights.map(({ value, label }) => (
          <div key={label} className="fp-stat-item">
            <div className="fp-stat-value">{value}</div>
            <div className="fp-stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Monitoring Features ── */}
      <section className="fp-section fp-section-light fp-section-monitoring">
        <div className="section-container">
          <div className="fp-section-header fp-reveal">
            <div className="fp-section-eyebrow fp-eyebrow-blue">Monitoring Module</div>
            <h2 className="fp-section-title">Full-stack infrastructure<br />visibility in real time</h2>
            <p className="fp-section-desc">From bare metal to serverless, MyCloudNexus gives you complete observability across your entire stack.</p>
          </div>
          <div className="fp-feature-grid fp-reveal fp-reveal-d1">
            {monitoringFeatures.map((f) => (
              <div key={f.title} className="fp-feature-card fp-card-blue">
                <div className="fp-feature-icon" style={{ background: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Billing Features ── */}
      <section className="fp-section fp-section-alt fp-section-billing">
        <div className="section-container">
          <div className="fp-section-header fp-reveal">
            <div className="fp-section-eyebrow fp-eyebrow-green">Billing Module</div>
            <h2 className="fp-section-title">Cloud cost intelligence<br />that pays for itself</h2>
            <p className="fp-section-desc">Stop guessing. Start optimizing. Our billing module brings AI-driven clarity to every dollar you spend on cloud infrastructure.</p>
          </div>
          <div className="fp-feature-grid fp-reveal fp-reveal-d1">
            {billingFeatures.map((f) => (
              <div key={f.title} className="fp-feature-card fp-card-green">
                <div className="fp-feature-icon" style={{ background: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="fp-section fp-section-light fp-integrations-section">
        <div className="section-container">
          <div className="fp-section-header fp-reveal">
            <div className="fp-section-eyebrow fp-eyebrow-blue">Integrations</div>
            <h2 className="fp-section-title">Works with your<br />existing stack</h2>
            <p className="fp-section-desc">Native integrations with the tools your team already uses. Set up in minutes, not days.</p>
          </div>
          <div className="fp-integrations-grid fp-reveal fp-reveal-d1">
            {integrations.map(({ name, color }) => (
              <div key={name} className="fp-integration-badge">
                <div className="fp-integration-dot" style={{ background: color }} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature checklist comparison ── */}
      <section className="fp-section fp-section-dark">
        <div className="section-container">
          <div className="fp-section-header fp-dark-header fp-reveal">
            <div className="fp-section-eyebrow fp-eyebrow-light">What's Included</div>
            <h2 className="fp-section-title fp-title-white">All the essentials,<br />none of the bloat</h2>
          </div>
          <div className="fp-checklist-grid fp-reveal fp-reveal-d1">
            {[
              "Real-time metrics & dashboards",
              "AI anomaly detection & alerting",
              "Multi-cloud cost aggregation",
              "Budget forecasting (90-day)",
              "Invoice management & downloads",
              "Team & project cost attribution",
              "Right-sizing recommendations",
              "Service dependency mapping",
              "Custom alert escalation policies",
              "Role-based access control",
              "REST API & webhook support",
              "SOC 2 Type II compliant",
            ].map(item => (
              <div key={item} className="fp-checklist-item">
                <div className="fp-check-circle"><CheckIcon /></div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="fp-cta-section">
        <div className="section-container">
          <div className="fp-cta-card fp-reveal">
            <div className="fp-cta-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            </div>
            <h2>Ready to take control of your cloud?</h2>
            <p>See MyCloudNexus in action with a free personalized demo for your team.</p>
            <div className="fp-cta-btns">
              <button className="btn btn-primary btn-xl" onClick={scrollToContact}>Book a Free Demo</button>
              <button className="btn btn-secondary btn-xl" onClick={() => onNavigate("pricing")}>View Pricing</button>
            </div>
          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
