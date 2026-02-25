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
  Calculator,
  Wallet,
  HeartPulse,
  PiggyBank,
  Info,
  ChevronDown,
  RefreshCcw,
  Calendar,
  Building2,
  TrendingUp,
  Sparkles,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────

const TAX_DATA: Record<
  string,
  {
    label: string;
    brackets: { limit: number; rate: number; base: number }[];
    rebates: { primary: number; secondary: number; tertiary: number };
    medical: { main: number; firstDep: number; additional: number };
  }
> = {
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
  },
};

const UIF_CEILING = 17712;

// ─── Calculation Logic ────────────────────────────────────────────────────────

function calculateAnnualTax(
  annualGross: number,
  annualRetirementInput: number,
  age: number,
  taxYear: string,
  medAidMembers: number
) {
  const { brackets, rebates, medical } = TAX_DATA[taxYear];

  const retirementCapPct = annualGross * 0.275;
  const retirementCapFixed = 350000;
  const allowableRetirement = Math.min(
    annualRetirementInput,
    retirementCapPct,
    retirementCapFixed
  );

  const taxableIncome = Math.max(0, annualGross - allowableRetirement);

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

function SmartAdvice({
  age,
  currentTax,
  currentGross,
  currentRetirement,
  taxYear,
  medAidMembers,
}: {
  age: number;
  currentTax: number;
  currentGross: number;
  currentRetirement: number;
  taxYear: string;
  medAidMembers: number;
}) {
  if (age >= 65) return null;

  const s1Total = currentRetirement + 1000 * 12;
  const s1Result = calculateAnnualTax(currentGross, s1Total, age, taxYear, medAidMembers);
  const s1Saved = currentTax - s1Result.finalTaxPayable;
  const s1FV = calculateFutureValue(1000, age);

  const s2Total = currentRetirement + 2000 * 12;
  const s2Result = calculateAnnualTax(currentGross, s2Total, age, taxYear, medAidMembers);
  const s2Saved = currentTax - s2Result.finalTaxPayable;
  const s2FV = calculateFutureValue(2000, age);

  return (
    <div className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm">
      <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-[#E8872E]" />
          </div>
          <h3 className="text-xl font-bold">Smart Optimisation Advice</h3>
        </div>
        <p className="text-blue-100 text-sm max-w-2xl">
          See how contributing a little more to your retirement annuity can lower your tax bill now and grow your wealth for later.
        </p>
      </div>

      <div className="p-6 bg-blue-50/40">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { label: "Contribute +R1,000 pm", saved: s1Saved, fv: s1FV, tag: "OPTION A" },
            { label: "Contribute +R2,000 pm", saved: s2Saved, fv: s2FV, tag: "OPTION B" },
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
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Annual Tax Saved</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    R {opt.saved.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-slate-400">Extra refund from SARS</div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Value at Age 65</div>
                  <div className="text-xl font-bold text-[#0168A2]">
                    R {opt.fv.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-slate-400">Estimated capital (10% growth)</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-[#0077BB]/50 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            Projections assume a 10% annual nominal growth rate compounded monthly. Inflation and fund fees are not factored into this illustration. Tax savings are based on your current marginal rate and available limits.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaxCalculatorPage() {
  const [taxYear, setTaxYear] = useState("2026");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [grossIncome, setGrossIncome] = useState(35000);
  const [age, setAge] = useState(30);
  const [retirementContrib, setRetirementContrib] = useState(0);
  const [medAidMembers, setMedAidMembers] = useState(0);

  const results = useMemo(() => {
    const annualGross = period === "monthly" ? grossIncome * 12 : grossIncome;
    const monthlyGross = annualGross / 12;
    const annualRetirementInput =
      period === "monthly" ? retirementContrib * 12 : retirementContrib;

    const taxResults = calculateAnnualTax(
      annualGross,
      annualRetirementInput,
      age,
      taxYear,
      medAidMembers
    );

    const monthlyUIF = Math.min(monthlyGross, UIF_CEILING) * 0.01;
    const annualUIF = monthlyUIF * 12;
    const annualSDL = annualGross * 0.01;
    const annualNetPay =
      annualGross -
      taxResults.finalTaxPayable -
      annualRetirementInput -
      annualUIF;

    const taxResultsNoRA = calculateAnnualTax(
      annualGross,
      0,
      age,
      taxYear,
      medAidMembers
    );
    const taxSaved = taxResultsNoRA.finalTaxPayable - taxResults.finalTaxPayable;

    return {
      annualGross,
      ...taxResults,
      annualNetPay,
      taxSaved,
      annualUIF,
      annualSDL,
      annualRetirementInput,
    };
  }, [grossIncome, period, age, retirementContrib, medAidMembers, taxYear]);

  const chartData = [
    { name: "Net Pay", value: results.annualNetPay, color: "#10b981" },
    { name: "Tax", value: results.finalTaxPayable, color: "#0077BB" },
    { name: "Pension", value: results.allowableRetirement, color: "#E8872E" },
    { name: "UIF", value: results.annualUIF, color: "#0168A2" },
  ].filter((d) => d.value > 0);

  const fmt = (n: number) =>
    n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Page Hero */}
      <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
              South African Income Tax
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            PAYE Tax Calculator
          </h1>
          <p className="text-blue-100 max-w-2xl text-base">
            Estimate your South African income tax, UIF, and net take-home pay instantly.
            Includes retirement annuity deductions and medical aid credits.
          </p>
        </div>
      </div>

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
                helpText="Select the financial year you want to calculate for (1 March – 28 February)."
              >
                <div className="relative">
                  <select
                    value={taxYear}
                    onChange={(e) => setTaxYear(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
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
                helpText="Your total earnings before any deductions."
              >
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R</div>
                  <input
                    type="number"
                    value={grossIncome}
                    onChange={(e) => setGrossIncome(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800"
                    placeholder="0"
                    min={0}
                  />
                </div>
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
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R</div>
                  <input
                    type="number"
                    value={retirementContrib}
                    onChange={(e) => setRetirementContrib(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800"
                    placeholder="0"
                    min={0}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Limit: 27.5% of income or R350,000/year — calculated automatically.
                </p>
              </InputGroup>

              {/* Medical Aid */}
              <InputGroup
                label="Medical Aid Members"
                icon={HeartPulse}
                helpText="Total number of people on your medical aid plan (main member + dependants)."
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setMedAidMembers(Math.max(0, medAidMembers - 1))}
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
                This calculator provides estimates only and does not constitute tax advice. Consult a registered tax professional for your personal situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Hero result card */}
            <div className="bg-gradient-to-br from-[#0077BB] to-[#01527e] rounded-2xl shadow-xl text-white p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-blue-200 font-medium mb-1 text-sm">Estimated Net Pay</p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(results.annualNetPay / 12)}
                    <span className="text-lg font-normal text-blue-200 ml-2">/ month</span>
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <Wallet className="w-8 h-8 text-blue-200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                <div>
                  <p className="text-blue-200 text-sm mb-1">Annual Net Pay</p>
                  <p className="text-xl font-semibold">R {fmt(results.annualNetPay)}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm mb-1">Total Tax (PAYE)</p>
                  <p className="text-xl font-semibold">R {fmt(results.finalTaxPayable)}</p>
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

            {/* Tax savings alert */}
            {results.taxSaved > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <div className="bg-emerald-100 p-2 rounded-full flex-shrink-0">
                  <PiggyBank className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-emerald-800">Smart Saving!</p>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    Your retirement contributions saved you{" "}
                    <span className="font-bold">R {fmt(results.taxSaved)}</span> in tax this year.
                  </p>
                </div>
              </div>
            )}

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">Salary Breakdown</h3>
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
                          `R ${Number(value ?? 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
                        }
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">Detailed Calculation</h3>
                <div className="space-y-3">
                  <Row label="Taxable Income" value={`R ${fmt(results.taxableIncome)}`} />
                  <Row
                    label="Tax Before Rebates"
                    value={`R ${fmt(results.finalTaxPayable + results.totalRebate + results.annualMedicalCredits)}`}
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
                    <span>Tax Due (PAYE)</span>
                    <span>R {fmt(results.finalTaxPayable)}</span>
                  </div>
                  <Row
                    label="UIF Contribution (1%)"
                    value={`R ${fmt(results.annualUIF)}`}
                    accent
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 size={11} /> Employer SDL (1%)
                      </span>
                      <span>R {fmt(results.annualSDL)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly slip */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                <span className="w-1 h-5 bg-slate-800 rounded-full mr-3" />
                Monthly Slip View
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SlipItem label="Gross Income" value={`R ${fmt(results.annualGross / 12)}`} />
                <SlipItem label="PAYE (Tax)" value={`R ${fmt(results.finalTaxPayable / 12)}`} negative />
                <SlipItem label="UIF" value={`R ${fmt(results.annualUIF / 12)}`} negative />
                <SlipItem label="Take Home" value={`R ${fmt(results.annualNetPay / 12)}`} highlight />
              </div>
            </div>

            {/* Smart Advice */}
            <SmartAdvice
              age={age}
              currentTax={results.finalTaxPayable}
              currentGross={results.annualGross}
              currentRetirement={results.annualRetirementInput}
              taxYear={taxYear}
              medAidMembers={medAidMembers}
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

function SlipItem({
  label,
  value,
  negative,
  highlight,
}: {
  label: string;
  value: string;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-xl ${
        highlight ? "bg-[#0077BB]/10 border border-[#0077BB]/20" : "bg-slate-50"
      }`}
    >
      <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
      <p
        className={`text-lg font-bold ${
          highlight
            ? "text-[#0077BB]"
            : negative
            ? "text-rose-600"
            : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
