import type { Metadata } from "next";
import UifPage from "@/app/(main)/uif/page";

export const metadata: Metadata = { title: "UIF Calculator" };

export default function EmbedUif() {
  return <UifPage noBg noHeader />;
}
