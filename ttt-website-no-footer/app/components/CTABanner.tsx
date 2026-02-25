import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface CTAButton {
  label: string;
  href: string;
  variant?: "primary" | "outline";
}

interface CTABannerProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  buttons?: CTAButton[];
}

export default function CTABanner({
  eyebrow,
  title,
  subtitle,
  buttons = [
    { label: "Book a Free Consultation", href: "/book-appointment", variant: "primary" },
  ],
}: CTABannerProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0168A2 0%, #0077BB 100%)" }}
    >
      {/* Decorative orb */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        {eyebrow && (
          <p className="text-xs font-bold tracking-widest text-[#E8872E] uppercase mb-3">
            {eyebrow}
          </p>
        )}

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
          {title}
        </h2>

        {subtitle && (
          <p className="text-white/65 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {subtitle}
          </p>
        )}

        {!subtitle && <div className="mb-8" />}

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {buttons.map((btn) => (
            <Link
              key={btn.label}
              href={btn.href}
              className={`inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 transform ${
                btn.variant === "outline"
                  ? "border border-white/40 text-white hover:bg-white/10"
                  : "bg-[#E8872E] hover:bg-[#d4771f] text-white shadow-lg shadow-black/20"
              }`}
            >
              {btn.label}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
