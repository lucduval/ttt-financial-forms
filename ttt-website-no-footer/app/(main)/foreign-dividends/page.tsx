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
  Coins,
  Wallet,
  Info,
  ChevronDown,
  Calendar,
  Percent,
  Globe,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Landmark,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS income tax tables per year of assessment (1 March – 28/29 February). A
// taxable foreign dividend is included in gross income under paragraph (k) of
// the "gross income" definition, partially exempted under section 10B(3), and
// the balance is taxed at the taxpayer's marginal rate.

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

// Section 10B(3)(b)(ii)(aa): for a natural person, deceased estate, insolvent
// estate or trust the exempt ratio is 25 to 45, which leaves 20/45 of the
// dividend in taxable income and produces a maximum effective rate of normal
// tax of 20% — the same as the dividends tax rate. Unchanged for 2024–2027.
const EXEMPT_RATIO = 25 / 45;
const TAXABLE_RATIO = 20 / 45;

// Dividends tax on a South African dividend, and on a foreign dividend paid in
// cash in respect of a share listed on a South African exchange (paragraph (b)
// of the "dividend" definition in section 64D). 20% since 22 February 2017.
const DIVIDENDS_TAX_RATE = 0.2;

// Participation exemption test in section 10B(2)(a): at least 10% of the equity
// shares and voting rights in the company declaring the dividend.
const PARTICIPATION_THRESHOLD = 10;

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

function s6Rebates(age: number, taxYear: string) {
  const { rebates } = TAX_DATA[taxYear];
  let rebate = rebates.primary;
  if (age >= 65) rebate += rebates.secondary;
  if (age >= 75) rebate += rebates.tertiary;
  return rebate;
}

function marginalRate(taxableIncome: number, taxYear: string) {
  const { brackets } = TAX_DATA[taxYear];
  for (const b of brackets) {
    if (taxableIncome <= b.limit) return b.rate;
  }
  return brackets[brackets.length - 1].rate;
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
          suffix ? "pl-4 pr-14" : "pl-8 pr-4"
        } py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800`}
        placeholder="0"
        min={0}
      />
      {suffix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm pointer-events-none">
          {suffix}
        </div>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (b: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
        checked
          ? "bg-[#0077BB]/5 border-[#0077BB]/40"
          : "bg-slate-50 border-slate-200 hover:border-slate-300"
      }`}
    >
      <span
        className={`mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-all ${
          checked ? "bg-[#0077BB] border-[#0077BB]" : "bg-white border-slate-300"
        }`}
      >
        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </span>
      <span>
        <span
          className={`block text-sm font-semibold ${
            checked ? "text-[#0077BB]" : "text-slate-700"
          }`}
        >
          {label}
        </span>
        {hint && (
          <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ForeignDividendsPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [age, setAge] = useState(40);
  const [otherIncome, setOtherIncome] = useState(750000);

  const [dividend, setDividend] = useState(100000);
  const [foreignTaxRate, setForeignTaxRate] = useState(15);
  const [holding, setHolding] = useState(2); // % of equity shares & voting rights
  const [jseListed, setJseListed] = useState(false);
  const [expenses, setExpenses] = useState(0);

  const results = useMemo(() => {
    const gross = Math.max(0, dividend);
    const foreignTax = (gross * Math.max(0, foreignTaxRate)) / 100;
    const rebates = s6Rebates(age, taxYear);

    // Which exemption applies?
    const participation = holding >= PARTICIPATION_THRESHOLD; // s 10B(2)(a)
    const listedExempt = jseListed; // s 10B(2)(d) — cash dividend, listed share
    const fullyExempt = participation || listedExempt;

    // Section 64D dividends tax is withheld on a foreign dividend paid in cash
    // on a South African listed share, whatever the size of the holding.
    const dividendsTax = jseListed ? gross * DIVIDENDS_TAX_RATE : 0;

    const exemptPortion = fullyExempt ? gross : gross * EXEMPT_RATIO;
    const taxablePortion = fullyExempt ? 0 : gross * TAXABLE_RATIO;

    // Full assessment with and without the dividend, so the s 6quat(1B)(a)
    // limitation formula can be applied exactly as SARS sets it out.
    const totalTaxableIncome = otherIncome + taxablePortion;
    const taxBeforeRebates = normalTax(totalTaxableIncome, taxYear);
    const limitation =
      totalTaxableIncome > 0
        ? (taxablePortion / totalTaxableIncome) * taxBeforeRebates
        : 0;

    // Paragraph (ii) of the proviso to s 6quat(1A): the foreign tax on the
    // portion exempted by s 10B(3) still counts towards the rebate. Only where
    // nothing is included in taxable income (a full exemption) is there no
    // rebate at all.
    const rebateAvailable = fullyExempt ? 0 : foreignTax;
    const s6quatRebate = Math.min(rebateAvailable, limitation);
    const s6quatCarryForward = Math.max(0, rebateAvailable - s6quatRebate);

    const taxWithDividend = Math.max(
      0,
      taxBeforeRebates - rebates - s6quatRebate
    );
    const taxWithoutDividend = Math.max(
      0,
      normalTax(otherIncome, taxYear) - rebates
    );
    const normalTaxOnDividend = taxWithDividend - taxWithoutDividend;

    const totalTax = foreignTax + dividendsTax + normalTaxOnDividend;
    const netCash = gross - totalTax;
    const effectiveRate = gross > 0 ? (totalTax / gross) * 100 : 0;
    const margRate = marginalRate(totalTaxableIncome, taxYear);

    // Comparison legs on the same rand amount.
    const localDividendTax = gross * DIVIDENDS_TAX_RATE;
    const localNet = gross - localDividendTax;
    const noReliefTax = gross * margRate; // if the whole dividend were taxable
    const noReliefNet = gross - noReliefTax;

    return {
      gross,
      foreignTax,
      participation,
      listedExempt,
      fullyExempt,
      dividendsTax,
      exemptPortion,
      taxablePortion,
      taxBeforeRebates,
      rebates,
      limitation,
      s6quatRebate,
      s6quatCarryForward,
      totalTaxableIncome,
      normalTaxOnDividend,
      totalTax,
      netCash,
      effectiveRate,
      margRate,
      localDividendTax,
      localNet,
      noReliefTax,
      noReliefNet,
    };
  }, [dividend, foreignTaxRate, holding, jseListed, age, otherIncome, taxYear]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    {
      name: "This dividend",
      value: Math.max(0, results.netCash),
      color: "#0077BB",
    },
    {
      name: "Local dividend",
      value: Math.max(0, results.localNet),
      color: "#10b981",
    },
    {
      name: "No 10B relief",
      value: Math.max(0, results.noReliefNet),
      color: "#94a3b8",
    },
  ];

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Income Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Foreign Dividends Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Dividends from offshore shares are taxable in South Africa — but
              section 10B exempts 25/45 of them, capping the effective rate at
              20%. Work out the tax, the foreign tax credit, and what you
              actually keep.
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
                helpText="Select the year of assessment (1 March – 28/29 February). The 25/45 ratio has applied since the 2018 year of assessment."
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

              {/* Age */}
              <InputGroup
                label="Age"
                icon={Calendar}
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

              {/* Other income */}
              <InputGroup
                label="Your Other Taxable Income (annual)"
                icon={Wallet}
                helpText="Your salary and other taxable income for the year, excluding this dividend. This sets the marginal rate and drives the section 6quat credit limit."
              >
                <RandInput value={otherIncome} onChange={setOtherIncome} />
              </InputGroup>

              <div className="h-px bg-slate-100 my-6" />

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Globe size={12} /> The Foreign Dividend
              </p>

              <InputGroup
                label="Foreign Dividend Received (gross, in rand)"
                icon={Coins}
                helpText="The gross dividend before any foreign tax was withheld, translated to rand at the spot rate on the date of accrual or the average rate for the year (section 25D)."
              >
                <RandInput value={dividend} onChange={setDividend} />
              </InputGroup>

              <InputGroup
                label="Foreign Withholding Tax"
                icon={Percent}
                helpText="The rate the source country withheld. 15% is the usual treaty rate on US dividends where a W-8BEN is on file; the US statutory rate without one is 30%."
              >
                <RandInput
                  value={foreignTaxRate}
                  onChange={setForeignTaxRate}
                  suffix="%"
                />
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  R {fmt(results.foreignTax)} withheld offshore.
                </p>
              </InputGroup>

              <InputGroup
                label="Your Shareholding"
                icon={TrendingUp}
                helpText="Section 10B(2)(a) exempts the dividend entirely where you hold at least 10% of the equity shares AND the voting rights in the company. Most portfolio investors are far below that."
              >
                <RandInput value={holding} onChange={setHolding} suffix="%" />
                <p
                  className={`mt-2 text-xs leading-relaxed ${
                    results.participation
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2"
                      : "text-slate-500"
                  }`}
                >
                  {results.participation
                    ? "10% or more — the participation exemption applies and the dividend is fully exempt from normal tax."
                    : "Under 10% — no participation exemption, so the 25/45 partial exemption applies."}
                </p>
              </InputGroup>

              <InputGroup
                label="Listed on the JSE?"
                icon={Landmark}
                helpText="A cash foreign dividend on a share listed on a South African exchange is exempt from normal tax under section 10B(2)(d), but dividends tax at 20% is withheld instead. If a company is dual-listed, only the shares held on the SA register qualify."
              >
                <Toggle
                  checked={jseListed}
                  onChange={setJseListed}
                  label="I hold these shares on a South African exchange"
                  hint="Dual-listed shares only qualify for the shares listed here — not the offshore line."
                />
              </InputGroup>

              <InputGroup
                label="Expenses Incurred (not deductible)"
                icon={Receipt}
                helpText="Section 23(q) prohibits any deduction for expenditure incurred in producing foreign dividend income — platform fees, and interest on money borrowed to buy the shares. Section 23(f) blocks the rest."
              >
                <RandInput value={expenses} onChange={setExpenses} />
                <p className="mt-2 text-xs text-[#b45f16] bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-lg px-3 py-2 leading-relaxed">
                  Nothing here is deductible — sections 23(f) and 23(q) block
                  every expense incurred in producing a foreign dividend.
                </p>
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This calculator provides estimates only and does not constitute
                tax advice. It models a resident natural person receiving a cash
                foreign dividend. Out of scope: dividends in specie, the
                country-to-country exemption in section 10B(2)(b), controlled
                foreign company rules, foreign collective investment schemes and
                the other carve-outs in sections 10B(4) to 10B(6A) — including
                dividends received for services rendered or on restricted equity
                instruments, where no exemption is available at all. The section
                6quat credit shown follows the section 6quat(1B)(a) limitation;
                a tax treaty may change the outcome. Consult a registered tax
                professional for your situation.
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
                    Total Tax on This Dividend
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(results.totalTax)}
                  </div>
                  <p className="text-sm mt-2 text-blue-100">
                    An effective rate of {results.effectiveRate.toFixed(1)}% on
                    the gross dividend
                    {results.foreignTax > 0
                      ? `, including R ${fmt(
                          results.foreignTax
                        )} withheld offshore.`
                      : "."}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl">
                  <Coins className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-sm mb-1 text-blue-100">Exempt Portion</p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.exemptPortion)}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">Taxable Portion</p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.taxablePortion)}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">Cash You Keep</p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.netCash)}
                  </p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 -mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {TAX_DATA[taxYear].label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Percent size={12} className="text-[#0077BB]" />
                {results.fullyExempt
                  ? "Fully exempt from normal tax"
                  : "Partial exemption 25/45 — section 10B(3)"}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <TrendingUp size={12} className="text-[#0077BB]" />
                Marginal rate {(results.margRate * 100).toFixed(0)}%
              </span>
            </div>

            {/* Which exemption applies */}
            <div
              className={`rounded-2xl border p-5 flex gap-3 ${
                results.fullyExempt
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <CheckCircle2
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  results.fullyExempt ? "text-emerald-600" : "text-[#0077BB]"
                }`}
              />
              <div className="text-sm text-slate-700 leading-relaxed">
                {results.listedExempt ? (
                  <>
                    <span className="font-semibold">
                      Exempt from normal tax — section 10B(2)(d).
                    </span>{" "}
                    A cash foreign dividend on a share listed on a South African
                    exchange escapes normal tax entirely. In its place,{" "}
                    <strong>dividends tax at 20%</strong> (R{" "}
                    {fmt(results.dividendsTax)}) is withheld by the regulated
                    intermediary — the same treatment as a local dividend. If
                    the source country also withheld tax, there is no section
                    6quat credit for it, because nothing is included in your
                    taxable income.
                  </>
                ) : results.participation ? (
                  <>
                    <span className="font-semibold">
                      Exempt from normal tax — the participation exemption,
                      section 10B(2)(a).
                    </span>{" "}
                    You hold at least 10% of the equity shares and voting
                    rights, so the whole dividend is exempt. There is no South
                    African dividends tax on an unlisted foreign share, but any
                    foreign withholding tax is a dead cost — no section 6quat
                    credit arises because nothing enters your taxable income.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">
                      Partially exempt — section 10B(3).
                    </span>{" "}
                    25/45 of the dividend (R {fmt(results.exemptPortion)}) is
                    exempt, leaving 20/45 (R {fmt(results.taxablePortion)}) in
                    your taxable income at your{" "}
                    {(results.margRate * 100).toFixed(0)}% marginal rate. That
                    formula is designed so the effective rate never exceeds 20%
                    — matching dividends tax — and it lands below 20% for anyone
                    not in the top bracket.
                  </>
                )}
              </div>
            </div>

            {/* The interest-exemption warning */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-2xl p-5 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold">
                  The R23 800 interest exemption does not apply to dividends.
                </span>{" "}
                Section 10(1)(i) exempts <em>interest</em> from a South African
                source only. There is no equivalent tax-free slice for foreign
                dividends — the 25/45 formula is the entire relief, and it
                starts at the first rand.
              </p>
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  What You Keep, Compared
                </h3>
                <div className="h-56">
                  {results.gross > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          tickFormatter={(v: number) =>
                            `${Math.round(v / 1000)}k`
                          }
                        />
                        <RechartsTooltip
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
                      Enter a dividend amount to compare.
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                  The grey bar shows what would be left if the whole dividend
                  were taxed at your marginal rate with no section 10B relief.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <Row
                    label="Foreign dividend in gross income"
                    value={`R ${fmt(results.gross)}`}
                  />
                  {results.fullyExempt ? (
                    <Row
                      label={
                        results.listedExempt
                          ? "Less: exempt — s 10B(2)(d)"
                          : "Less: exempt — s 10B(2)(a)"
                      }
                      value={`− R ${fmt(results.exemptPortion)}`}
                      accent
                    />
                  ) : (
                    <Row
                      label="Less: exempt — s 10B(3) [25/45]"
                      value={`− R ${fmt(results.exemptPortion)}`}
                      accent
                    />
                  )}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-800 text-sm">
                      <span>Taxable Foreign Dividend</span>
                      <span>R {fmt(results.taxablePortion)}</span>
                    </div>
                  </div>
                  <Row
                    label="Your other taxable income"
                    value={`R ${fmt(otherIncome)}`}
                  />
                  <Row
                    label="Total taxable income"
                    value={`R ${fmt(results.totalTaxableIncome)}`}
                  />
                  <Row
                    label="Normal tax before rebates"
                    value={`R ${fmt(results.taxBeforeRebates)}`}
                  />
                  <Row
                    label="Less: section 6 rebates"
                    value={`− R ${fmt(results.rebates)}`}
                  />
                  {!results.fullyExempt && (
                    <>
                      <Row
                        label="Section 6quat credit limit"
                        value={`R ${fmt(results.limitation)}`}
                      />
                      <Row
                        label="Less: s 6quat foreign tax credit"
                        value={`− R ${fmt(results.s6quatRebate)}`}
                        accent
                      />
                    </>
                  )}
                  <div className="h-px bg-slate-100" />
                  <Row
                    label="Foreign withholding tax paid"
                    value={`R ${fmt(results.foreignTax)}`}
                  />
                  {results.dividendsTax > 0 && (
                    <Row
                      label="South African dividends tax at 20%"
                      value={`R ${fmt(results.dividendsTax)}`}
                    />
                  )}
                  <Row
                    label="SA normal tax on the dividend"
                    value={`R ${fmt(results.normalTaxOnDividend)}`}
                  />
                  {expenses > 0 && (
                    <Row
                      label="Expenses — not deductible (s 23(f), 23(q))"
                      value={`R ${fmt(expenses)}`}
                    />
                  )}
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-[#0077BB]">
                      <span>Total Tax</span>
                      <span>R {fmt(results.totalTax)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600">
                    <span>Cash After Tax</span>
                    <span>R {fmt(results.netCash)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    Effective rate on the gross dividend:{" "}
                    {results.effectiveRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Carry-forward warning */}
            {results.s6quatCarryForward > 0 && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-2xl p-5 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold">
                    R {fmt(results.s6quatCarryForward)} of your foreign tax
                    cannot be credited this year.
                  </span>{" "}
                  The section 6quat(1B)(a) formula caps the credit at R{" "}
                  {fmt(results.limitation)} — your foreign taxable income
                  divided by your total taxable income, times your normal tax
                  before rebates. The excess carries forward and can be used
                  against foreign tax in a later year, for up to seven years.
                </p>
              </div>
            )}

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                How foreign dividends are taxed
              </h3>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-800">
                    They go into gross income, not dividends tax.
                  </strong>{" "}
                  A dividend from an offshore company is included in your gross
                  income under paragraph (k) and taxed as normal income. It is
                  not subject to South African dividends tax — unless the share
                  is listed here.
                </p>
                <p>
                  <strong className="text-slate-800">
                    The 25/45 formula does the work.
                  </strong>{" "}
                  25/45 of the dividend is exempt, so 20/45 (44.4%) is taxable.
                  At the top 45% rate that is 45% × 20/45 = 20% of the gross —
                  deliberately equal to dividends tax.
                </p>
                <p>
                  <strong className="text-slate-800">
                    Dual-listed shares split two ways.
                  </strong>{" "}
                  Only the shares listed on a South African exchange qualify for
                  the section 10B(2)(d) exemption. Hold the same company&apos;s
                  offshore line and the dividend falls back to the 25/45
                  treatment.
                </p>
                <p>
                  <strong className="text-slate-800">
                    Foreign tax is credited, not deducted.
                  </strong>{" "}
                  Tax withheld abroad becomes a section 6quat rebate against
                  your South African tax, capped by a formula. Helpfully, the
                  proviso to section 6quat(1A) lets you count the foreign tax on
                  the exempt 25/45 portion too.
                </p>
                <p>
                  <strong className="text-slate-800">
                    No expenses, ever.
                  </strong>{" "}
                  Section 23(q) denies any deduction for costs of earning
                  foreign dividends, including interest on money borrowed to buy
                  the shares.
                </p>
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
