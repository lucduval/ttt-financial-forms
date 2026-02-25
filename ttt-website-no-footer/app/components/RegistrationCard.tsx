import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface RegistrationCardProps {
  slug: string;
  title: string;
  description: string;
}

export default function RegistrationCard({ slug, title, description }: RegistrationCardProps) {
  return (
    <Link
      href={`/registrations/${slug}`}
      className="group flex flex-col gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#0077BB]/20 hover:-translate-y-0.5 transition-all duration-300 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077BB] focus-visible:rounded-2xl"
    >
      {/* Top accent line */}
      <div className="w-8 h-0.5 bg-[#E8872E] rounded-full" aria-hidden="true" />

      <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-[#0077BB] transition-colors">
        {title}
      </h3>
      <p className="text-slate-500 text-xs leading-relaxed flex-grow">{description}</p>
      <span className="inline-flex items-center gap-1.5 text-[#0077BB] text-xs font-semibold mt-auto group-hover:gap-2 transition-all">
        More Info
        <ArrowRight size={12} aria-hidden="true" />
      </span>
    </Link>
  );
}
