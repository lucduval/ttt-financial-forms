import type { Metadata } from "next";
import ContactFormEmbed from "@/app/components/ContactFormEmbed";

export const metadata: Metadata = {
  title: "Contact Us",
};

export default function EmbedContact() {
  return <ContactFormEmbed />;
}
