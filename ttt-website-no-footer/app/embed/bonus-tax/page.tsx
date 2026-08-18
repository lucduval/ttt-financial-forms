import type { Metadata } from "next";
import BonusTaxPage from "@/app/(main)/bonus-tax/page";

export const metadata: Metadata = {
  title: "Bonus Tax Calculator",
};

export default function EmbedBonusTax() {
  return <BonusTaxPage noBg noHeader />;
}
