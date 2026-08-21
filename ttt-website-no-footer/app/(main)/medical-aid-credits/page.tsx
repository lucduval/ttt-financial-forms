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
  HeartPulse,
  Info,
  ChevronDown,
  Calendar,
  Users,
  Stethoscope,
  Wallet,
  Percent,
  Accessibility,
  Minus,
  Plus,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS medical scheme fees tax credit (MTC) — fixed rand amounts PER MONTH.
// The additional medical expenses tax credit (AMTC, s6B) percentages/thresholds
// (25% / 33.3%, 4× / 3× the MTC, 7.5% of taxable income) have been unchanged for
// years and apply across all four years of assessment.

const TAX_DATA: Record<
  string,
  {
    label: string;
    // MTC per month: main member, first dependant, each additional dependant.
    mtc: { main: number; first: number; additional: number };
  }
> = {
  "2027": {
    label: "2027 (Mar 2026 – Feb 2027)",
    mtc: { main: 376, first: 376, additional: 254 },
  },
  "2026": {
    label: "2026 (Mar 2025 – Feb 2026)",
    mtc: { main: 364, first: 364, additional: 246 },
  },
  "2025": {
    label: "2025 (Mar 2024 – Feb 2025)",
    mtc: { main: 364, first: 364, additional: 246 },
  },
  "2024": {
    label: "2024 (Mar 2023 – Feb 2024)",
    mtc: { main: 364, first: 364, additional: 246 },
  },
};

// ─── Calculation Logic ────────────────────────────────────────────────────────

function monthlyMTC(
  dependants: number,
  rates: { main: number; first: number; additional: number }
) {
  let credit = rates.main;
  if (dependants >= 1) credit += rates.first;
  if (dependants >= 2) credit += (dependants - 1) * rates.additional;
  return credit;
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

function Stepper({
  value,
  onChange,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        aria-label="Decrease"
      >
        <Minus size={16} />
      </button>
      <div className="flex-1 text-center font-bold text-[#0077BB] bg-blue-50 py-2.5 rounded-xl text-sm">
        {value} {suffix}
        {value === 1 ? "" : "s"}
      </div>
      <button
        onClick={() => onChange(value + 1)}
        className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        aria-label="Increase"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MedicalAidCreditsPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [dependants, setDependants] = useState(2);
  const [age, setAge] = useState(40);
  const [disability, setDisability] = useState(false);
  const [monthlyContribution, setMonthlyContribution] = useState(4500);
  const [outOfPocket, setOutOfPocket] = useState(25000);
  const [taxableIncome, setTaxableIncome] = useState(350000);

  const results = useMemo(() => {
    const { mtc } = TAX_DATA[taxYear];
    const perMonthMTC = monthlyMTC(dependants, mtc);
    const annualMTC = perMonthMTC * 12;

    const annualContribution = monthlyContribution * 12;
    const higherRelief = age >= 65 || disability;

    let amtc = 0;
    let excessContribution = 0;
    let threshold = 0;
    let aggregate = 0;

    if (higherRelief) {
      // 65+/disability: 33.3% of (contributions over 3× MTC + other qualifying spend).
      excessContribution = Math.max(0, annualContribution - 3 * annualMTC);
      aggregate = excessContribution + outOfPocket;
      amtc = 0.333 * aggregate;
    } else {
      // Under 65: 25% of the amount by which (contributions over 4× MTC + other
      // qualifying spend) exceeds 7.5% of taxable income.
      excessContribution = Math.max(0, annualContribution - 4 * annualMTC);
      aggregate = excessContribution + outOfPocket;
      threshold = 0.075 * taxableIncome;
      amtc = 0.25 * Math.max(0, aggregate - threshold);
    }

    const totalCredit = annualMTC + amtc;

    return {
      perMonthMTC,
      annualMTC,
      annualContribution,
      higherRelief,
      excessContribution,
      threshold,
      aggregate,
      amtc,
      totalCredit,
    };
  }, [
    taxYear,
    dependants,
    age,
    disability,
    monthlyContribution,
    outOfPocket,
    taxableIncome,
  ]);

  const fmt = (n: number) =>
    n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    { name: "Scheme Credit (MTC)", value: results.annualMTC, color: "#0077BB" },
    { name: "Additional Credit (AMTC)", value: results.amtc, color: "#10b981" },
  ].filter((d) => d.value > 0);

  const members = dependants + 1;

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <HeartPulse className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Medical Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Medical Aid Tax Credits Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Work out your SARS medical scheme fees tax credit and the extra
              relief on out-of-pocket medical costs — the amount that comes
              straight off your tax bill.
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
                Your Medical Cover
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

              {/* Dependants */}
              <InputGroup
                label="Dependants on the Scheme"
                icon={Users}
                helpText="People on your medical scheme besides yourself (the main member). The first dependant earns the same credit as the main member; each additional dependant earns a lower credit."
              >
                <Stepper
                  value={dependants}
                  onChange={setDependants}
                  suffix="dependant"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {members} {members === 1 ? "person" : "people"} on the scheme
                  (you + {dependants}).
                </p>
              </InputGroup>

              {/* Monthly contribution */}
              <InputGroup
                label="Monthly Contribution"
                icon={Wallet}
                helpText="The total you pay to your medical scheme each month (your portion — exclude any part paid by your employer as a taxed benefit is already included in your contribution)."
              >
                <RandInput
                  value={monthlyContribution}
                  onChange={setMonthlyContribution}
                />
              </InputGroup>

              {/* Out-of-pocket */}
              <InputGroup
                label="Out-of-Pocket Medical Expenses (year)"
                icon={Stethoscope}
                helpText="Qualifying medical expenses you paid yourself for the year that the scheme did not cover — e.g. co-payments, above-threshold amounts, and other SARS-recognised medical costs."
              >
                <RandInput value={outOfPocket} onChange={setOutOfPocket} />
              </InputGroup>

              {/* Age */}
              <InputGroup
                label="Age"
                icon={HeartPulse}
                helpText="From age 65 the extra credit is calculated more generously (33.3% with no income threshold)."
              >
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
                    <span>Under 65</span>
                    <span>65+</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={85}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="calc-slider w-full cursor-pointer"
                  />
                  <div className="text-center font-bold text-[#0077BB] bg-blue-50 py-1.5 rounded-lg text-sm">
                    {age} years old
                  </div>
                </div>
              </InputGroup>

              {/* Disability */}
              <InputGroup
                label="Disability"
                icon={Accessibility}
                helpText="Tick if you, your spouse or a dependant has a disability as defined by SARS. This unlocks the more generous 33.3% calculation regardless of age."
              >
                <button
                  onClick={() => setDisability(!disability)}
                  className={`w-full py-3 text-sm font-semibold rounded-xl transition-all border ${
                    disability
                      ? "bg-[#0077BB] text-white border-[#0077BB]"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700"
                  }`}
                >
                  {disability
                    ? "Disability applies"
                    : "No disability"}
                </button>
              </InputGroup>

              {/* Taxable income — only relevant under 65 with no disability */}
              {!results.higherRelief && (
                <InputGroup
                  label="Taxable Income (year)"
                  icon={Percent}
                  helpText="Your annual taxable income. Under 65, only medical spend above 7.5% of your taxable income counts towards the additional credit."
                >
                  <RandInput
                    value={taxableIncome}
                    onChange={setTaxableIncome}
                  />
                </InputGroup>
              )}
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimate only. The medical scheme fees tax credit and additional
                medical expenses tax credit (s6A/s6B) reduce your tax payable,
                not your taxable income. Qualifying expenses must meet SARS
                rules. Consult a registered tax professional for your situation.
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
                    Total Medical Tax Credit (year)
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    R {fmt(results.totalCredit)}
                  </div>
                  <p className="text-sm text-emerald-100 mt-2">
                    Off your tax bill — R {fmt(results.totalCredit / 12)} a month
                    on average.
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl flex-shrink-0">
                  <HeartPulse className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-emerald-100 text-xs sm:text-sm mb-1">
                    Scheme Credit (MTC)
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(results.annualMTC)}
                  </p>
                </div>
                <div>
                  <p className="text-emerald-100 text-xs sm:text-sm mb-1">
                    Additional Credit
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">R {fmt(results.amtc)}</p>
                </div>
              </div>
            </div>

            {/* Tax year badge */}
            <div className="flex items-center gap-2 -mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {TAX_DATA[taxYear].label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Users size={12} className="text-[#0077BB]" />
                R{fmt(results.perMonthMTC)}/month scheme credit
              </span>
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Where Your Credit Comes From
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
                    <div className="h-full flex items-center justify-center text-sm text-slate-400 text-center px-4">
                      No credit calculated — check your inputs.
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
                    label="Monthly Scheme Credit"
                    value={`R ${fmt(results.perMonthMTC)}`}
                  />
                  <Row
                    label="Annual Scheme Credit (MTC)"
                    value={`R ${fmt(results.annualMTC)}`}
                  />
                  <div className="h-px bg-slate-100" />
                  <Row
                    label="Annual Contributions"
                    value={`R ${fmt(results.annualContribution)}`}
                  />
                  <Row
                    label={`Contributions over ${
                      results.higherRelief ? "3×" : "4×"
                    } the MTC`}
                    value={`R ${fmt(results.excessContribution)}`}
                  />
                  <Row
                    label="+ Out-of-Pocket Expenses"
                    value={`R ${fmt(outOfPocket)}`}
                  />
                  {!results.higherRelief && (
                    <Row
                      label="Less: 7.5% of taxable income"
                      value={`− R ${fmt(results.threshold)}`}
                      green
                    />
                  )}
                  <Row
                    label={`Additional Credit (${
                      results.higherRelief ? "33.3%" : "25%"
                    })`}
                    value={`R ${fmt(results.amtc)}`}
                    accent
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Total Tax Credit</span>
                      <span>R {fmt(results.totalCredit)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    {results.higherRelief
                      ? "Age 65+/disability — 33.3% relief, no income threshold."
                      : "Under 65 — 25% of medical spend above 7.5% of income."}
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
