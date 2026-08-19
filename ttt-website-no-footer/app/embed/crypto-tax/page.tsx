import type { Metadata } from "next";
import CryptoTaxPage from "@/app/(main)/crypto-tax/page";

export const metadata: Metadata = { title: "Crypto Tax Calculator" };

export default function EmbedCryptoTax() {
  return <CryptoTaxPage noBg noHeader />;
}
