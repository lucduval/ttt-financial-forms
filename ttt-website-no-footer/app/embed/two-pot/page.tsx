import type { Metadata } from "next";
import TwoPotPage from "@/app/(main)/two-pot/page";

export const metadata: Metadata = {
  title: "Two-Pot Withdrawal Tax Calculator",
};

export default function EmbedTwoPot() {
  return <TwoPotPage noBg noHeader />;
}
