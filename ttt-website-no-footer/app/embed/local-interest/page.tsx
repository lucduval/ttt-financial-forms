import type { Metadata } from "next";
import LocalInterestPage from "@/app/(main)/local-interest/page";

export const metadata: Metadata = { title: "Taxable Local Interest Calculator" };

export default function EmbedLocalInterest() {
  return <LocalInterestPage noBg noHeader />;
}
