import type { Metadata } from "next";
import ForeignDividendsPage from "@/app/(main)/foreign-dividends/page";

export const metadata: Metadata = { title: "Foreign Dividends Tax Calculator" };

export default function EmbedForeignDividends() {
  return <ForeignDividendsPage noBg noHeader />;
}
