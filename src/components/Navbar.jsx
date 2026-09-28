import { useState, useEffect } from "react";

const CloudIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
  </svg>
);

export default function Navbar({ onNavigate, currentPage = "home" }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [currentPage]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function goContact() {
    if (currentPage === "home") {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    } else {
      onNavigate("home");
      setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 250);
    }
    setMobileOpen(false);
  }

  const links = [
    { label: "Pricing",   action: () => onNavigate("pricing") },
{ label: "Contact",   action: goContact },
  ];

  return (
    <>
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-container">
          <button className="logo" onClick={() => onNavigate("home")}>
            <div className="logo-icon"><CloudIcon /></div>
            MyCloud<span>Nexus</span>
          </button>

          <div className="nav-links">
            {links.map(({ label, action }) => (
              <button
                key={label}
                className={`nav-link-btn${currentPage === label.toLowerCase() ? " nav-link-active" : ""}`}
                onClick={action}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="nav-actions">
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate("auth:login")}>Login</button>
            <button
              className="hamburger-btn"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              }
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div className={`mobile-nav ${mobileOpen ? "mobile-nav-open" : ""}`}>
          <div className="mobile-nav-inner">
            {links.map(({ label, action }) => (
              <button key={label} className="mobile-nav-item" onClick={() => { action(); setMobileOpen(false); }}>
                {label}
              </button>
            ))}
            <div className="mobile-nav-divider" />
            <button className="btn btn-primary btn-md mobile-nav-cta" onClick={() => { onNavigate("auth:login"); setMobileOpen(false); }}>
              Login to Dashboard
            </button>
          </div>
        </div>
      </nav>
      {mobileOpen && <div className="mobile-nav-backdrop" onClick={() => setMobileOpen(false)} />}
    </>
  );
}
