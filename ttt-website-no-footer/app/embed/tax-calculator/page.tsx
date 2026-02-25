import type { Metadata } from "next";
import TaxCalculatorPage from "@/app/(main)/tax-calculator/page";

export const metadata: Metadata = {
  title: "PAYE Tax Calculator",
};

export default function EmbedTaxCalculator() {
  return <TaxCalculatorPage />;
}
