import type { Metadata } from "next";
import PayrollTaxPage from "@/app/(main)/payroll-tax/page";

export const metadata: Metadata = { title: "Payroll Tax Calculator" };

export default function EmbedPayrollTax() {
  return <PayrollTaxPage noBg noHeader />;
}
