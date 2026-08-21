"use client";

import React, { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  HandCoins,
  Gift,
  Info,
  ChevronDown,
  Calendar,
  Percent,
  History,
  Users,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS donations tax. Levied on the donor at 20% on the aggregate value of
// property donated up to R30 million, and 25% on the value above R30 million.
// The R30m threshold aggregates donations from 1 March 2018 to date. Each donor
// has an annual exemption (natural persons): R100,000 up to the 2026 year of
// assessment, rising to R150,000 for the 2027 year (from 1 March 2026).
// Donations to a spouse or to an approved public benefit organisation are exempt.

const TAX_DATA: Record<
  string,
  { label: string; annualExemption: number }
> = {
  "2027": { label: "2027 (Mar 2026 – Feb 2027)", annualExemption: 150000 },
  "2026": { label: "2026 (Mar 2025 – Feb 2026)", annualExemption: 100000 },
  "2025": { label: "2025 (Mar 2024 – Feb 2025)", annualExemption: 100000 },
  "2024": { label: "2024 (Mar 2023 – Feb 2024)", annualExemption: 100000 },
};

const THRESHOLD = 30_000_000; // R30m aggregate cut-over from 20% to 25%
const RATE_LOW = 0.2;
const RATE_HIGH = 0.25;

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputGroup({
  label,
  icon: Icon,
  helpText,
  children,
}: {
  label: string;
  icon: React.ElementType;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center text-sm font-semibold text-slate-700">
          <Icon className="w-4 h-4 mr-2 text-[#0077BB]" />
          {label}
        </label>
        {helpText && (
          <div className="group relative">
            <button
              type="button"
              aria-label="More information"
              className="block p-2.5 -m-2.5 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
            <div className="absolute right-0 bottom-7 w-64 max-w-[calc(100vw-3rem)] p-2.5 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-active:opacity-100 transition-opacity pointer-events-none z-20 leading-relaxed">
              {helpText}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function RandInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
        R
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={value === 0 ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? 0 : Number(raw));
        }}
        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800"
        placeholder="0"
        min={0}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DonationsTaxPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [donation, setDonation] = useState(500000);
  const [priorAggregate, setPriorAggregate] = useState(0);
  const [exempt, setExempt] = useState(false);

  const { annualExemption } = TAX_DATA[taxYear];

  const results = useMemo(() => {
    if (exempt) {
      return {
        exemptionUsed: 0,
        taxable: 0,
        portion20: 0,
        portion25: 0,
        tax: 0,
        netToRecipient: donation,
        totalCost: donation,
        effectiveRate: 0,
      };
    }

    const exemptionUsed = Math.min(donation, annualExemption);
    const taxable = Math.max(0, donation - annualExemption);

    // Aggregate rule: value already donated since 1 Mar 2018 fills the R30m band
    // taxed at 20%; anything above R30m aggregate is taxed at 25%.
    const roomAt20 = Math.max(0, THRESHOLD - priorAggregate);
    const portion20 = Math.min(taxable, roomAt20);
    const portion25 = taxable - portion20;

    const tax = portion20 * RATE_LOW + portion25 * RATE_HIGH;
    const netToRecipient = donation; // recipient receives the full donation
    const totalCost = donation + tax; // the donor bears the tax
    const effectiveRate = donation > 0 ? (tax / donation) * 100 : 0;

    return {
      exemptionUsed,
      taxable,
      portion20,
      portion25,
      tax,
      netToRecipient,
      totalCost,
      effectiveRate,
    };
  }, [donation, priorAggregate, exempt, annualExemption]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    { name: "To Recipient", value: results.netToRecipient, color: "#10b981" },
    { name: "Donations Tax", value: results.tax, color: "#0077BB" },
  ].filter((d) => d.value > 0);

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <HandCoins className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Donations Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Donations Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Giving a gift of money or property? Work out the donations tax
              payable after the annual exemption — 20% up to R30 million, 25%
              above.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* ── Left Column: Inputs ── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                The Donation
              </h2>

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="The annual exemption for individuals rose to R150,000 from the 2027 year of assessment (1 March 2026)."
              >
                <div className="relative">
                  <select
                    value={taxYear}
                    onChange={(e) => setTaxYear(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    <option value="2027">2027 (Mar &apos;26 – Feb &apos;27)</option>
                    <option value="2026">2026 (Mar &apos;25 – Feb &apos;26)</option>
                    <option value="2025">2025 (Mar &apos;24 – Feb &apos;25)</option>
                    <option value="2024">2024 (Mar &apos;23 – Feb &apos;24)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </InputGroup>

              {/* Donation amount */}
              <InputGroup
                label="Donation Amount"
                icon={Gift}
                helpText="The value of the money or property you are donating this tax year."
              >
                <RandInput value={donation} onChange={setDonation} />
                <p className="mt-2 text-xs text-slate-400">
                  Annual exemption: R {fmt(annualExemption)} per donor.
                </p>
              </InputGroup>

              {/* Prior aggregate */}
              <InputGroup
                label="Donations Since 1 March 2018"
                icon={History}
                helpText="Total value you've already donated since 1 March 2018. Once your aggregate passes R30 million, further donations are taxed at 25%."
              >
                <RandInput value={priorAggregate} onChange={setPriorAggregate} />
              </InputGroup>

              {/* Exempt toggle */}
              <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <button
                  role="switch"
                  aria-checked={exempt}
                  onClick={() => setExempt((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 before:absolute before:content-[''] before:-inset-x-1 before:-inset-y-2.5 ${
                    exempt ? "bg-[#0077BB]" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      exempt ? "translate-x-5" : ""
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Users size={14} className="text-[#0077BB]" />
                    Exempt donation
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                    Donation to a spouse or an approved public benefit
                    organisation (PBO) — no donations tax applies.
                  </p>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This calculator provides estimates only and does not constitute
                tax advice. Donations tax is payable by the donor by the end of
                the month following the donation (form IT144). Certain donations —
                to a spouse, to approved PBOs, and bona fide maintenance — are
                exempt. Consult a registered tax professional for your situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div className="bg-gradient-to-br from-[#0077BB] to-[#01527e] rounded-2xl shadow-xl text-white p-5 sm:p-8">
              <div className="flex justify-between items-start gap-3 mb-6">
                <div>
                  <p className="text-blue-100 font-medium mb-1 text-sm">
                    Donations Tax Payable
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    R {fmt(results.tax)}
                  </div>
                  <p className="text-sm text-blue-100 mt-2">
                    {exempt
                      ? "This donation is exempt from donations tax."
                      : `On a R ${fmt(donation)} donation this year.`}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl flex-shrink-0">
                  <HandCoins className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm mb-1">Total Cost to You</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(results.totalCost)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm mb-1">
                    Effective Tax Rate
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
                    {results.effectiveRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Tax year badge */}
            <div className="flex items-center gap-2 -mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {TAX_DATA[taxYear].label}
              </span>
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Donation vs Tax
                </h3>
                <div className="h-48">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          innerRadius={52}
                          outerRadius={72}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number | string | undefined) =>
                            `R ${Number(value ?? 0).toLocaleString("en-ZA", {
                              maximumFractionDigits: 0,
                            })}`
                          }
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-sm text-slate-400 px-4">
                      No donations tax payable.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <Row label="Donation Amount" value={`R ${fmt(donation)}`} />
                  <Row
                    label="Less Annual Exemption"
                    value={`− R ${fmt(results.exemptionUsed)}`}
                  />
                  <div className="h-px bg-slate-100" />
                  <Row
                    label="Taxable Donation"
                    value={`R ${fmt(results.taxable)}`}
                    accent
                  />
                  {results.portion20 > 0 && (
                    <Row
                      label="Taxed at 20%"
                      value={`R ${fmt(results.portion20)}`}
                    />
                  )}
                  {results.portion25 > 0 && (
                    <Row
                      label="Taxed at 25% (above R30m)"
                      value={`R ${fmt(results.portion25)}`}
                    />
                  )}
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-[#0077BB]">
                      <span>Donations Tax</span>
                      <span>R {fmt(results.tax)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    Paid by the donor — the recipient receives the full donation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tiny helper components ───────────────────────────────────────────────────

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 text-sm ${
        accent ? "text-[#0077BB] font-medium" : "text-slate-600"
      }`}
    >
      <span className="min-w-0">{label}</span>
      <span className="text-right whitespace-nowrap">{value}</span>
    </div>
  );
}
