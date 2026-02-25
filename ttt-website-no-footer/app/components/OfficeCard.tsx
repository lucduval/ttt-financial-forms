import { Phone, Mail, MapPin, ExternalLink } from "lucide-react";

interface OfficeCardProps {
  city: string;
  address: string;
  phone: string;
  phoneHref: string;
  email: string;
  mapHref: string;
  isHeadOffice?: boolean;
}

export default function OfficeCard({
  city,
  address,
  phone,
  phoneHref,
  email,
  mapHref,
  isHeadOffice = false,
}: OfficeCardProps) {
  return (
    <div
      className={`rounded-2xl border p-6 flex flex-col gap-4 ${
        isHeadOffice
          ? "border-[#0077BB]/30 bg-blue-50/50"
          : "border-slate-100 bg-white"
      } shadow-sm`}
    >
      {/* City */}
      <div>
        {isHeadOffice && (
          <span className="inline-block mb-2 text-xs font-bold px-2.5 py-1 bg-[#0077BB] text-white rounded-full">
            Head Office
          </span>
        )}
        <h3 className="font-semibold text-slate-900 text-base">{city}</h3>
      </div>

      {/* Details */}
      <div className="space-y-2.5">
        <a
          href={`tel:${phoneHref}`}
          className="flex items-center gap-2.5 text-slate-600 hover:text-[#0077BB] text-sm transition-colors"
        >
          <Phone size={14} className="text-[#0077BB] flex-shrink-0" aria-hidden="true" />
          {phone}
        </a>
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-2.5 text-slate-600 hover:text-[#0077BB] text-sm transition-colors"
        >
          <Mail size={14} className="text-[#0077BB] flex-shrink-0" aria-hidden="true" />
          {email}
        </a>
        <div className="flex items-start gap-2.5 text-slate-600 text-sm">
          <MapPin size={14} className="text-[#0077BB] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span className="leading-relaxed">{address}</span>
        </div>
      </div>

      <a
        href={mapHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[#0077BB] text-xs font-semibold hover:text-[#0168A2] transition-colors mt-auto"
      >
        View on Maps
        <ExternalLink size={11} aria-hidden="true" />
      </a>
    </div>
  );
}
