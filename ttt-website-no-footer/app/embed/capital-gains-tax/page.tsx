import type { Metadata } from "next";
import CapitalGainsTaxPage from "@/app/(main)/capital-gains-tax/page";

export const metadata: Metadata = {
  title: "Capital Gains Tax Calculator",
};

export default function EmbedCapitalGainsTax() {
  return <CapitalGainsTaxPage noBg noHeader />;
}
