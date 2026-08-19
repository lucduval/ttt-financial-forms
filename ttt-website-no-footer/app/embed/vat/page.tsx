import type { Metadata } from "next";
import VatPage from "@/app/(main)/vat/page";

export const metadata: Metadata = { title: "VAT Calculator" };

export default function EmbedVat() {
  return <VatPage noBg noHeader />;
}
