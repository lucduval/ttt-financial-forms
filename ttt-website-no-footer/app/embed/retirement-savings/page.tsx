import type { Metadata } from "next";
import RetirementSavingsPage from "@/app/(main)/retirement-savings/page";

export const metadata: Metadata = { title: "Retirement Savings Tax Calculator" };

export default function EmbedRetirementSavings() {
  return <RetirementSavingsPage noBg noHeader />;
}
