import type { Metadata } from "next";
import TfsaPage from "@/app/(main)/tfsa/page";

export const metadata: Metadata = {
  title: "TFSA Calculator",
};

export default function EmbedTfsa() {
  return <TfsaPage noBg noHeader />;
}
