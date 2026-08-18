import type { Metadata } from "next";
import TravelDeductionPage from "@/app/(main)/travel-deduction/page";

export const metadata: Metadata = {
  title: "Travel Deduction Calculator",
};

export default function EmbedTravelDeduction() {
  return <TravelDeductionPage noBg noHeader />;
}
