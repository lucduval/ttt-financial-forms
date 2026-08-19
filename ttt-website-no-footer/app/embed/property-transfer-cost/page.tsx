import type { Metadata } from "next";
import PropertyTransferCostPage from "@/app/(main)/property-transfer-cost/page";

export const metadata: Metadata = { title: "Property Transfer Cost Calculator" };

export default function EmbedPropertyTransferCost() {
  return <PropertyTransferCostPage noBg noHeader />;
}
