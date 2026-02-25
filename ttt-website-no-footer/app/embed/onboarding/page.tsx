import type { Metadata } from "next";
import OnboardingPage from "@/app/(main)/onboarding/page";

export const metadata: Metadata = {
  title: "Client Onboarding",
};

export default function EmbedOnboarding() {
  return <OnboardingPage hideHeader />;
}
