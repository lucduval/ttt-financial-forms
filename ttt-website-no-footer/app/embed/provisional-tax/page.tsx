import type { Metadata } from "next";
import ProvisionalTaxPage from "@/app/(main)/provisional-tax/page";

export const metadata: Metadata = { title: "Provisional Tax Calculator" };

export default function EmbedProvisionalTax() {
  return <ProvisionalTaxPage noBg noHeader />;
}
