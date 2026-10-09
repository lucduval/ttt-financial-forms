"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * "All calculators" link shown at the top of an embedded calculator, but only
 * when the visitor got there from the embedded hub (?from=hub). A calculator
 * embedded on its own WordPress page never shows it.
 */
export default function HubBackLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (searchParams.get("from") !== "hub" || pathname === "/embed/calculators") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">
      <a
        href="/embed/calculators"
        className="inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-[#0077BB] hover:text-[#01527e] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All calculators
      </a>
    </div>
  );
}
