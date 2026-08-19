import type { Metadata } from "next";
import CompanyCarPage from "@/app/(main)/company-car/page";

export const metadata: Metadata = { title: "Company Car Tax Calculator" };

export default function EmbedCompanyCar() {
  return <CompanyCarPage noBg noHeader />;
}
