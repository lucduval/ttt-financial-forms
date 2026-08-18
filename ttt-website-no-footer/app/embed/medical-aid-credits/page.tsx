import type { Metadata } from "next";
import MedicalAidCreditsPage from "@/app/(main)/medical-aid-credits/page";

export const metadata: Metadata = {
  title: "Medical Aid Tax Credits Calculator",
};

export default function EmbedMedicalAidCredits() {
  return <MedicalAidCreditsPage noBg noHeader />;
}
