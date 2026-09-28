import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

const values = [
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    title: "Radical Transparency",
    desc: "We believe teams make better decisions when they can see exactly what's happening — no black boxes, no hidden fees, no surprises.",
    bg: "#eff6ff",
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    title: "Speed Over Perfection",
    desc: "Cloud problems don't wait, and neither do we. We ship fast, iterate faster, and optimize continuously — so your team stays ahead.",
    bg: "#f5f3ff",
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    title: "Built for Engineers",
    desc: "We're engineers ourselves. MyCloudNexus is designed for the people who are paged at 2 AM, not the people who read reports at 9 AM.",
    bg: "#f0fdf4",
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    title: "Security First",
    desc: "Every feature we build starts with a security review. SOC 2 Type II compliance is not a checkbox — it's how we operate every day.",
    bg: "#fffbeb",
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    title: "Customer Obsession",
    desc: "Your cloud is our problem too. Our support team is staffed by engineers who understand your stack and can fix issues — not just escalate them.",
    bg: "#ecfeff",
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    title: "Measurable Impact",
    desc: "We measure success by the money we save you and the incidents we prevent. If MyCloudNexus doesn't pay for itself, we haven't done our job.",
    bg: "#fff1f2",
  },
];

const stats = [
  { value: "500+", label: "Engineering Teams" },
  { value: "₹8Cr+", label: "Cloud Costs Saved" },
  { value: "99.9%", label: "Platform Uptime" },
  { value: "4.9/5", label: "Customer Rating" },
];

const team = [
  { name: "Aniket Singh", role: "Co-Founder & CEO", initials: "AS", gradient: "linear-gradient(135deg,#2563eb,#6366f1)" },
  { name: "Priya Mehta", role: "Co-Founder & CTO", initials: "PM", gradient: "linear-gradient(135deg,#7c3aed,#a78bfa)" },
  { name: "Rahul Verma", role: "Head of Engineering", initials: "RV", gradient: "linear-gradient(135deg,#059669,#34d399)" },
  { name: "Sneha Kapoor", role: "Head of Product", initials: "SK", gradient: "linear-gradient(135deg,#d97706,#fbbf24)" },
];

export default function AboutPage({ onNavigate }) {
  function scrollToContact() {
    onNavigate("home");
    setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 280);
  }

  return (
    <div className="page-wrapper">
      <Navbar onNavigate={onNavigate} currentPage="about" />

      {/* ── Hero ── */}
      <section className="ap-hero">
        <div className="ap-hero-glow ap-glow-1" />
        <div className="ap-hero-glow ap-glow-2" />
        <div className="fp-hero-grid" />
        <div className="section-container ap-hero-inner">
          <div className="page-label">About MyCloudNexus</div>
          <h1 className="ap-hero-title">
            Built by engineers,<br />
            <span className="ap-hero-accent">for engineers</span>
          </h1>
          <p className="ap-hero-desc">
            We started MyCloudNexus because we were tired of paying for cloud infrastructure we didn't understand. Today we help hundreds of engineering teams take back control.
          </p>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="ap-stats-bar">
        {stats.map(({ value, label }) => (
          <div key={label} className="ap-stat-item">
            <div className="ap-stat-value">{value}</div>
            <div className="ap-stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Mission ── */}
      <section className="fp-section fp-section-light">
        <div className="section-container ap-mission-inner">
          <div className="ap-mission-text">
            <div className="fp-section-eyebrow fp-eyebrow-blue">Our Mission</div>
            <h2 className="fp-section-title" style={{ textAlign: "left" }}>Make cloud infrastructure<br />transparent and affordable</h2>
            <p className="ap-mission-desc">
              The average engineering team wastes 32% of their cloud budget on over-provisioned resources, zombie instances, and services nobody remembers enabling. Meanwhile, outages happen because nobody could see the warning signs.
            </p>
            <p className="ap-mission-desc">
              MyCloudNexus was built to fix both problems — giving teams complete observability over their infrastructure and the AI-powered intelligence to eliminate wasteful spending, all from one unified platform.
            </p>
            <button className="btn btn-primary btn-lg" style={{ marginTop: 8 }} onClick={() => onNavigate("features")}>
              Explore Features <ArrowRight />
            </button>
          </div>
          <div className="ap-mission-visual">
            <div className="ap-mission-card">
              <div className="ap-mission-card-header">
                <div className="hm-dots"><i /><i /><i /></div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>MyCloudNexus Impact</span>
              </div>
              <div className="ap-mission-card-body">
                {[
                  { label: "Avg cost reduction", value: "35%", color: "#16a34a" },
                  { label: "MTTR improvement", value: "60%", color: "#2563eb" },
                  { label: "Alert false-positive drop", value: "80%", color: "#7c3aed" },
                  { label: "Onboarding time", value: "< 1 day", color: "#d97706" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="ap-metric-row">
                    <span className="ap-metric-label">{label}</span>
                    <span className="ap-metric-value" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="fp-section fp-section-alt">
        <div className="section-container">
          <div className="fp-section-header">
            <div className="fp-section-eyebrow fp-eyebrow-blue">Our Values</div>
            <h2 className="fp-section-title">The principles we build on</h2>
            <p className="fp-section-desc">These aren't just words on a wall — they're the lens through which every product decision gets made.</p>
          </div>
          <div className="ap-values-grid">
            {values.map(({ title, desc, icon, bg }) => (
              <div key={title} className="ap-value-card">
                <div className="ap-value-icon" style={{ background: bg }}>{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="fp-section fp-section-light">
        <div className="section-container">
          <div className="fp-section-header">
            <div className="fp-section-eyebrow fp-eyebrow-blue">The Team</div>
            <h2 className="fp-section-title">The people behind MyCloudNexus</h2>
            <p className="fp-section-desc">A small, focused team of engineers and product people who've worked at some of the world's largest cloud environments.</p>
          </div>
          <div className="ap-team-grid">
            {team.map(({ name, role, initials, gradient }) => (
              <div key={name} className="ap-team-card">
                <div className="ap-team-avatar" style={{ background: gradient }}>
                  <span>{initials}</span>
                </div>
                <div className="ap-team-name">{name}</div>
                <div className="ap-team-role">{role}</div>
                <div className="ap-team-social">
                  <a href="#" className="sf-social-link">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                  </a>
                  <a href="#" className="sf-social-link">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hiring banner ── */}
      <section className="ap-hiring-section">
        <div className="section-container">
          <div className="ap-hiring-card">
            <div className="ap-hiring-left">
              <div className="ap-hiring-tag">We're hiring</div>
              <h3>Join us in building the future of cloud operations</h3>
              <p>We're a remote-first team looking for engineers, designers, and product thinkers who want to work on hard problems.</p>
            </div>
            <button className="btn btn-primary btn-lg ap-hiring-btn" onClick={scrollToContact}>
              Get in Touch <ArrowRight />
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="fp-cta-section">
        <div className="section-container">
          <div className="fp-cta-card">
            <div className="fp-cta-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            </div>
            <h2>See MyCloudNexus in action</h2>
            <p>Book a personalized demo and see how MyCloudNexus can transform your cloud operations.</p>
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
