import type { Metadata } from "next";
import SmallBusinessIncomeTaxPage from "@/app/(main)/small-business-income-tax/page";

export const metadata: Metadata = { title: "Small Business Income Tax Calculator" };

export default function EmbedSmallBusinessIncomeTax() {
  return <SmallBusinessIncomeTaxPage noBg noHeader />;
}
