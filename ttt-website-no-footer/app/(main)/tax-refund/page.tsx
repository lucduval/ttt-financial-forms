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
  Receipt,
  Wallet,
  HeartPulse,
  PiggyBank,
  Info,
  ChevronDown,
  RefreshCcw,
  Calendar,
  Landmark,
  TrendingUp,
  Sparkles,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS figures per year of assessment (1 March – 28/29 February).
// raCap = annual retirement-contribution deduction ceiling.

const TAX_DATA: Record<
  string,
  {
    label: string;
    brackets: { limit: number; rate: number; base: number }[];
    rebates: { primary: number; secondary: number; tertiary: number };
    medical: { main: number; firstDep: number; additional: number };
    raCap: number;
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
    medical: { main: 376, firstDep: 376, additional: 254 },
    raCap: 430000,
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
    medical: { main: 364, firstDep: 364, additional: 246 },
    raCap: 350000,
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
    medical: { main: 364, firstDep: 364, additional: 246 },
    raCap: 350000,
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
    medical: { main: 364, firstDep: 364, additional: 246 },
    raCap: 350000,
  },
};

// ─── Calculation Logic ────────────────────────────────────────────────────────

function calculateAnnualTax(
  annualGross: number,
  annualRetirementInput: number,
  otherDeductions: number,
  age: number,
  taxYear: string,
  medAidMembers: number
) {
  const { brackets, rebates, medical, raCap } = TAX_DATA[taxYear];

  const retirementCapPct = annualGross * 0.275;
  const allowableRetirement = Math.min(
    annualRetirementInput,
    retirementCapPct,
    raCap
  );

  const taxableIncome = Math.max(
    0,
    annualGross - allowableRetirement - Math.max(0, otherDeductions)
  );

  let normalTax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const prevLimit = i === 0 ? 0 : brackets[i - 1].limit;
    if (taxableIncome <= bracket.limit) {
      normalTax = bracket.base + (taxableIncome - prevLimit) * bracket.rate;
      break;
    } else if (i === brackets.length - 1) {
      normalTax = bracket.base + (taxableIncome - prevLimit) * bracket.rate;
    }
  }

  let totalRebate = rebates.primary;
  if (age >= 65) totalRebate += rebates.secondary;
  if (age >= 75) totalRebate += rebates.tertiary;

  let annualMedicalCredits = 0;
  if (medAidMembers > 0) {
    annualMedicalCredits += medical.main;
    if (medAidMembers > 1) annualMedicalCredits += medical.firstDep;
    if (medAidMembers > 2)
      annualMedicalCredits += (medAidMembers - 2) * medical.additional;
  }
  annualMedicalCredits *= 12;

  const taxAfterRebates = Math.max(0, normalTax - totalRebate);
  const finalTaxPayable = Math.max(0, taxAfterRebates - annualMedicalCredits);

  return {
    finalTaxPayable,
    allowableRetirement,
    taxableIncome,
    totalRebate,
    annualMedicalCredits,
    normalTax,
  };
}

function calculateFutureValue(
  monthlyContribution: number,
  currentAge: number,
  retirementAge = 65,
  annualReturnRate = 0.1
) {
  const yearsToGrow = retirementAge - currentAge;
  if (yearsToGrow <= 0) return 0;
  const months = yearsToGrow * 12;
  const monthlyRate = annualReturnRate / 12;
  return (
    monthlyContribution *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
  );
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

function BoostAdvice({
  age,
  currentGross,
  currentRetirement,
  otherDeductions,
  taxYear,
  medAidMembers,
  currentLiability,
}: {
  age: number;
  currentGross: number;
  currentRetirement: number;
  otherDeductions: number;
  taxYear: string;
  medAidMembers: number;
  currentLiability: number;
}) {
  if (age >= 65) return null;

  const build = (extraMonthly: number) => {
    const total = currentRetirement + extraMonthly * 12;
    const r = calculateAnnualTax(
      currentGross,
      total,
      otherDeductions,
      age,
      taxYear,
      medAidMembers
    );
    return {
      extraRefund: Math.max(0, currentLiability - r.finalTaxPayable),
      fv: calculateFutureValue(extraMonthly, age),
    };
  };

  const s1 = build(1000);
  const s2 = build(2000);

  return (
    <div className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm">
      <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-[#E8872E]" />
          </div>
          <h3 className="text-xl font-bold">Boost Your Refund</h3>
        </div>
        <p className="text-blue-100 text-sm max-w-2xl">
          Contributing more to a retirement annuity before year-end lowers your
          taxable income — growing next year&apos;s refund and your future wealth.
        </p>
      </div>

      <div className="p-6 bg-blue-50/40">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { label: "Contribute +R1,000 pm", data: s1, tag: "OPTION A" },
            { label: "Contribute +R2,000 pm", data: s2, tag: "OPTION B" },
          ].map((opt) => (
            <div
              key={opt.tag}
              className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm relative hover:border-[#0077BB]/40 transition-all"
            >
              <div className="absolute top-0 right-0 bg-[#0077BB]/10 text-[#0077BB] text-xs font-bold px-3 py-1 rounded-bl-xl tracking-wider">
                {opt.tag}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-50 p-2 rounded-full">
                  <TrendingUp className="w-5 h-5 text-[#0077BB]" />
                </div>
                <div className="font-bold text-slate-800">{opt.label}</div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                    Extra Refund
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">
                    R{" "}
                    {opt.data.extraRefund.toLocaleString("en-ZA", {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  <div className="text-xs text-slate-400">Back from SARS</div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                    Value at Age 65
                  </div>
                  <div className="text-xl font-bold text-[#0168A2]">
                    R{" "}
                    {opt.data.fv.toLocaleString("en-ZA", {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  <div className="text-xs text-slate-400">
                    Estimated capital (10% growth)
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-[#0077BB]/50 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            Projections assume 10% annual nominal growth compounded monthly.
            Inflation and fund fees are not factored in. Tax savings are based on
            your current marginal rate and available limits.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaxRefundPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [grossIncome, setGrossIncome] = useState(35000);
  const [payePaid, setPayePaid] = useState(5000);
  const [age, setAge] = useState(30);
  const [retirementContrib, setRetirementContrib] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [medAidMembers, setMedAidMembers] = useState(0);

  const results = useMemo(() => {
    const toAnnual = (v: number) => (period === "monthly" ? v * 12 : v);
    const annualGross = toAnnual(grossIncome);
    const annualPayePaid = toAnnual(payePaid);
    const annualRetirementInput = toAnnual(retirementContrib);
    const annualOther = toAnnual(otherDeductions);

    const tax = calculateAnnualTax(
      annualGross,
      annualRetirementInput,
      annualOther,
      age,
      taxYear,
      medAidMembers
    );

    // Refund is positive when you paid more PAYE than you actually owed.
    const refund = annualPayePaid - tax.finalTaxPayable;

    return {
      annualGross,
      annualPayePaid,
      annualRetirementInput,
      annualOther,
      ...tax,
      refund,
      isRefund: refund >= 0,
    };
  }, [
    grossIncome,
    payePaid,
    period,
    age,
    retirementContrib,
    otherDeductions,
    medAidMembers,
    taxYear,
  ]);

  const fmt = (n: number) =>
    Math.abs(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    { name: "Tax Due", value: results.finalTaxPayable, color: "#0077BB" },
    { name: "PAYE Paid", value: results.annualPayePaid, color: "#E8872E" },
  ];

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Income Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Tax Refund Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Find out if SARS owes you money. Estimate your refund (or amount
              owing) by comparing the PAYE deducted from your salary with the tax
              you actually owe for the year.
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

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="Select the year of assessment you are filing for (1 March – 28/29 February)."
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

              {/* Gross Income */}
              <InputGroup
                label="Gross Income"
                icon={Wallet}
                helpText="Your total earnings before any deductions, per the period selected above."
              >
                <RandInput value={grossIncome} onChange={setGrossIncome} />
              </InputGroup>

              {/* PAYE Paid */}
              <InputGroup
                label="PAYE / Tax Deducted"
                icon={Landmark}
                helpText="The total PAYE tax your employer withheld and paid to SARS on your behalf. Find this on your IRP5 or payslips."
              >
                <RandInput value={payePaid} onChange={setPayePaid} />
              </InputGroup>

              {/* Age */}
              <InputGroup
                label="Age"
                icon={RefreshCcw}
                helpText="Age determines your primary, secondary, or tertiary tax rebate."
              >
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
                    <span>Under 65</span>
                    <span>65–74</span>
                    <span>75+</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={85}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#0077BB]"
                  />
                  <div className="text-center font-bold text-[#0077BB] bg-blue-50 py-1.5 rounded-lg text-sm">
                    {age} years old
                  </div>
                </div>
              </InputGroup>

              {/* Retirement */}
              <InputGroup
                label="Pension / RA Contribution"
                icon={PiggyBank}
                helpText="Contributions to Pension, Provident, or Retirement Annuity funds reduce your taxable income (up to limits)."
              >
                <RandInput
                  value={retirementContrib}
                  onChange={setRetirementContrib}
                />
                <p className="mt-2 text-xs text-slate-400">
                  Limit: 27.5% of income or R
                  {TAX_DATA[taxYear].raCap.toLocaleString("en-ZA")}/year —
                  calculated automatically.
                </p>
              </InputGroup>

              {/* Other deductions */}
              <InputGroup
                label="Other Deductions"
                icon={Receipt}
                helpText="Other allowable deductions such as donations to registered PBOs (up to 10% of taxable income) or income-protection claims. Leave at 0 if unsure."
              >
                <RandInput
                  value={otherDeductions}
                  onChange={setOtherDeductions}
                />
              </InputGroup>

              {/* Medical Aid */}
              <InputGroup
                label="Medical Aid Members"
                icon={HeartPulse}
                helpText="Total number of people on your medical aid plan (main member + dependants)."
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() =>
                      setMedAidMembers(Math.max(0, medAidMembers - 1))
                    }
                    className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-[#0077BB] hover:text-[#0077BB] transition-colors font-bold text-lg"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center font-bold text-xl text-slate-800">
                    {medAidMembers}
                  </div>
                  <button
                    onClick={() => setMedAidMembers(medAidMembers + 1)}
                    className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-[#0077BB] hover:text-[#0077BB] transition-colors font-bold text-lg"
                  >
                    +
                  </button>
                </div>
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This calculator provides estimates only and does not constitute
                tax advice. Your actual SARS assessment may differ. Consult a
                registered tax professional for your personal situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div
              className={`rounded-2xl shadow-xl text-white p-8 ${
                results.isRefund
                  ? "bg-gradient-to-br from-emerald-600 to-emerald-800"
                  : "bg-gradient-to-br from-[#E8872E] to-[#b45f16]"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="font-medium mb-1 text-sm text-white/80">
                    {results.isRefund
                      ? "Estimated Refund Due"
                      : "Estimated Amount Owing"}
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(results.refund)}
                  </div>
                  <p className="text-sm text-white/80 mt-2 max-w-sm">
                    {results.isRefund
                      ? "SARS may owe you this amount once you file your return."
                      : "You may owe SARS this amount when you file your return."}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl">
                  {results.isRefund ? (
                    <ArrowDownCircle className="w-8 h-8 text-white" />
                  ) : (
                    <ArrowUpCircle className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-white/80 text-sm mb-1">Tax You Owe</p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.finalTaxPayable)}
                  </p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">PAYE You Paid</p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.annualPayePaid)}
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
                  Owed vs Paid
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <RechartsTooltip
                        formatter={(value: number | string | undefined) =>
                          `R ${Number(value ?? 0).toLocaleString("en-ZA", {
                            maximumFractionDigits: 0,
                          })}`
                        }
                        cursor={{ fill: "#f1f5f9" }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <Row
                    label="Taxable Income"
                    value={`R ${fmt(results.taxableIncome)}`}
                  />
                  <Row
                    label="Tax Before Rebates"
                    value={`R ${fmt(results.normalTax)}`}
                  />
                  <Row
                    label="Age Rebate"
                    value={`− R ${fmt(results.totalRebate)}`}
                    green
                  />
                  {results.annualMedicalCredits > 0 && (
                    <Row
                      label="Medical Credits"
                      value={`− R ${fmt(results.annualMedicalCredits)}`}
                      green
                    />
                  )}
                  <div className="h-px bg-slate-100" />
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Tax You Owe</span>
                    <span>R {fmt(results.finalTaxPayable)}</span>
                  </div>
                  <Row
                    label="PAYE Already Paid"
                    value={`− R ${fmt(results.annualPayePaid)}`}
                    accent
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div
                      className={`flex justify-between font-bold ${
                        results.isRefund ? "text-emerald-600" : "text-[#E8872E]"
                      }`}
                    >
                      <span>
                        {results.isRefund ? "Refund Due" : "Owing to SARS"}
                      </span>
                      <span>R {fmt(results.refund)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Boost advice */}
            <BoostAdvice
              age={age}
              currentGross={results.annualGross}
              currentRetirement={results.annualRetirementInput}
              otherDeductions={results.annualOther}
              taxYear={taxYear}
              medAidMembers={medAidMembers}
              currentLiability={results.finalTaxPayable}
            />
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
      className={`flex justify-between text-sm ${
        green
          ? "text-emerald-600"
          : accent
          ? "text-[#0077BB] font-medium"
          : "text-slate-600"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
