import type { Metadata } from "next";
import TaxBracketPage from "@/app/(main)/tax-bracket/page";

export const metadata: Metadata = {
  title: "Tax Bracket Calculator",
};

export default function EmbedTaxBracket() {
  return <TaxBracketPage noBg noHeader />;
}
