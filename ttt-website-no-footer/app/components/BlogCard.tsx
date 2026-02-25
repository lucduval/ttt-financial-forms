import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

interface BlogCardProps {
  slug: string;
  title: string;
  excerpt: string;
  category?: string;
  date?: string;
  /** Estimated reading time in minutes */
  readingTime?: number;
  imageSrc?: string;
}

export default function BlogCard({
  slug,
  title,
  excerpt,
  category,
  date,
  readingTime,
  imageSrc,
}: BlogCardProps) {
  return (
    <Link
      href={`/newsroom/${slug}`}
      className="group block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077BB] focus-visible:rounded-2xl"
    >
      {/* Cover image */}
      {imageSrc && (
        <div className="w-full h-44 overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      {!imageSrc && (
        <div className="w-full h-2 bg-gradient-to-r from-[#0077BB] to-[#E8872E]" aria-hidden="true" />
      )}

      <div className="p-6 flex flex-col gap-3 h-full">
        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          {category && (
            <span className="inline-block px-2.5 py-1 bg-blue-50 text-[#0077BB] text-xs font-semibold rounded-full">
              {category}
            </span>
          )}
          {readingTime && (
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <Clock size={11} aria-hidden="true" />
              {readingTime} min read
            </span>
          )}
          {date && (
            <span className="text-slate-400 text-xs ml-auto">{date}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-[#0077BB] transition-colors line-clamp-2">
          {title}
        </h3>

        {/* Excerpt */}
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 flex-grow">
          {excerpt}
        </p>

        {/* Read more */}
        <span className="inline-flex items-center gap-1.5 text-[#0077BB] text-sm font-medium mt-2 group-hover:gap-2.5 transition-all">
          Read More
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
