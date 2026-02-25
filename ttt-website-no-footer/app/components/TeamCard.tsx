interface TeamCardProps {
  name: string;
  title: string;
  imageSrc?: string;
  /** Shown when no image is available */
  initials?: string;
}

export default function TeamCard({ name, title, imageSrc, initials }: TeamCardProps) {
  const derivedInitials =
    initials ??
    name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <div className="group text-center">
      {/* Avatar */}
      <div className="relative mx-auto mb-4 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-md ring-2 ring-white ring-offset-2 ring-offset-slate-50 transition-shadow group-hover:shadow-xl">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0077BB] to-[#0A1628] flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{derivedInitials}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="font-semibold text-slate-900 text-base leading-snug">{name}</h3>
      <p className="text-[#0077BB] text-sm mt-0.5 leading-snug">{title}</p>
    </div>
  );
}
