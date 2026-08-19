import type { Metadata } from "next";
import HourlyToSalaryPage from "@/app/(main)/hourly-to-salary/page";

export const metadata: Metadata = { title: "Hourly to Salary Calculator" };

export default function EmbedHourlyToSalary() {
  return <HourlyToSalaryPage noBg noHeader />;
}
