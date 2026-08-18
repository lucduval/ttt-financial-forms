import type { Metadata } from "next";
import RetrenchmentTaxPage from "@/app/(main)/retrenchment-tax/page";

export const metadata: Metadata = {
  title: "Retrenchment Tax Calculator",
};

export default function EmbedRetrenchmentTax() {
  return <RetrenchmentTaxPage noBg noHeader />;
}
