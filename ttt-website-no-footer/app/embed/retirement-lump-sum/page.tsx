import type { Metadata } from "next";
import RetirementLumpSumPage from "@/app/(main)/retirement-lump-sum/page";

export const metadata: Metadata = {
  title: "Retirement Lump Sum Tax Calculator",
};

export default function EmbedRetirementLumpSum() {
  return <RetirementLumpSumPage noBg noHeader />;
}
