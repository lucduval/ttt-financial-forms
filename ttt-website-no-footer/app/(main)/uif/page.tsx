"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Landmark,
  Wallet,
  Info,
  ChevronDown,
  Calendar,
  Percent,
  Building2,
  ShieldCheck,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";

// ─── UIF Data ────────────────────────────────────────────────────────────────
// Unemployment Insurance Contributions Act, 2002 + Unemployment Insurance Act
// 63 of 2001. The earnings ceiling has been R17 712 p/m (R212 544 p/a) since
// 1 June 2021 (Government Gazette 44641 of 28 May 2021) and is unchanged for
// every year of assessment below — but it is keyed per year so a future
// Gazette can simply be dropped in.

const UIF_DATA: Record<
  string,
  {
    label: string;
    ceilingMonthly: number;
    employeeRate: number;
    employerRate: number;
  }
> = {
  "2027": {
    label: "2027 (Mar 2026 – Feb 2027)",
    ceilingMonthly: 17712,
    employeeRate: 0.01,
    employerRate: 0.01,
  },
  "2026": {
    label: "2026 (Mar 2025 – Feb 2026)",
    ceilingMonthly: 17712,
    employeeRate: 0.01,
    employerRate: 0.01,
  },
  "2025": {
    label: "2025 (Mar 2024 – Feb 2025)",
    ceilingMonthly: 17712,
    employeeRate: 0.01,
    employerRate: 0.01,
  },
  "2024": {
    label: "2024 (Mar 2023 – Feb 2024)",
    ceilingMonthly: 17712,
    employeeRate: 0.01,
    employerRate: 0.01,
  },
};

// Benefit side — Unemployment Insurance Act 63 of 2001.
// Income Replacement Rate (IRR) slides from the upper rate at zero income to
// the lower rate at the "benefit transition income level" (currently the same
// R17 712 as the contribution ceiling), per the Schedule 2 hyperbola.
const URR = 0.6; // upper income replacement rate — 60%
const LRR = 0.38; // lower income replacement rate — 38%
const SLIDING_DAYS = 238; // s12(3)(d): thereafter credits pay a flat rate
const FLAT_RATE = 0.2; // s12(3)(d): 20% of remuneration beyond 238 days
const MAX_CREDIT_DAYS = 365; // s13(3)(a): max 365 days in the preceding 4 years
const DAYS_PER_CREDIT = 4; // s13(3): 1 day's credit per 4 days contributed

// ─── Calculation Logic ────────────────────────────────────────────────────────

/**
 * Schedule 2 (Mathematical Calculation of Contributor's Entitlement) of the
 * Unemployment Insurance Act, written out literally so it can be audited
 * against the Act. Reduces to IRR = 0.292 + 0.616 / (2 + 5Y/17712), i.e. 60%
 * at zero income and exactly 38% at the transition income level.
 */
function incomeReplacementRate(cappedMonthlyIncome: number, transition: number) {
  const irr =
    LRR +
    (URR - LRR) / ((2 + (5 * cappedMonthlyIncome) / transition) * (1 / 2 - 1 / 7)) -
    (URR - LRR) / (7 / 2 - 1);
  return Math.min(URR, Math.max(LRR, irr));
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
            <Info className="w-4 h-4 text-slate-300 cursor-help" />
            <div className="absolute right-0 bottom-6 w-64 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
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
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <div className="relative">
      {!suffix && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
          R
        </div>
      )}
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? 0 : Number(raw));
        }}
        className={`w-full ${
          suffix ? "pl-4 pr-20" : "pl-8 pr-4"
        } py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800`}
        placeholder="0"
        min={0}
      />
      {suffix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
          {suffix}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UifPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [mode, setMode] = useState<"contributions" | "benefit">("contributions");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [salary, setSalary] = useState(25000);
  const [monthsWorked, setMonthsWorked] = useState(48);

  const results = useMemo(() => {
    const { ceilingMonthly, employeeRate, employerRate } = UIF_DATA[taxYear];

    const monthlySalary = period === "monthly" ? salary : salary / 12;
    const contributionBase = Math.min(monthlySalary, ceilingMonthly);
    const capped = monthlySalary > ceilingMonthly;

    const employeeMonthly = contributionBase * employeeRate;
    const employerMonthly = contributionBase * employerRate;
    const totalMonthly = employeeMonthly + employerMonthly;
    const effectiveRate =
      monthlySalary > 0 ? (employeeMonthly / monthlySalary) * 100 : 0;

    // ── Benefit side ──
    const irr = incomeReplacementRate(contributionBase, ceilingMonthly);
    const dailyRemuneration = (contributionBase * 12) / 365;
    const dailyBenefit = irr * dailyRemuneration;
    const flatDailyBenefit = FLAT_RATE * dailyRemuneration;

    const daysContributed = (monthsWorked * 365) / 12;
    const creditDays = Math.min(
      MAX_CREDIT_DAYS,
      Math.floor(daysContributed / DAYS_PER_CREDIT)
    );
    const slidingDays = Math.min(creditDays, SLIDING_DAYS);
    const flatDays = Math.max(0, creditDays - SLIDING_DAYS);

    const slidingPayout = slidingDays * dailyBenefit;
    const flatPayout = flatDays * flatDailyBenefit;
    const totalPayout = slidingPayout + flatPayout;

    return {
      ceilingMonthly,
      monthlySalary,
      contributionBase,
      capped,
      employeeMonthly,
      employerMonthly,
      totalMonthly,
      effectiveRate,
      irr,
      dailyRemuneration,
      dailyBenefit,
      flatDailyBenefit,
      creditDays,
      slidingDays,
      flatDays,
      slidingPayout,
      flatPayout,
      totalPayout,
    };
  }, [salary, period, monthsWorked, taxYear]);

  const fmt = (n: number) =>
    n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });
  const fmt2 = (n: number) =>
    n.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Contributions chart: the ceiling plateau, with your own salary marked.
  const ceilingCurve = [4000, 8000, 12000, 16000, results.ceilingMonthly, 30000]
    .map((s) => ({
      name: `R ${fmt(s)}`,
      value: Math.min(s, results.ceilingMonthly) * 0.01,
      you: false,
    }))
    .concat([
      {
        name: "You",
        value: results.employeeMonthly,
        you: true,
      },
    ]);

  // Benefit chart: the two payout tranches.
  const payoutTranches = [
    {
      name: `First ${results.slidingDays} days`,
      value: results.slidingPayout,
      you: false,
    },
    {
      name: `Next ${results.flatDays} days`,
      value: results.flatPayout,
      you: true,
    },
  ].filter((d) => d.value > 0);

  const isBenefit = mode === "benefit";

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Landmark className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Payroll Levies
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              UIF Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Work out the UIF coming off your payslip each month — and estimate
              what the Fund would pay you if you lost your job.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Left Column: Inputs ── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                Your Details
              </h2>

              {/* Mode Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl flex mb-8">
                {(
                  [
                    ["contributions", "Contributions"],
                    ["benefit", "Benefit Estimate"],
                  ] as const
                ).map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setMode(val)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                      mode === val
                        ? "bg-white text-[#0077BB] shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="Select the year of assessment (1 March – 28/29 February). The UIF earnings ceiling has been unchanged since 1 June 2021."
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

              {/* Period Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl flex mb-8">
                {(["monthly", "yearly"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all capitalize ${
                      period === p
                        ? "bg-white text-[#0077BB] shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Salary */}
              <InputGroup
                label="Gross Remuneration"
                icon={Wallet}
                helpText="Your gross earnings before deductions, per the period selected above. UIF is calculated on remuneration up to the monthly earnings ceiling."
              >
                <RandInput value={salary} onChange={setSalary} />
              </InputGroup>

              {/* Months contributed — benefit mode only */}
              {isBenefit && (
                <InputGroup
                  label="Months Contributed"
                  icon={CalendarClock}
                  helpText="Months you contributed to the Fund in the four years before your claim. You earn one day's credit for every four days worked, up to a maximum of 365 credit days — reached at 48 months."
                >
                  <RandInput
                    value={monthsWorked}
                    onChange={setMonthsWorked}
                    suffix="months"
                  />
                </InputGroup>
              )}

              {/* Ceiling notice */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <ShieldCheck className="w-4 h-4 text-[#0077BB] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  UIF is 1% from you and 1% from your employer, on earnings up to{" "}
                  <strong>R {fmt(results.ceilingMonthly)} per month</strong> (R{" "}
                  {fmt(results.ceilingMonthly * 12)} a year) — so the most either
                  side pays is <strong>R 177.12 a month</strong>. This ceiling has
                  applied since 1 June 2021.
                </p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimates only — not tax advice. UIF is separate from PAYE and
                from the employer&apos;s 1% Skills Development Levy. Benefit
                figures are an estimate of the unemployment benefit under the
                Unemployment Insurance Act; illness, maternity, parental and
                dependant&apos;s benefits are paid on different rates and
                durations, and the Fund&apos;s own assessment of your credit days
                and remuneration is final. Consult a registered tax professional
                for your personal situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            {isBenefit ? (
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl shadow-xl text-white p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-emerald-100 font-medium mb-1 text-sm">
                      Estimated Total Benefit
                    </p>
                    <div className="text-5xl font-bold tracking-tight">
                      R {fmt(results.totalPayout)}
                    </div>
                    <p className="text-sm text-emerald-100 mt-2">
                      Over {results.creditDays} credit days — about R{" "}
                      {fmt2(results.dailyBenefit)} a day to start.
                    </p>
                  </div>
                  <div className="bg-white/15 p-3 rounded-xl">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
                  <div>
                    <p className="text-emerald-100 text-sm mb-1">
                      Replacement Rate
                    </p>
                    <p className="text-xl font-semibold">
                      {(results.irr * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-100 text-sm mb-1">Per 30 Days</p>
                    <p className="text-xl font-semibold">
                      R {fmt(results.dailyBenefit * 30)}
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-100 text-sm mb-1">Credit Days</p>
                    <p className="text-xl font-semibold">{results.creditDays}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#0077BB] to-[#01527e] rounded-2xl shadow-xl text-white p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-blue-100 font-medium mb-1 text-sm">
                      Your UIF Deduction
                    </p>
                    <div className="text-5xl font-bold tracking-tight">
                      R {fmt2(results.employeeMonthly)}
                    </div>
                    <p className="text-sm text-blue-100 mt-2">
                      Off your payslip each month — R{" "}
                      {fmt2(results.employeeMonthly * 12)} a year.
                    </p>
                  </div>
                  <div className="bg-white/15 p-3 rounded-xl">
                    <Landmark className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
                  <div>
                    <p className="text-blue-100 text-sm mb-1">Employer Pays</p>
                    <p className="text-xl font-semibold">
                      R {fmt2(results.employerMonthly)}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm mb-1">Total to the Fund</p>
                    <p className="text-xl font-semibold">
                      R {fmt2(results.totalMonthly)}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm mb-1">
                      Of Your Gross Pay
                    </p>
                    <p className="text-xl font-semibold">
                      {results.effectiveRate.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tax year badge */}
            <div className="flex items-center gap-2 -mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {UIF_DATA[taxYear].label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Percent size={12} className="text-[#0077BB]" />
                Ceiling R {fmt(results.ceilingMonthly)} p/m
              </span>
            </div>

            {/* Capped warning */}
            {results.capped && !isBenefit && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  You earn more than the ceiling, so your contribution is capped.
                  UIF is charged on R {fmt(results.ceilingMonthly)} rather than
                  your full R {fmt(results.monthlySalary)} a month — every rand
                  above the ceiling is ignored.
                </p>
              </div>
            )}

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  {isBenefit
                    ? "How the Payout Splits"
                    : "Where the Ceiling Bites"}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={isBenefit ? payoutTranches : ceilingCurve}
                      margin={{ top: 5, right: 5, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={44}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <RechartsTooltip
                        formatter={(value: number | string | undefined) =>
                          `R ${Number(value ?? 0).toLocaleString("en-ZA", {
                            maximumFractionDigits: 2,
                          })}`
                        }
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {(isBenefit ? payoutTranches : ceilingCurve).map(
                          (entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.you ? "#E8872E" : "#0077BB"}
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  {isBenefit
                    ? `The first ${SLIDING_DAYS} credit days pay at your ${(
                        results.irr * 100
                      ).toFixed(
                        1
                      )}% replacement rate; any credits beyond that pay a flat ${
                        FLAT_RATE * 100
                      }%.`
                    : "Your 1% climbs with your salary until the ceiling, then flattens out at R 177.12 a month."}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                {isBenefit ? (
                  <div className="space-y-3">
                    <Row
                      label="Monthly Remuneration"
                      value={`R ${fmt(results.monthlySalary)}`}
                    />
                    <Row
                      label="Capped at Transition Level"
                      value={`R ${fmt(results.contributionBase)}`}
                    />
                    <Row
                      label="Daily Rate of Remuneration"
                      value={`R ${fmt2(results.dailyRemuneration)}`}
                    />
                    <div className="h-px bg-slate-100" />
                    <Row
                      label="Income Replacement Rate"
                      value={`${(results.irr * 100).toFixed(2)}%`}
                      accent
                    />
                    <Row
                      label="Daily Benefit"
                      value={`R ${fmt2(results.dailyBenefit)}`}
                    />
                    <div className="h-px bg-slate-100" />
                    <Row
                      label={`Sliding Scale × ${results.slidingDays} days`}
                      value={`R ${fmt(results.slidingPayout)}`}
                    />
                    <Row
                      label={`Flat ${FLAT_RATE * 100}% × ${
                        results.flatDays
                      } days`}
                      value={`R ${fmt(results.flatPayout)}`}
                    />
                    <div className="pt-3 border-t border-dashed border-slate-200">
                      <div className="flex justify-between font-bold text-emerald-600">
                        <span>Total Estimated Benefit</span>
                        <span>R {fmt(results.totalPayout)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                      <CalendarClock size={11} />
                      One credit day per four days contributed, capped at{" "}
                      {MAX_CREDIT_DAYS} days over four years.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Row
                      label="Monthly Remuneration"
                      value={`R ${fmt(results.monthlySalary)}`}
                    />
                    <Row
                      label="Earnings Ceiling"
                      value={`R ${fmt(results.ceilingMonthly)}`}
                    />
                    <Row
                      label="Contribution Base"
                      value={`R ${fmt(results.contributionBase)}`}
                      accent
                    />
                    <div className="h-px bg-slate-100" />
                    <Row
                      label="Employee (1%)"
                      value={`R ${fmt2(results.employeeMonthly)}`}
                    />
                    <Row
                      label="Employer (1%)"
                      value={`R ${fmt2(results.employerMonthly)}`}
                    />
                    <div className="pt-3 border-t border-dashed border-slate-200">
                      <div className="flex justify-between font-bold text-[#0077BB]">
                        <span>Total Monthly (2%)</span>
                        <span>R {fmt2(results.totalMonthly)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Total for the Year</span>
                      <span>R {fmt2(results.totalMonthly * 12)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                      <Building2 size={11} />
                      Your employer pays both halves over to SARS or the UIF each
                      month.
                    </div>
                  </div>
                )}
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
      className={`flex justify-between text-sm ${
        accent ? "text-[#0077BB] font-medium" : "text-slate-600"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
