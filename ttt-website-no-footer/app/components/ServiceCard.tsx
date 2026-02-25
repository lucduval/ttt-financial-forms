import Link from "next/link";
import { type LucideIcon, ArrowRight } from "lucide-react";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  /** Accent colour class for the icon background gradient */
  accent?: "blue" | "orange" | "navy";
}

const accents = {
  blue:   "from-[#0077BB] to-[#0168A2]",
  orange: "from-[#E8872E] to-[#d4771f]",
  navy:   "from-[#0A1628] to-[#0077BB]",
};

export default function ServiceCard({
  icon: Icon,
  title,
  description,
  href,
  ctaLabel = "Learn More",
  accent = "blue",
}: ServiceCardProps) {
  const content = (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col gap-4 h-full">
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accents[accent]} flex items-center justify-center flex-shrink-0`}
      >
        <Icon size={22} className="text-white" aria-hidden="true" />
      </div>

      {/* Text */}
      <div className="flex-grow">
        <h3 className="font-semibold text-slate-900 text-lg mb-2 leading-snug">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>

      {/* CTA */}
      {href && (
        <span className="inline-flex items-center gap-1.5 text-[#0077BB] text-sm font-medium group-hover:text-[#0168A2] transition-colors mt-auto">
          {ctaLabel}
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077BB] rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}
