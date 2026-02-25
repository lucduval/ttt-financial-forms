"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Phone, ChevronDown, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "HOME", href: "/" },
  { label: "ABOUT US", href: "/about-us" },
  {
    label: "SERVICES",
    href: "#",
    children: [
      { label: "Tax Services", href: "/tax-services" },
      { label: "Insurance", href: "/insurance" },
      { label: "Financial Planning", href: "/financial-planning" },
      { label: "Accounting", href: "/accounting" },
      { label: "Registrations", href: "/registrations" },
    ],
  },
  { label: "OUTREACH", href: "/outreach" },
  { label: "TAX CALCULATOR", href: "/tax-calculator" },
  { label: "CONTACT", href: "/contact" },
  { label: "NEWSROOM", href: "/newsroom" },
];

const SocialIcon = ({ href, label, children }: { href: string; label: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
  >
    {children}
  </a>
);

export default function TTTHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => {
    setMobileMenuOpen(false);
    setServicesOpen(false);
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => {
    if (href === "/" || href === "#") return pathname === "/";
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <header className="sticky top-0 z-50">
      {/* ── Top Utility Bar ── */}
      <div className="bg-[#0168A2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9">
          {/* Social icons */}
          <div className="flex items-center gap-2">
            <SocialIcon href="https://www.facebook.com/TTT.Tax.Services/" label="Facebook">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </SocialIcon>
            <SocialIcon href="https://www.instagram.com/ttt_financial_services/" label="Instagram">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </SocialIcon>
            <SocialIcon href="https://www.linkedin.com/company/tax-team-south-africa/about/" label="LinkedIn">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </SocialIcon>
          </div>

          {/* Contact info */}
          <div className="hidden sm:flex items-center gap-4 text-white/60 text-xs">
            <a href="mailto:info@ttt-tax.co.za" className="flex items-center gap-1.5 hover:text-white/90 transition-colors">
              <Mail size={11} />
              <span>info@ttt-tax.co.za</span>
            </a>
            <span className="text-white/20">|</span>
            <a href="tel:+27104429222" className="flex items-center gap-1.5 hover:text-white/90 transition-colors">
              <Phone size={11} />
              <span>+27 10 442 9222</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Nav Bar ── */}
      <div className={`bg-[#0077BB] transition-shadow duration-300 ${scrolled ? "shadow-lg shadow-black/30" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0" aria-label="TTT Financial Group home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ttt-logo-white.png" alt="TTT Financial Group" className="h-10 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
            {navLinks.map((link) =>
              link.children ? (
                <div key={link.label} className="relative group">
                  <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors tracking-wide">
                    {link.label}
                    <ChevronDown size={13} className="mt-0.5 transition-transform duration-200 group-hover:rotate-180" />
                  </button>
                  {/* Dropdown */}
                  <div className="absolute top-full left-0 pt-2 hidden group-hover:block z-50 min-w-[200px]">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-100 py-2 overflow-hidden">
                      {link.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className={`block px-4 py-2.5 text-sm transition-colors ${
                            isActive(child.href)
                              ? "text-[#0077BB] bg-blue-50 font-semibold"
                              : "text-slate-700 hover:bg-slate-50 hover:text-[#0077BB]"
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium tracking-wide rounded-lg transition-colors ${
                    isActive(link.href)
                      ? "text-white bg-white/15"
                      : "text-white/85 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-[#E8872E] rounded-full" />
                  )}
                </Link>
              )
            )}
          </nav>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-3">
            <Link
              href="/book-appointment"
              className="hidden sm:inline-flex items-center px-5 py-2 bg-[#E8872E] hover:bg-[#d4771f] text-white text-sm font-semibold rounded-full transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 transform"
            >
              Free Consultation
            </Link>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors w-11 h-11 flex items-center justify-center"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={closeMenu}
              aria-hidden="true"
            />
            {/* Drawer panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="lg:hidden fixed top-0 right-0 bottom-0 w-80 max-w-[90vw] bg-white z-50 shadow-2xl flex flex-col overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {/* Drawer header with blue strip */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-[#0077BB] flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ttt-logo-white.png" alt="TTT Financial Group" className="h-8 w-auto" />
                <button
                  onClick={closeMenu}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer nav links — link clicks bubble up to close the menu */}
              <nav className="flex-grow p-4 space-y-1" aria-label="Mobile navigation" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) closeMenu(); }}>
                {navLinks.map((link) => (
                  <div key={link.label}>
                    {link.children ? (
                      <>
                        <button
                          onClick={() => setServicesOpen((v) => !v)}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 rounded-xl transition-colors min-h-[44px]"
                          aria-expanded={servicesOpen}
                        >
                          {link.label}
                          <ChevronDown
                            size={15}
                            className={`text-slate-400 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        <AnimatePresence>
                          {servicesOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="pl-3 py-1 space-y-0.5">
                                {link.children.map((child) => (
                                  <Link
                                    key={child.label}
                                    href={child.href}
                                    className={`flex items-center px-4 py-2.5 text-sm rounded-xl transition-colors min-h-[44px] ${
                                      isActive(child.href)
                                        ? "text-[#0077BB] bg-blue-50 font-semibold"
                                        : "text-slate-600 hover:text-[#0077BB] hover:bg-blue-50"
                                    }`}
                                  >
                                    {child.label}
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <Link
                        href={link.href}
                        className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors min-h-[44px] ${
                          isActive(link.href)
                            ? "text-[#0077BB] bg-blue-50"
                            : "text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {link.label}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>

              {/* Drawer footer */}
              <div className="p-4 border-t border-slate-100 space-y-3 flex-shrink-0">
                <Link
                  href="/book-appointment"
                  className="flex items-center justify-center px-5 py-3 bg-[#E8872E] hover:bg-[#d4771f] text-white text-sm font-semibold rounded-full transition-colors min-h-[44px]"
                >
                  Free Consultation
                </Link>
                <div className="flex flex-col gap-1">
                  <a
                    href="mailto:info@ttt-tax.co.za"
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-500 hover:text-[#0077BB] rounded-lg transition-colors min-h-[44px]"
                  >
                    <Mail size={15} className="text-[#0077BB] flex-shrink-0" />
                    info@ttt-tax.co.za
                  </a>
                  <a
                    href="tel:+27104429222"
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-500 hover:text-[#0077BB] rounded-lg transition-colors min-h-[44px]"
                  >
                    <Phone size={15} className="text-[#0077BB] flex-shrink-0" />
                    +27 10 442 9222
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
