import type { Metadata } from "next";
import ProvisionalTaxpayerCheckPage from "@/app/(main)/provisional-taxpayer-check/page";

export const metadata: Metadata = { title: "Provisional Taxpayer Check" };

export default function EmbedProvisionalTaxpayerCheck() {
  return <ProvisionalTaxpayerCheckPage noBg noHeader />;
}
