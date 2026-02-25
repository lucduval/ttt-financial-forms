import type { Metadata } from "next";
import { Roboto, Roboto_Slab } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TTT Financial Group | Tax, Accounting, Insurance & Investment",
    template: "%s | TTT Financial Group",
  },
  description:
    "TTT Financial Group helps South African families and businesses with tax services, accounting, insurance, and financial planning. Trusted by 16,000+ clients.",
  metadataBase: new URL("https://ttt-tax.co.za"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${robotoSlab.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
