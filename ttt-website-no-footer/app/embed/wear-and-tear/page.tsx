import type { Metadata } from "next";
import WearAndTearPage from "@/app/(main)/wear-and-tear/page";

export const metadata: Metadata = { title: "Wear & Tear Calculator" };

export default function EmbedWearAndTear() {
  return <WearAndTearPage noBg noHeader />;
}
