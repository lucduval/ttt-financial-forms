import Link from "next/link";
import { Phone, Mail, Facebook, Instagram, Linkedin, MapPin } from "lucide-react";
import ContactForm from "./ContactForm";

const offices = [
  {
    city: "Head Office (Durban)",
    address: "Gate 4, Marwick Clock Tower, 1 Lucas Dr, Hillcrest",
    phone: "+27 31 764 7733",
    phoneHref: "+27317647733",
    email: "info@ttt-tax.co.za",
    mapHref: "https://www.google.com/maps/place/1+Lucas+Dr,+Hillcrest",
  },
  {
    city: "Johannesburg",
    address: "Unit 13, The Stables Office Park, Ateljee Road, Randpark Ridge",
    phone: "+27 11 463 0052",
    phoneHref: "+27114630052",
    email: "info@ttt-tax.co.za",
    mapHref: "https://www.google.com/maps/place/The+Stables+Office+Park",
  },
  {
    city: "Cape Town",
    address: "2A Pastorie Park, 17 Reitz Street, Somerset West",
    phone: "+27 21 202 8849",
    phoneHref: "+27212028849",
    email: "info@ttt-tax.co.za",
    mapHref: "https://www.google.com/maps?q=2a+Pastorie+Park+Somerset+West",
  },
  {
    city: "Port Elizabeth",
    address: "14 Geisha Crescent, Kabega Park, Gqeberha",
    phone: "+27 73 509 2319",
    phoneHref: "+27735092319",
    email: "sonja@ttt-tax.co.za",
    mapHref: "https://www.google.com/maps?q=14+Geisha+Crescent+Kabega+Park",
  },
];

const serviceLinks = [
  { label: "Tax Services", href: "/tax-services" },
  { label: "Accounting", href: "/accounting" },
  { label: "Insurance", href: "/insurance" },
  { label: "Financial Planning", href: "/financial-planning" },
  { label: "Registrations", href: "/registrations" },
];

const companyLinks = [
  { label: "About Us", href: "/about-us" },
  { label: "Outreach", href: "/outreach" },
  { label: "Newsroom", href: "/newsroom" },
  { label: "Contact", href: "/contact" },
  { label: "Book Appointment", href: "/book-appointment" },
  { label: "Client Onboarding", href: "/onboarding" },
];

export default function TTTFooter() {
  return (
    <footer>
      {/* ── Pre-footer: Contact form + offices ── */}
      <div className="bg-[#0077BB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

            {/* Contact form */}
            <div className="lg:col-span-3">
              <ContactForm theme="dark" title="GET CUSTOM FINANCIAL ASSISTANCE" />
            </div>

            {/* Office list */}
            <div className="lg:col-span-2">
              <Link
                href="/contact"
                className="inline-flex items-center px-6 py-2 bg-[#E8872E] hover:bg-[#d4771f] text-white text-xs font-bold tracking-widest rounded-sm transition-colors mb-8"
              >
                CONTACT US
              </Link>
              <div className="space-y-7">
                {offices.map((office) => (
                  <div key={office.city}>
                    <h3 className="text-white font-semibold text-sm tracking-wide mb-2.5">
                      {office.city.toUpperCase()}
                    </h3>
                    <div className="space-y-1.5">
                      <a
                        href={`tel:${office.phoneHref}`}
                        className="flex items-center gap-2.5 text-white/60 hover:text-white/90 text-sm transition-colors"
                      >
                        <Phone size={13} className="flex-shrink-0" />
                        {office.phone}
                      </a>
                      <a
                        href={`mailto:${office.email}`}
                        className="flex items-center gap-2.5 text-white/60 hover:text-white/90 text-sm transition-colors"
                      >
                        <Mail size={13} className="flex-shrink-0" />
                        {office.email}
                      </a>
                      <a
                        href={office.mapHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2.5 text-white/60 hover:text-white/90 text-sm transition-colors"
                      >
                        <MapPin size={13} className="flex-shrink-0 mt-0.5" />
                        <span>{office.address}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer nav ── */}
      <div className="bg-[#0168A2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ttt-logo-white.png" alt="TTT Financial Group" className="h-10 w-auto mb-4" />
              <p className="text-white/50 text-sm leading-relaxed max-w-xs">
                Bringing financial clarity to South African families since 2012.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <a
                  href="https://www.facebook.com/TTT.Tax.Services/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#1877F2] flex items-center justify-center text-white transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook size={16} />
                </a>
                <a
                  href="https://www.instagram.com/ttt_financial_services/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-pink-600 flex items-center justify-center text-white transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram size={16} />
                </a>
                <a
                  href="https://www.linkedin.com/company/tax-team-south-africa/about/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#0A66C2] flex items-center justify-center text-white transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={16} />
                </a>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-5">
                Services
              </h4>
              <ul className="space-y-2.5">
                {serviceLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-white/50 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-5">
                Company
              </h4>
              <ul className="space-y-2.5">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-white/50 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick contact */}
            <div>
              <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-5">
                Get In Touch
              </h4>
              <div className="space-y-3">
                <a href="tel:+27104429222" className="flex items-center gap-2.5 text-white/50 hover:text-white text-sm transition-colors">
                  <Phone size={14} className="flex-shrink-0 text-[#E8872E]" />
                  +27 10 442 9222
                </a>
                <a href="mailto:info@ttt-tax.co.za" className="flex items-center gap-2.5 text-white/50 hover:text-white text-sm transition-colors">
                  <Mail size={14} className="flex-shrink-0 text-[#E8872E]" />
                  info@ttt-tax.co.za
                </a>
              </div>
              <Link
                href="/book-appointment"
                className="inline-flex items-center mt-6 px-5 py-2.5 bg-[#E8872E] hover:bg-[#d4771f] text-white text-xs font-bold tracking-widest rounded-sm transition-colors"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
            <p>&copy; {new Date().getFullYear()} TTT Financial Group. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-1">
              {serviceLinks.map((link, i) => (
                <span key={link.label} className="flex items-center">
                  <Link href={link.href} className="hover:text-white/60 transition-colors">
                    {link.label}
                  </Link>
                  {i < serviceLinks.length - 1 && (
                    <span className="mx-2 text-white/15">|</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
