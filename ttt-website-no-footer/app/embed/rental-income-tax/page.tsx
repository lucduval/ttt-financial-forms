import type { Metadata } from "next";
import RentalIncomeTaxPage from "@/app/(main)/rental-income-tax/page";

export const metadata: Metadata = {
  title: "Rental Income Tax Calculator",
};

export default function EmbedRentalIncomeTax() {
  return <RentalIncomeTaxPage noBg noHeader />;
}
