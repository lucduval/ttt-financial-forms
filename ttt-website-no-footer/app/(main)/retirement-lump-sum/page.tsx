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
  PiggyBank,
  Wallet,
  Info,
  ChevronDown,
  Calendar,
  Landmark,
  Percent,
  History,
  LogOut,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS retirement fund lump sum tax tables. Two separate tables apply:
//  • Retirement / death / severance benefits (R550,000 tax-free tier).
//  • Pre-retirement WITHDRAWAL benefits (R27,500 tax-free tier).
// Both tables have been unchanged since 1 March 2023, so they apply identically
// to the 2024–2027 years of assessment. Tables are cumulative: tax is worked out
// on the total of all lump sums ever received, less tax on prior lump sums.

type Bracket = { limit: number; rate: number; base: number };

const RETIREMENT_TABLE: Bracket[] = [
  { limit: 550000, rate: 0, base: 0 },
  { limit: 770000, rate: 0.18, base: 0 },
  { limit: 1155000, rate: 0.27, base: 39600 },
  { limit: Infinity, rate: 0.36, base: 143550 },
];

const WITHDRAWAL_TABLE: Bracket[] = [
  { limit: 27500, rate: 0, base: 0 },
  { limit: 726000, rate: 0.18, base: 0 },
  { limit: 1089000, rate: 0.27, base: 125730 },
  { limit: Infinity, rate: 0.36, base: 223740 },
];

const TAX_DATA: Record<string, { label: string }> = {
  "2027": { label: "2027 (Mar 2026 – Feb 2027)" },
  "2026": { label: "2026 (Mar 2025 – Feb 2026)" },
  "2025": { label: "2025 (Mar 2024 – Feb 2025)" },
  "2024": { label: "2024 (Mar 2023 – Feb 2024)" },
};

// ─── Calculation Logic ────────────────────────────────────────────────────────

function taxFromTable(amount: number, table: Bracket[]) {
  let tax = 0;
  for (let i = 0; i < table.length; i++) {
    const b = table[i];
    const prevLimit = i === 0 ? 0 : table[i - 1].limit;
    if (amount <= b.limit) {
      tax = b.base + (amount - prevLimit) * b.rate;
      break;
    } else if (i === table.length - 1) {
      tax = b.base + (amount - prevLimit) * b.rate;
    }
  }
  return Math.max(0, tax);
}

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

export default function RetirementLumpSumPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [benefitType, setBenefitType] = useState<"retirement" | "withdrawal">(
    "retirement"
  );
  const [lumpSum, setLumpSum] = useState(900000);
  const [priorLumpSums, setPriorLumpSums] = useState(0);

  const results = useMemo(() => {
    const table =
      benefitType === "retirement" ? RETIREMENT_TABLE : WITHDRAWAL_TABLE;

    // Cumulative basis: tax on (prior + this) less tax already attributed to prior.
    const taxOnTotal = taxFromTable(priorLumpSums + lumpSum, table);
    const taxOnPrior = taxFromTable(priorLumpSums, table);
    const tax = Math.max(0, taxOnTotal - taxOnPrior);

    const net = Math.max(0, lumpSum - tax);
    const effectiveRate = lumpSum > 0 ? (tax / lumpSum) * 100 : 0;

    return { tax, net, effectiveRate, taxOnTotal, taxOnPrior };
  }, [lumpSum, priorLumpSums, benefitType]);

  const fmt = (n: number) =>
    n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    { name: "You Receive", value: results.net, color: "#10b981" },
    { name: "Tax", value: results.tax, color: "#0077BB" },
  ].filter((d) => d.value > 0);

  const taxFreeTier = benefitType === "retirement" ? 550000 : 27500;

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Retirement Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Retirement Lump Sum Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Taking a lump sum from a pension, provident or retirement annuity
              fund? Estimate the SARS tax on your withdrawal or retirement
              benefit and what you&apos;ll actually receive.
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
                Your Lump Sum
              </h2>

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="Select the year of assessment (1 March – 28/29 February). The lump-sum tables have been unchanged since 2023."
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

              {/* Benefit type toggle */}
              <InputGroup
                label="Type of Benefit"
                icon={LogOut}
                helpText="Retirement/death/severance benefits use the table with a R550,000 tax-free tier. Pre-retirement withdrawals (e.g. resigning and cashing out) use the harsher table with only a R27,500 tax-free tier."
              >
                <div className="bg-slate-100 p-1 rounded-xl flex">
                  {(
                    [
                      ["retirement", "Retirement"],
                      ["withdrawal", "Withdrawal"],
                    ] as const
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setBenefitType(val)}
                      className={`flex-1 py-3 sm:py-2 text-sm font-semibold rounded-lg transition-all ${
                        benefitType === val
                          ? "bg-white text-[#0077BB] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </InputGroup>

              {/* Lump sum */}
              <InputGroup
                label="Lump Sum Amount"
                icon={Wallet}
                helpText="The gross amount you are taking as a lump sum, before tax."
              >
                <RandInput value={lumpSum} onChange={setLumpSum} />
              </InputGroup>

              {/* Prior lump sums */}
              <InputGroup
                label="Previous Lump Sums Taken"
                icon={History}
                helpText="Total of any retirement or withdrawal lump sums (and pre-2009 severance/withdrawals per SARS rules) you have received before. These are aggregated with this one to work out the tax, so a second lump sum is taxed at a higher rate. Leave at 0 if this is your first."
              >
                <RandInput value={priorLumpSums} onChange={setPriorLumpSums} />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimate only. SARS taxes lump sums on a cumulative basis across
                all funds and prior benefits, and a tax directive determines the
                actual amount. Transfers to another approved fund and certain
                deductible contributions can change the result. Consult a
                registered tax professional for your situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl shadow-xl text-white p-5 sm:p-8">
              <div className="flex justify-between items-start gap-3 mb-6">
                <div>
                  <p className="text-emerald-100 font-medium mb-1 text-sm">
                    Lump Sum After Tax
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    R {fmt(results.net)}
                  </div>
                  <p className="text-sm text-emerald-100 mt-2">
                    After R {fmt(results.tax)} tax on a R {fmt(lumpSum)} lump
                    sum.
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl flex-shrink-0">
                  <PiggyBank className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-emerald-100 text-xs sm:text-sm mb-1">Tax on Lump Sum</p>
                  <p className="text-lg sm:text-xl font-semibold">R {fmt(results.tax)}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-xs sm:text-sm mb-1">
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
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Landmark size={12} className="text-[#0077BB]" />
                First R{fmt(taxFreeTier)} tax-free
              </span>
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Where Your Lump Sum Goes
                </h3>
                <div className="h-48">
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
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <Row label="This Lump Sum" value={`R ${fmt(lumpSum)}`} />
                  {priorLumpSums > 0 && (
                    <>
                      <Row
                        label="Previous Lump Sums"
                        value={`R ${fmt(priorLumpSums)}`}
                      />
                      <Row
                        label="Tax on Cumulative Total"
                        value={`R ${fmt(results.taxOnTotal)}`}
                      />
                      <Row
                        label="Less: Tax on Previous"
                        value={`− R ${fmt(results.taxOnPrior)}`}
                        green
                      />
                    </>
                  )}
                  <div className="h-px bg-slate-100" />
                  <Row
                    label="Tax on This Lump Sum"
                    value={`− R ${fmt(results.tax)}`}
                    accent
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>You Receive</span>
                      <span>R {fmt(results.net)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    {benefitType === "retirement"
                      ? "Retirement table — first R550,000 is tax-free."
                      : "Withdrawal table — only R27,500 is tax-free."}
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
  green,
  accent,
}: {
  label: string;
  value: string;
  green?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 text-sm ${
        green
          ? "text-emerald-600"
          : accent
          ? "text-[#0077BB] font-medium"
          : "text-slate-600"
      }`}
    >
      <span className="min-w-0">{label}</span>
      <span className="text-right whitespace-nowrap">{value}</span>
    </div>
  );
}
