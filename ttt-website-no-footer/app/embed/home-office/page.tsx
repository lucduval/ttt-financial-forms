import type { Metadata } from "next";
import HomeOfficePage from "@/app/(main)/home-office/page";

export const metadata: Metadata = { title: "Home Office Calculator" };

export default function EmbedHomeOffice() {
  return <HomeOfficePage noBg noHeader />;
}
