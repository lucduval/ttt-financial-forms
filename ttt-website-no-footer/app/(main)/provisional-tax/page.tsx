"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  FileText,
  Info,
  ChevronDown,
  Calendar,
  Percent,
  Wallet,
  User,
  HeartPulse,
  AlertTriangle,
  CalendarClock,
  Landmark,
  Receipt,
  Minus,
  Plus,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS income tax tables per year of assessment (1 March – 28/29 February).
// Provisional tax is not a separate tax — it is an advance payment of normal
// tax, so the same brackets, rebates and medical scheme fees credits apply.
// Verified against the SARS "Guide for Provisional Tax" (GEN-PT-01-G01,
// Revision 28, effective 29 June 2026).

const TAX_DATA: Record<
  string,
  {
    label: string;
    brackets: { limit: number; rate: number; base: number }[];
    rebates: { primary: number; secondary: number; tertiary: number };
    mtc: { main: number; firstDep: number; additional: number };
    firstDue: string;
    secondDue: string;
    topUpDue: string;
  }
> = {
  "2027": {
    label: "2027 (Mar 2026 – Feb 2027)",
    brackets: [
      { limit: 245100, rate: 0.18, base: 0 },
      { limit: 383100, rate: 0.26, base: 44118 },
      { limit: 530200, rate: 0.31, base: 79998 },
      { limit: 695800, rate: 0.36, base: 125599 },
      { limit: 887000, rate: 0.39, base: 185215 },
      { limit: 1878600, rate: 0.41, base: 259783 },
      { limit: Infinity, rate: 0.45, base: 666339 },
    ],
    rebates: { primary: 17820, secondary: 9765, tertiary: 3249 },
    mtc: { main: 376, firstDep: 376, additional: 254 },
    firstDue: "31 August 2026",
    secondDue: "28 February 2027",
    topUpDue: "30 September 2027",
  },
  "2026": {
    label: "2026 (Mar 2025 – Feb 2026)",
    brackets: [
      { limit: 237100, rate: 0.18, base: 0 },
      { limit: 370500, rate: 0.26, base: 42678 },
      { limit: 512800, rate: 0.31, base: 77362 },
      { limit: 673000, rate: 0.36, base: 121475 },
      { limit: 857900, rate: 0.39, base: 179147 },
      { limit: 1817000, rate: 0.41, base: 251258 },
      { limit: Infinity, rate: 0.45, base: 644489 },
    ],
    rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
    mtc: { main: 364, firstDep: 364, additional: 246 },
    firstDue: "31 August 2025",
    secondDue: "28 February 2026",
    topUpDue: "30 September 2026",
  },
  "2025": {
    label: "2025 (Mar 2024 – Feb 2025)",
    brackets: [
      { limit: 237100, rate: 0.18, base: 0 },
      { limit: 370500, rate: 0.26, base: 42678 },
      { limit: 512800, rate: 0.31, base: 77362 },
      { limit: 673000, rate: 0.36, base: 121475 },
      { limit: 857900, rate: 0.39, base: 179147 },
      { limit: 1817000, rate: 0.41, base: 251258 },
      { limit: Infinity, rate: 0.45, base: 644489 },
    ],
    rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
    mtc: { main: 364, firstDep: 364, additional: 246 },
    firstDue: "31 August 2024",
    secondDue: "28 February 2025",
    topUpDue: "30 September 2025",
  },
  "2024": {
    label: "2024 (Mar 2023 – Feb 2024)",
    brackets: [
      { limit: 226000, rate: 0.18, base: 0 },
      { limit: 353100, rate: 0.26, base: 40680 },
      { limit: 488700, rate: 0.31, base: 73726 },
      { limit: 641400, rate: 0.36, base: 115763 },
      { limit: 817600, rate: 0.39, base: 170739 },
      { limit: 1731600, rate: 0.41, base: 239451 },
      { limit: Infinity, rate: 0.45, base: 614191 },
    ],
    rebates: { primary: 16425, secondary: 9000, tertiary: 2997 },
    mtc: { main: 364, firstDep: 364, additional: 246 },
    firstDue: "31 August 2023",
    secondDue: "29 February 2024",
    topUpDue: "30 September 2024",
  },
};

// Paragraph 20 under-estimation penalty: 20% of the shortfall.
const PARA20_PENALTY_RATE = 0.2;
// The R1 million taxable income line that switches the 90% test to the 80% test.
const PARA20_INCOME_LINE = 1000000;
// Basic amount escalation under paragraph 19(1)(d) — 8% per year, simple.
const BASIC_ESCALATION = 0.08;

// ─── Calculation Logic ────────────────────────────────────────────────────────

function normalTax(taxableIncome: number, taxYear: string) {
  const { brackets } = TAX_DATA[taxYear];
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const prevLimit = i === 0 ? 0 : brackets[i - 1].limit;
    if (taxableIncome <= bracket.limit) {
      tax = bracket.base + (taxableIncome - prevLimit) * bracket.rate;
      break;
    } else if (i === brackets.length - 1) {
      tax = bracket.base + (taxableIncome - prevLimit) * bracket.rate;
    }
  }
  return tax;
}

function rebateFor(age: number, taxYear: string) {
  const { rebates } = TAX_DATA[taxYear];
  let rebate = rebates.primary;
  if (age >= 65) rebate += rebates.secondary;
  if (age >= 75) rebate += rebates.tertiary;
  return rebate;
}

function taxAfterRebate(taxableIncome: number, age: number, taxYear: string) {
  return Math.max(
    0,
    normalTax(Math.max(0, taxableIncome), taxYear) - rebateFor(age, taxYear)
  );
}

// Annual section 6A medical scheme fees tax credit for a given number of
// beneficiaries (the taxpayer plus dependants).
function medicalCredit(members: number, taxYear: string) {
  if (members <= 0) return 0;
  const { mtc } = TAX_DATA[taxYear];
  let perMonth = mtc.main;
  if (members >= 2) perMonth += mtc.firstDep;
  if (members > 2) perMonth += mtc.additional * (members - 2);
  return perMonth * 12;
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

function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40"
        disabled={value <= min}
        aria-label="Decrease"
      >
        <Minus size={16} />
      </button>
      <div className="flex-1 text-center py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800">
        {value}
        {suffix ? ` ${suffix}` : ""}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40"
        disabled={value >= max}
        aria-label="Increase"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProvisionalTaxPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [age, setAge] = useState(40);
  const [period, setPeriod] = useState<"first" | "second">("first");

  const [estimatedIncome, setEstimatedIncome] = useState(450000);
  const [basicAmount, setBasicAmount] = useState(400000);
  const [escalationYears, setEscalationYears] = useState(0);

  const [payeFirst, setPayeFirst] = useState(0);
  const [payeYear, setPayeYear] = useState(0);
  const [medMembers, setMedMembers] = useState(0);

  // Optional: once assessed, test the paragraph 20 under-estimation penalty.
  const [actualIncome, setActualIncome] = useState(0);

  const results = useMemo(() => {
    // Paragraph 19(1)(d): the basic amount is increased by 8% per year (simple,
    // not compounded) where the estimate is made more than 18 months after the
    // end of the latest preceding year of assessment.
    const escalatedBasic = basicAmount * (1 + BASIC_ESCALATION * escalationYears);
    const belowBasic = estimatedIncome < escalatedBasic;

    const gross = normalTax(estimatedIncome, taxYear);
    const rebate = Math.min(gross, rebateFor(age, taxYear));
    const mtc = medicalCredit(medMembers, taxYear);
    const totalTaxPayable = Math.max(0, gross - rebate - mtc);

    // First period: half the full-year liability, then less the employees' tax
    // actually deducted during the first six months.
    const halfTax = totalTaxPayable / 2;
    const first = Math.max(0, halfTax - payeFirst);

    // Second period: the full-year liability, less employees' tax for the year
    // and less the first provisional payment.
    const second = Math.max(0, totalTaxPayable - payeYear - first);

    const totalProvisional = first + second;

    // ── Paragraph 20 under-estimation penalty ──
    const creditPaid = payeYear + totalProvisional;
    let penalty = 0;
    let penaltyApplies = false;
    let penaltyBasis = "";
    let penaltyTest = 0;

    if (actualIncome > 0) {
      if (actualIncome > PARA20_INCOME_LINE) {
        // Above R1m there is no basic-amount safe harbour: the estimate is
        // measured against 80% of actual taxable income.
        penaltyTest = taxAfterRebate(actualIncome * 0.8, age, taxYear);
        penaltyApplies = penaltyTest > creditPaid;
        penalty = Math.max(0, (penaltyTest - creditPaid) * PARA20_PENALTY_RATE);
        penaltyBasis = "80% of actual taxable income (above R1 million)";
      } else {
        // At or below R1m a penalty arises only where the estimate is BOTH
        // less than 90% of actual taxable income AND less than the basic amount.
        const failsNinety = estimatedIncome < actualIncome * 0.9;
        const failsBasic = estimatedIncome < escalatedBasic;
        penaltyApplies = failsNinety && failsBasic;
        if (penaltyApplies) {
          const taxOnNinety = taxAfterRebate(actualIncome * 0.9, age, taxYear);
          const taxOnBasic = taxAfterRebate(escalatedBasic, age, taxYear);
          penaltyTest = Math.min(taxOnNinety, taxOnBasic);
          penalty = Math.max(
            0,
            (penaltyTest - creditPaid) * PARA20_PENALTY_RATE
          );
          penaltyBasis =
            taxOnNinety <= taxOnBasic
              ? "90% of actual taxable income (the lesser)"
              : "the basic amount (the lesser)";
        } else {
          penaltyBasis = failsNinety
            ? "your estimate is at least the basic amount — safe harbour applies"
            : "your estimate is at least 90% of actual taxable income";
        }
      }
    }

    return {
      escalatedBasic,
      belowBasic,
      gross,
      rebate,
      mtc,
      totalTaxPayable,
      halfTax,
      first,
      second,
      totalProvisional,
      creditPaid,
      penalty,
      penaltyApplies,
      penaltyBasis,
      penaltyTest,
    };
  }, [
    taxYear,
    age,
    estimatedIncome,
    basicAmount,
    escalationYears,
    payeFirst,
    payeYear,
    medMembers,
    actualIncome,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const isFirst = period === "first";
  const heroAmount = isFirst ? results.first : results.second;
  const heroDue = isFirst
    ? TAX_DATA[taxYear].firstDue
    : TAX_DATA[taxYear].secondDue;

  const chartData = [
    { name: "1st period", value: results.first, color: "#0077BB" },
    { name: "2nd period", value: results.second, color: "#0168A2" },
    { name: "PAYE", value: payeYear, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Income Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Provisional Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Work out your two IRP6 provisional tax payments for the year — and
              check whether your estimate is high enough to avoid the SARS
              under-estimation penalty.
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
                Your Estimate
              </h2>

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="Select the year of assessment (1 March – 28/29 February)."
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

              {/* Period toggle */}
              <InputGroup
                label="Which Payment?"
                icon={CalendarClock}
                helpText="The first payment is due six months into the tax year; the second on the last day of the tax year. Both are shown either way."
              >
                <div className="bg-slate-100 p-1 rounded-xl flex">
                  {(
                    [
                      ["first", "1st period"],
                      ["second", "2nd period"],
                    ] as const
                  ).map(([p, label]) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        period === p
                          ? "bg-white text-[#0077BB] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </InputGroup>

              {/* Estimated taxable income */}
              <InputGroup
                label="Estimated Taxable Income"
                icon={Wallet}
                helpText="Your best estimate of total taxable income for the whole year, including the taxable portion of any capital gain. Exclude retirement fund lump sums and severance benefits."
              >
                <RandInput
                  value={estimatedIncome}
                  onChange={setEstimatedIncome}
                />
              </InputGroup>

              {/* Basic amount */}
              <InputGroup
                label="Basic Amount"
                icon={Landmark}
                helpText="The taxable income on your most recent SARS assessment, less any taxable capital gain and any retirement fund lump sum or severance benefit. That assessment must have been issued at least 14 days before you file the IRP6."
              >
                <RandInput value={basicAmount} onChange={setBasicAmount} />
              </InputGroup>

              {/* 8% escalation */}
              <InputGroup
                label="Years of 8% Escalation"
                icon={Percent}
                helpText="Paragraph 19(1)(d): where the estimate is made more than 18 months after the end of the last assessed year, the basic amount is increased by 8% per year — simple, not compounded."
              >
                <Stepper
                  value={escalationYears}
                  onChange={setEscalationYears}
                  min={0}
                  max={10}
                  suffix={escalationYears === 1 ? "year" : "years"}
                />
                {escalationYears > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    Basic amount escalates to{" "}
                    <span className="font-semibold text-slate-700">
                      R {fmt(results.escalatedBasic)}
                    </span>
                    .
                  </p>
                )}
              </InputGroup>

              {/* Age */}
              <InputGroup
                label="Your Age"
                icon={User}
                helpText="Age determines the secondary (65+) and tertiary (75+) rebates."
              >
                <input
                  type="number"
                  value={age === 0 ? "" : age}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setAge(raw === "" ? 0 : Number(raw));
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800"
                  placeholder="0"
                  min={0}
                />
              </InputGroup>

              {/* Medical scheme members */}
              <InputGroup
                label="Medical Scheme Members"
                icon={HeartPulse}
                helpText="Total beneficiaries on your medical scheme including yourself. The section 6A credit reduces each provisional payment."
              >
                <Stepper
                  value={medMembers}
                  onChange={setMedMembers}
                  min={0}
                  max={12}
                />
              </InputGroup>

              {/* PAYE first period */}
              <InputGroup
                label="PAYE Deducted (first 6 months)"
                icon={Receipt}
                helpText="Employees' tax withheld by an employer during the first period. Deducted after the liability is halved."
              >
                <RandInput value={payeFirst} onChange={setPayeFirst} />
              </InputGroup>

              {/* PAYE full year */}
              <InputGroup
                label="PAYE Deducted (full year)"
                icon={Receipt}
                helpText="Total employees' tax withheld for the whole year. Deducted in the second period calculation."
              >
                <RandInput value={payeYear} onChange={setPayeYear} />
              </InputGroup>
            </div>

            {/* Penalty checker */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
                <span className="w-1 h-6 bg-[#E8872E] rounded-full mr-3" />
                Penalty Check
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Already been assessed? Enter your final taxable income to test
                the paragraph 20 under-estimation penalty. Leave at zero to skip.
              </p>
              <InputGroup
                label="Actual Taxable Income on Assessment"
                icon={Landmark}
                helpText="Your final taxable income as determined by SARS on assessment."
              >
                <RandInput value={actualIncome} onChange={setActualIncome} />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimates only — not tax advice. This calculator covers
                individuals and trusts, not companies. It does not model the
                additional medical expenses tax credit (section 6B), foreign tax
                credits (section 6quat), the section 89quat interest on
                underpayment, or the paragraph 27 late-payment penalty of 10%,
                which reduces any paragraph 20 penalty. SARS may increase an
                estimate it is not satisfied with under paragraph 19(3), and that
                increase is not subject to objection or appeal. Consult a
                registered tax professional for your personal situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div className="rounded-2xl shadow-xl text-white p-8 bg-gradient-to-br from-[#0077BB] to-[#01527e]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="font-medium mb-1 text-sm text-blue-100">
                    {isFirst ? "First Provisional Payment" : "Second Provisional Payment"}
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(heroAmount)}
                  </div>
                  <p className="text-sm mt-2 text-blue-100">
                    Due {heroDue}.
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl">
                  <FileText className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-sm mb-1 text-blue-100">1st Period</p>
                  <p className="text-xl font-semibold">R {fmt(results.first)}</p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">2nd Period</p>
                  <p className="text-xl font-semibold">R {fmt(results.second)}</p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">Total for Year</p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.totalProvisional)}
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
                <CalendarClock size={12} className="text-[#0077BB]" />
                Top-up by {TAX_DATA[taxYear].topUpDue}
              </span>
            </div>

            {/* Below-basic-amount warning */}
            {results.belowBasic && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-[#b45f16]">
                    Your estimate is below the basic amount of R{" "}
                    {fmt(results.escalatedBasic)}.
                  </span>{" "}
                  Paragraph 19(1)(c) says an estimate may not be less than the
                  basic amount unless SARS accepts a lower one, and you give up
                  the basic-amount safe harbour against the under-estimation
                  penalty. Be ready to justify the estimate.
                </p>
              </div>
            )}

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  How the Year Is Paid
                </h3>
                <div className="h-48">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) =>
                            v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                          }
                        />
                        <RechartsTooltip
                          cursor={{ fill: "#f1f5f9" }}
                          formatter={(value: number | string | undefined) =>
                            `R ${Number(value ?? 0).toLocaleString("en-ZA", {
                              maximumFractionDigits: 0,
                            })}`
                          }
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-sm text-slate-400 px-4">
                      No provisional tax payable on this estimate.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <Row
                    label="Estimated taxable income"
                    value={`R ${fmt(estimatedIncome)}`}
                  />
                  <Row
                    label="Normal tax on estimate"
                    value={`R ${fmt(results.gross)}`}
                  />
                  <Row
                    label="Less: rebates (section 6)"
                    value={`− R ${fmt(results.rebate)}`}
                  />
                  {results.mtc > 0 && (
                    <Row
                      label="Less: medical credit (section 6A)"
                      value={`− R ${fmt(results.mtc)}`}
                    />
                  )}
                  <Row
                    label="Total tax payable"
                    value={`R ${fmt(results.totalTaxPayable)}`}
                    accent
                  />
                  <div className="h-px bg-slate-100" />
                  {isFirst ? (
                    <>
                      <Row
                        label="Half of total tax payable"
                        value={`R ${fmt(results.halfTax)}`}
                      />
                      {payeFirst > 0 && (
                        <Row
                          label="Less: PAYE (first 6 months)"
                          value={`− R ${fmt(payeFirst)}`}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {payeYear > 0 && (
                        <Row
                          label="Less: PAYE (full year)"
                          value={`− R ${fmt(payeYear)}`}
                        />
                      )}
                      <Row
                        label="Less: first provisional payment"
                        value={`− R ${fmt(results.first)}`}
                      />
                    </>
                  )}
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-[#0077BB]">
                      <span>
                        {isFirst ? "First Payment" : "Second Payment"}
                      </span>
                      <span>R {fmt(heroAmount)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-slate-400 pt-1">
                    <CalendarClock size={11} className="mt-0.5 flex-shrink-0" />
                    <span>Payable to SARS by {heroDue}.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Penalty result */}
            {actualIncome > 0 && (
              <div
                className={`rounded-2xl border shadow-sm p-6 ${
                  results.penaltyApplies && results.penalty > 0
                    ? "bg-[#E8872E]/5 border-[#E8872E]/30"
                    : "bg-emerald-50 border-emerald-200"
                }`}
              >
                <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                  {results.penaltyApplies && results.penalty > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-[#E8872E]" />
                  ) : (
                    <Landmark className="w-4 h-4 text-emerald-600" />
                  )}
                  Paragraph 20 Under-Estimation Penalty
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Tested against {results.penaltyBasis}.
                </p>

                {results.penaltyApplies && results.penalty > 0 ? (
                  <div className="space-y-3">
                    <Row
                      label="Tax on the test amount"
                      value={`R ${fmt(results.penaltyTest)}`}
                    />
                    <Row
                      label="Less: PAYE + provisional tax paid"
                      value={`− R ${fmt(results.creditPaid)}`}
                    />
                    <div className="pt-3 border-t border-dashed border-[#E8872E]/40">
                      <div className="flex justify-between font-bold text-[#b45f16]">
                        <span>Penalty at 20%</span>
                        <span>R {fmt(results.penalty)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed pt-1">
                      Reduced by any paragraph 27 late-payment penalty already
                      levied (paragraph 20(2B)). SARS may remit the penalty where
                      the shortfall was not intended to evade or postpone tax.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-800 leading-relaxed">
                    No under-estimation penalty on these figures — your estimate
                    of R {fmt(estimatedIncome)} clears the test against actual
                    taxable income of R {fmt(actualIncome)}.
                  </p>
                )}
              </div>
            )}

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                Four Things Provisional Taxpayers Get Wrong
              </h3>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-800">
                    The basic amount is a floor, not a target.
                  </p>
                  Your estimate may not be less than the basic amount unless SARS
                  agrees. Estimating at or above it also shields you from the
                  under-estimation penalty — but only if your taxable income
                  lands at R1 million or less.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Above R1 million there is no safe harbour.
                  </p>
                  The basic amount stops protecting you. The estimate is measured
                  against 80% of actual taxable income, so a large late-year
                  windfall can trigger a penalty even off a textbook estimate.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Missing the second IRP6 is treated as estimating nil.
                  </p>
                  If the second return is not filed by the due date you are deemed
                  to have estimated nil taxable income — unless you file within
                  four months after the end of the year of assessment.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    The third payment is voluntary but rarely optional.
                  </p>
                  A top-up by {TAX_DATA[taxYear].topUpDue} stops section 89quat
                  interest running on any shortfall from the effective date —
                  seven months after a February year-end.
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
      className={`flex justify-between text-sm ${
        accent ? "text-[#0077BB] font-medium" : "text-slate-600"
      }`}
    >
      <span className="pr-3">{label}</span>
      <span className="whitespace-nowrap flex-shrink-0">{value}</span>
    </div>
  );
}
