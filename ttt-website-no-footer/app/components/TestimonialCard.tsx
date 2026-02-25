interface TestimonialCardProps {
  quote: string;
  name: string;
  /** e.g. "New Vehicle Sales Manager" */
  role: string;
  /** e.g. "Mini" */
  company?: string;
  imageSrc?: string;
}

export default function TestimonialCard({ quote, name, role, company, imageSrc }: TestimonialCardProps) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7 flex flex-col gap-5 h-full">
      {/* Large quote mark */}
      <div className="text-5xl font-serif leading-none text-[#0077BB]/15 select-none" aria-hidden="true">
        &ldquo;
      </div>

      {/* Stars */}
      <div className="flex gap-1 -mt-3" aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#E8872E" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-slate-600 text-sm leading-relaxed flex-grow">
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-50">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0077BB] to-[#0A1628] flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-900 leading-tight">{name}</p>
          <p className="text-xs text-slate-400 leading-tight mt-0.5">
            {role}{company ? `, ${company}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
