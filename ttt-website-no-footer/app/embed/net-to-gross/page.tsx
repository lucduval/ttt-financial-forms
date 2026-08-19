import type { Metadata } from "next";
import NetToGrossPage from "@/app/(main)/net-to-gross/page";

export const metadata: Metadata = { title: "Net to Gross Salary Calculator" };

export default function EmbedNetToGross() {
  return <NetToGrossPage noBg noHeader />;
}
