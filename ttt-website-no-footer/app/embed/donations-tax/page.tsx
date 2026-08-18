import type { Metadata } from "next";
import DonationsTaxPage from "@/app/(main)/donations-tax/page";

export const metadata: Metadata = {
  title: "Donations Tax Calculator",
};

export default function EmbedDonationsTax() {
  return <DonationsTaxPage noBg noHeader />;
}
