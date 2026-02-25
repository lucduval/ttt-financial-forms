interface ValueCardProps {
  number: string | number;
  title: string;
  description: string;
}

export default function ValueCard({ number, title, description }: ValueCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex gap-5 overflow-hidden">
      {/* Left accent border */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#0077BB] to-[#E8872E] rounded-l-2xl" />

      {/* Number */}
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#0077BB]/10 to-[#0077BB]/5 flex items-center justify-center">
        <span className="text-xl font-bold text-[#0077BB]">
          {String(number).padStart(2, "0")}
        </span>
      </div>

      {/* Content */}
      <div>
        <h3 className="font-semibold text-slate-900 text-base mb-1.5 leading-snug">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
