import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

const footerCols: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Creators",
    links: [
      { label: "Upload", to: "/upload" },
      { label: "Start Collection", to: "/create-gallery" },
      { label: "Boards", to: "/boards" },
      { label: "Earn", to: "/affiliates" },
      { label: "Prompt Packs", to: "/prompts" },
    ],
  },
  {
    title: "Topics",
    links: [
      { label: "Cyberpunk", to: "/topic/cyberpunk" },
      { label: "Luxury Homes", to: "/topic/luxury-homes" },
      { label: "Dreamscapes", to: "/topic/dreamscapes" },
      { label: "AI Avatars", to: "/topic/ai-avatars" },
      { label: "All Topics", to: "/explore" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "License", to: "/license" },
      { label: "Blog", to: "/blog" },
      { label: "REAL CREATOR", to: "/real-creator" },
    ],
  },
];

const Footer = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const sync = () => {
      try { setIsLoggedIn(localStorage.getItem("ra_auth") === "1"); } catch {}
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("ra_auth_changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("ra_auth_changed", sync);
    };
  }, []);

  // Hide the footer entirely for logged-in users
  if (isLoggedIn) return null;

  return (
    <footer className="bg-foreground px-6 md:px-12 pt-14 pb-8">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-[52px]">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3.5">
              <Logo to="/" />
            </div>
            <p className="text-[0.8rem] text-primary-foreground/30 leading-[1.7] max-w-[240px]">
              The world's largest free visual library. Download, share, and create — no strings attached.
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <h5 className="text-[0.65rem] font-bold tracking-[0.14em] uppercase text-primary-foreground/[0.22] mb-4">{col.title}</h5>
              {col.links.map((link) => (
                <Link key={link.label} to={link.to} className="block text-[0.82rem] text-primary-foreground/[0.48] no-underline mb-[9px] hover:text-primary-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-primary-foreground/[0.07] pt-5 flex justify-between items-center flex-wrap gap-4">
          <div className="text-[0.75rem] text-primary-foreground/20">© 2026 REAL CREATOR</div>
          <div className="flex gap-5">
            {[
              { label: "Privacy", to: "/privacy" },
              { label: "Terms", to: "/terms" },
              { label: "License", to: "/license" },
            ].map((l) => (
              <Link key={l.label} to={l.to} className="text-[0.75rem] text-primary-foreground/20 no-underline hover:text-primary-foreground/50 transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;