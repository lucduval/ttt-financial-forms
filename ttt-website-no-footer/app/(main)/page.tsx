import Link from "next/link";

export default function Home() {
  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-[calc(100vh-160px)] text-center px-4 py-24 overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.42) 100%),
          url('https://ttt-tax.co.za/wp-content/uploads/2021/11/accounting-banner.jpg')
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* No decorative orb needed — real photo provides depth */}

      <div className="relative max-w-4xl mx-auto">
        <h1
          className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight uppercase tracking-wide"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.4)" }}
        >
          Bringing Financial Clarity to South African Families
        </h1>
        <p
          className="text-base sm:text-lg text-white max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
        >
          As fellow South Africans, we at TTT Financial Group understand the challenges our families face.
          We aspire to provide South African families with the freedom to choose, live stress-free, and
          create lasting memories through clear, trustworthy, and sustainable financial guidance. By
          offering expert tax, accounting, insurance, and investment services, we empower you to take
          control of your future with confidence and peace of mind.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/book-appointment"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-[#E8872E] hover:bg-[#d4771f] text-white font-semibold rounded transition-all shadow-lg text-sm uppercase tracking-wide"
          >
            Book a Free Consultation
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-transparent hover:bg-white/10 text-white font-semibold rounded transition-all border-2 border-white text-sm uppercase tracking-wide"
          >
            Client Onboarding
          </Link>
        </div>

        {/* Stats strip */}
        <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-12 border-t border-white/20 pt-10">
          {[
            { value: "16,000+", label: "Families Assisted" },
            { value: "70+",     label: "Staff & Consultants" },
            { value: "4",       label: "Office Locations" },
            { value: "Est. 2012", label: "Trusted Since" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-xs sm:text-sm text-white/65 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
