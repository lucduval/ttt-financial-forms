import type { Metadata } from "next";
import CalculatorsHubPage from "@/app/(main)/calculators/page";

export const metadata: Metadata = {
  title: "Tax Calculators",
};

export default function EmbedCalculators() {
  return <CalculatorsHubPage noBg noHeader />;
}
