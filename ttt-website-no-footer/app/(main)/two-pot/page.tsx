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
  Coins,
  Wallet,
  Info,
  ChevronDown,
  RefreshCcw,
  Calendar,
  Percent,
  PiggyBank,
  AlertTriangle,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// Under the two-pot retirement system (from 1 September 2024), a withdrawal from
// the SAVINGS component is added to the member's taxable income for the year and
// taxed at their MARGINAL rate via a SARS tax directive — NOT the retirement
// withdrawal lump-sum table. So we need the normal income tax tables + rebates.

const TAX_DATA: Record<
  string,
  {
    label: string;
    brackets: { limit: number; rate: number; base: number }[];
    rebates: { primary: number; secondary: number; tertiary: number };
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
  },
};

const MIN_WITHDRAWAL = 2000;

// ─── Calculation Logic ────────────────────────────────────────────────────────

function taxAfterRebate(taxableIncome: number, age: number, taxYear: string) {
  const { brackets, rebates } = TAX_DATA[taxYear];

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

  let rebate = rebates.primary;
  if (age >= 65) rebate += rebates.secondary;
  if (age >= 75) rebate += rebates.tertiary;

  return Math.max(0, normalTax - rebate);
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

export default function TwoPotPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [income, setIncome] = useState(480000);
  const [withdrawal, setWithdrawal] = useState(30000);
  const [age, setAge] = useState(40);

  const results = useMemo(() => {
    const belowMinimum = withdrawal > 0 && withdrawal < MIN_WITHDRAWAL;

    const taxWithout = taxAfterRebate(income, age, taxYear);
    const taxWith = taxAfterRebate(income + withdrawal, age, taxYear);

    const tax = Math.max(0, taxWith - taxWithout);
    const net = Math.max(0, withdrawal - tax);
    const effectiveRate = withdrawal > 0 ? (tax / withdrawal) * 100 : 0;

    // Marginal rate = the top bracket the combined income falls into.
    const { brackets } = TAX_DATA[taxYear];
    const total = income + withdrawal;
    let marginal = brackets[0].rate;
    for (let i = 0; i < brackets.length; i++) {
      const prevLimit = i === 0 ? 0 : brackets[i - 1].limit;
      if (total > prevLimit) marginal = brackets[i].rate;
    }

    return { tax, net, effectiveRate, marginal, belowMinimum };
  }, [income, withdrawal, age, taxYear]);

  const fmt = (n: number) =>
    n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    { name: "In Your Pocket", value: results.net, color: "#10b981" },
    { name: "Tax", value: results.tax, color: "#0077BB" },
  ].filter((d) => d.value > 0);

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                Two-Pot Retirement System
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Two-Pot Withdrawal Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Thinking of dipping into your savings pot? A savings withdrawal is
              added to your income and taxed at your marginal rate — see what
              you&apos;ll keep after SARS takes its cut.
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
                Your Withdrawal
              </h2>

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="Select the year of assessment (1 March – 28/29 February) in which you make the withdrawal."
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

              {/* Annual income */}
              <InputGroup
                label="Annual Taxable Income"
                icon={Wallet}
                helpText="Your total taxable income for the year from salary and other sources, before this withdrawal. This sets the marginal rate at which the withdrawal is taxed."
              >
                <RandInput value={income} onChange={setIncome} />
              </InputGroup>

              {/* Withdrawal */}
              <InputGroup
                label="Savings Pot Withdrawal"
                icon={PiggyBank}
                helpText="The amount you want to withdraw from your savings component. The minimum allowed is R2,000, and only one withdrawal is permitted per tax year."
              >
                <RandInput value={withdrawal} onChange={setWithdrawal} />
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
                    className="calc-slider w-full cursor-pointer"
                  />
                  <div className="text-center font-bold text-[#0077BB] bg-blue-50 py-1.5 rounded-lg text-sm">
                    {age} years old
                  </div>
                </div>
              </InputGroup>

              {results.belowMinimum && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 -mt-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    The minimum savings-pot withdrawal is R2,000. A smaller
                    amount cannot be paid out.
                  </p>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimate only. SARS issues a tax directive at your marginal rate
                and may reduce the payout to settle any outstanding tax debt.
                Withdrawing erodes your retirement savings and the tax-free
                growth you would have earned. Consult a registered tax
                professional or financial adviser first.
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
                    You&apos;ll Receive
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    R {fmt(results.net)}
                  </div>
                  <p className="text-sm text-emerald-100 mt-2">
                    After R {fmt(results.tax)} tax on a R {fmt(withdrawal)}{" "}
                    withdrawal.
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl flex-shrink-0">
                  <Coins className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-emerald-100 text-xs sm:text-sm mb-1">
                    Tax on Withdrawal
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">R {fmt(results.tax)}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-xs sm:text-sm mb-1">Marginal Rate</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    {(results.marginal * 100).toFixed(0)}%
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
                  Where Your Withdrawal Goes
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
                  <Row
                    label="Taxable Income (before)"
                    value={`R ${fmt(income)}`}
                  />
                  <Row
                    label="Savings Withdrawal"
                    value={`+ R ${fmt(withdrawal)}`}
                  />
                  <div className="h-px bg-slate-100" />
                  <Row
                    label="Taxable Income (after)"
                    value={`R ${fmt(income + withdrawal)}`}
                  />
                  <Row
                    label="Tax on Withdrawal"
                    value={`− R ${fmt(results.tax)}`}
                    accent
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Net Withdrawal</span>
                      <span>R {fmt(results.net)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    Taxed at your marginal rate — the withdrawal stacks on top of
                    your income.
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
