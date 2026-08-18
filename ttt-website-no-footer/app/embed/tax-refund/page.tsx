import type { Metadata } from "next";
import TaxRefundPage from "@/app/(main)/tax-refund/page";

export const metadata: Metadata = {
  title: "Tax Refund Calculator",
};

export default function EmbedTaxRefund() {
  return <TaxRefundPage noBg noHeader />;
}
