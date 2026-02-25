"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface CTAButton {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
}

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctas?: CTAButton[];
  /** Swap the gradient direction/colours for variety */
  variant?: "blue" | "navy" | "light";
  /** Optional background photo URL — a blue overlay is applied on top */
  backgroundImage?: string;
}

const gradients = {
  blue:  "from-[#0077BB] via-[#0077BB] to-[#0168A2]",
  navy:  "from-[#0168A2] via-[#01527e] to-[#0077BB]",
  light: "from-[#f0f7ff] via-white to-[#f8fafc]",
};

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  ctas = [],
  variant = "blue",
  backgroundImage,
}: PageHeroProps) {
  const isLight = variant === "light";

  const bgStyle = backgroundImage
    ? {
        backgroundImage: `
          linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.42) 100%),
          url('${backgroundImage}')
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div
      className={`relative overflow-hidden ${!backgroundImage ? `bg-gradient-to-br ${gradients[variant]}` : ""}`}
      style={bgStyle}
    >
      {/* Decorative orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl ${
            isLight ? "bg-blue-100/60" : "bg-white/5"
          }`}
        />
        <div
          className={`absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl ${
            isLight ? "bg-orange-50/80" : "bg-[#E8872E]/10"
          }`}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-3xl"
        >
          {eyebrow && (
            <p
              className={`text-xs sm:text-sm font-bold tracking-widest uppercase mb-4 ${
                isLight ? "text-[#E8872E]" : "text-[#E8872E]"
              }`}
            >
              {eyebrow}
            </p>
          )}

          <h1
            className={`text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              className={`text-lg sm:text-xl leading-relaxed mb-8 max-w-2xl ${
                isLight ? "text-slate-600" : "text-white/70"
              }`}
            >
              {subtitle}
            </p>
          )}

          {ctas.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4">
              {ctas.map((cta) => (
                <Link
                  key={cta.label}
                  href={cta.href}
                  className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 transform ${
                    cta.variant === "secondary"
                      ? isLight
                        ? "bg-transparent border-2 border-slate-300 text-slate-700 hover:border-slate-400"
                        : "bg-white/10 border border-white/30 text-white hover:bg-white/20"
                      : "bg-[#E8872E] hover:bg-[#d4771f] text-white shadow-lg shadow-orange-900/20"
                  }`}
                >
                  {cta.label}
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
