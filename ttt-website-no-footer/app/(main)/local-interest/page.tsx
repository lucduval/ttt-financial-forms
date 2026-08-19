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
  Percent,
  Wallet,
  Info,
  ChevronDown,
  Calendar,
  Landmark,
  PiggyBank,
  Globe,
  Banknote,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS income tax tables per year of assessment (1 March – 28/29 February).
// Taxable local interest is added to taxable income and taxed at the marginal
// rate, so this calculator uses the same brackets/rebates as the PAYE calculator.
//
// The section 10(1)(i) interest exemption has been R23 800 (under 65) and
// R34 500 (65 and older) since the 2016 year of assessment and was confirmed
// unchanged by SARS for 2024–2027 (no change announced in the 25 February 2026
// Budget). It applies to interest "from a source in the Republic" only —
// foreign interest has no exempt portion — and expressly excludes interest on a
// tax free investment as defined in section 12T(1), so TFSA interest does not
// consume it.

const TAX_DATA: Record<
  string,
  {
    label: string;
    brackets: { limit: number; rate: number; base: number }[];
    rebates: { primary: number; secondary: number; tertiary: number };
    exemption: { under65: number; from65: number };
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
    exemption: { under65: 23800, from65: 34500 },
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
    exemption: { under65: 23800, from65: 34500 },
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
    exemption: { under65: 23800, from65: 34500 },
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
    exemption: { under65: 23800, from65: 34500 },
  },
};

// Withholding tax on interest (sections 50A–50H): 15% on interest from a South
// African source paid to a foreign person, from 1 March 2015. A tax treaty can
// reduce it, so the rate is an input.
const WTI_RATE = 15;

type Residency = "resident" | "nonResident" | "nonResidentCaught";

const RESIDENCY_OPTIONS: { value: Residency; label: string }[] = [
  { value: "resident", label: "South African tax resident" },
  { value: "nonResident", label: "Non-resident (in SA 183 days or less)" },
  {
    value: "nonResidentCaught",
    label: "Non-resident, in SA over 183 days or SA branch",
  },
];

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

function taxAfterRebate(taxableIncome: number, age: number, taxYear: string) {
  const { rebates } = TAX_DATA[taxYear];
  let rebate = rebates.primary;
  if (age >= 65) rebate += rebates.secondary;
  if (age >= 75) rebate += rebates.tertiary;
  return Math.max(0, normalTax(Math.max(0, taxableIncome), taxYear) - rebate);
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

export default function LocalInterestPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [age, setAge] = useState(40);
  const [residency, setResidency] = useState<Residency>("resident");
  const [otherIncome, setOtherIncome] = useState(450000);

  // Local interest by source. The exemption is per person, not per account —
  // these are added together before it is applied.
  const [bankInterest, setBankInterest] = useState(18000);
  const [moneyMarket, setMoneyMarket] = useState(9000);
  const [retailBonds, setRetailBonds] = useState(0);
  const [otherInterest, setOtherInterest] = useState(0);

  // Interest inside a TFSA is exempt under section 12T and is expressly carved
  // out of section 10(1)(i) — it never consumes the R23 800 / R34 500.
  const [tfsaInterest, setTfsaInterest] = useState(0);

  const [partYear, setPartYear] = useState(false);
  const [daysInYear, setDaysInYear] = useState(200);
  const [wtiRate, setWtiRate] = useState(WTI_RATE);

  const { exemption } = TAX_DATA[taxYear];

  const results = useMemo(() => {
    const sources = [
      { label: "Bank / savings account interest", value: bankInterest },
      { label: "Money market / unit trust interest", value: moneyMarket },
      { label: "SARS retail savings bonds", value: retailBonds },
      { label: "Other local interest", value: otherInterest },
    ];
    const totalInterest = sources.reduce((s, x) => s + x.value, 0);

    // Full-year exemption, pro-rated for a year of assessment shorter than 12
    // months (proviso to s 10(1)(i), from the 2024 year of assessment).
    const fullExemption = age >= 65 ? exemption.from65 : exemption.under65;
    const days = partYear ? Math.min(365, Math.max(0, daysInYear)) : 365;
    const availableExemption = partYear
      ? (fullExemption * days) / 365
      : fullExemption;

    // A non-resident's SA-source interest is wholly exempt from normal tax
    // under s 10(1)(h) and instead bears withholding tax on interest.
    const wholelyExemptNonResident = residency === "nonResident";

    const exemptionUsed = wholelyExemptNonResident
      ? 0
      : Math.min(totalInterest, availableExemption);
    const exemptionUnused = Math.max(0, availableExemption - exemptionUsed);
    const taxableInterest = wholelyExemptNonResident
      ? 0
      : Math.max(0, totalInterest - exemptionUsed);

    const taxWithout = taxAfterRebate(otherIncome, age, taxYear);
    const taxWith = taxAfterRebate(
      otherIncome + taxableInterest,
      age,
      taxYear
    );
    const normalTaxOnInterest = taxWith - taxWithout;

    // WTI is a final tax and applies instead of normal tax.
    const wti = wholelyExemptNonResident
      ? (totalInterest * wtiRate) / 100
      : 0;

    const totalTax = normalTaxOnInterest + wti;
    const netInterest = totalInterest - totalTax;
    const effectiveRate =
      totalInterest > 0 ? (totalTax / totalInterest) * 100 : 0;
    const margRate = marginalRate(otherIncome + taxableInterest, taxYear);

    return {
      sources,
      totalInterest,
      fullExemption,
      availableExemption,
      exemptionUsed,
      exemptionUnused,
      taxableInterest,
      normalTaxOnInterest,
      wti,
      totalTax,
      netInterest,
      effectiveRate,
      margRate,
      wholelyExemptNonResident,
      days,
    };
  }, [
    bankInterest,
    moneyMarket,
    retailBonds,
    otherInterest,
    age,
    exemption,
    partYear,
    daysInYear,
    residency,
    otherIncome,
    taxYear,
    wtiRate,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const allExempt = results.totalTax <= 0 && results.totalInterest > 0;

  const chartData = [
    {
      name: "Interest You Keep",
      value: Math.max(0, results.netInterest),
      color: "#10b981",
    },
    { name: "Tax", value: Math.max(0, results.totalTax), color: "#0077BB" },
  ].filter((d) => d.value > 0);

  const meterPct =
    results.availableExemption > 0
      ? Math.min(
          100,
          (results.exemptionUsed / results.availableExemption) * 100
        )
      : 0;

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Percent className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Income Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Taxable Local Interest Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Every South African gets a slice of local interest tax-free —
              R23 800 a year under 65, R34 500 from 65. Work out how much of
              your interest is exempt and what tax you owe on the rest.
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
                helpText="Select the year of assessment (1 March – 28/29 February). The interest exemption has been unchanged since 2016."
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
                helpText="Your age on the last day of the year of assessment. From 65 the exemption rises from R23 800 to R34 500, and you get the secondary rebate."
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
                    {age} years old — exemption R {fmt(results.fullExemption)}
                  </div>
                </div>
              </InputGroup>

              {/* Residency */}
              <InputGroup
                label="Tax Residency"
                icon={Globe}
                helpText="A non-resident's South African interest is exempt from normal tax under s 10(1)(h) and bears 15% withholding tax instead — unless they were in SA for more than 183 days in the preceding 12 months, or the debt is tied to a South African permanent establishment."
              >
                <div className="relative">
                  <select
                    value={residency}
                    onChange={(e) => setResidency(e.target.value as Residency)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    {RESIDENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </InputGroup>

              {residency === "nonResident" && (
                <InputGroup
                  label="Withholding Tax Rate"
                  icon={Percent}
                  helpText="15% is the domestic rate on interest paid to a foreign person from 1 March 2015. A double tax agreement may reduce it — check the treaty for your country of residence."
                >
                  <RandInput
                    value={wtiRate}
                    onChange={setWtiRate}
                    suffix="%"
                  />
                </InputGroup>
              )}

              {/* Other income */}
              <InputGroup
                label="Your Other Taxable Income (annual)"
                icon={Wallet}
                helpText="Your salary and other taxable income for the year, before the interest. This sets the marginal rate your taxable interest is taxed at."
              >
                <RandInput value={otherIncome} onChange={setOtherIncome} />
              </InputGroup>

              <div className="h-px bg-slate-100 my-6" />

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Banknote size={12} /> Local Interest Received (annual)
              </p>

              <InputGroup
                label="Bank / Savings Account Interest"
                icon={Landmark}
                helpText="The interest on your IT3(b) certificate from the bank — cheque, savings, notice and fixed deposit accounts."
              >
                <RandInput value={bankInterest} onChange={setBankInterest} />
              </InputGroup>
              <InputGroup
                label="Money Market / Unit Trust Interest"
                icon={TrendingUp}
                helpText="The interest portion distributed by a local money market or income unit trust. Dividends and capital gains from the same fund are taxed differently and go elsewhere on your return."
              >
                <RandInput value={moneyMarket} onChange={setMoneyMarket} />
              </InputGroup>
              <InputGroup
                label="SARS Retail Savings Bonds"
                icon={Landmark}
                helpText="Interest on RSA Retail Savings Bonds is ordinary local interest — it uses the same exemption."
              >
                <RandInput value={retailBonds} onChange={setRetailBonds} />
              </InputGroup>
              <InputGroup
                label="Other Local Interest"
                icon={Banknote}
                helpText="Interest on a loan you advanced, a mortgage bond you hold, interest from SARS on an overpayment, or interest from any other South African source."
              >
                <RandInput value={otherInterest} onChange={setOtherInterest} />
              </InputGroup>

              <InputGroup
                label="TFSA Interest (excluded)"
                icon={PiggyBank}
                helpText="Interest inside a tax-free savings account is exempt under section 12T and is expressly carved out of section 10(1)(i) — it is not taxed and does not use up your R23 800 / R34 500."
              >
                <RandInput value={tfsaInterest} onChange={setTfsaInterest} />
                <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 leading-relaxed">
                  Exempt under section 12T and excluded from section 10(1)(i) —
                  this does not consume your interest exemption.
                </p>
              </InputGroup>

              <div className="h-px bg-slate-100 my-6" />

              <InputGroup
                label="Part-Year of Assessment"
                icon={Calendar}
                helpText="Where a year of assessment is shorter than 12 months — you died, ceased to be a tax resident, or an estate was wound up — the proviso to s 10(1)(i) pro-rates the exemption by days ÷ 365. Applies from the 2024 year of assessment."
              >
                <Toggle
                  checked={partYear}
                  onChange={setPartYear}
                  label="My year of assessment is shorter than 12 months"
                  hint="Pro-rates the exemption by days ÷ 365."
                />
                {partYear && (
                  <div className="mt-3">
                    <RandInput
                      value={daysInYear}
                      onChange={setDaysInYear}
                      suffix="days"
                    />
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                      Exemption pro-rated to R{" "}
                      {fmt(results.availableExemption)} ({results.days} ÷ 365 ×
                      R {fmt(results.fullExemption)}).
                    </p>
                  </div>
                )}
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This calculator provides estimates only and does not constitute
                tax advice. It covers <strong>local</strong> interest — interest
                from a source in the Republic. Foreign interest has no exempt
                portion and is fully taxable (a section 6quat credit may apply
                for foreign tax). Interest in a joint account is split between
                the account holders in their share of it, and each holder has
                their own exemption. Interest earned by a trust or a company
                gets no exemption. Consult a registered tax professional for
                your situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div
              className={`rounded-2xl shadow-xl text-white p-8 ${
                allExempt
                  ? "bg-gradient-to-br from-emerald-600 to-emerald-800"
                  : "bg-gradient-to-br from-[#0077BB] to-[#01527e]"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p
                    className={`font-medium mb-1 text-sm ${
                      allExempt ? "text-emerald-100" : "text-blue-100"
                    }`}
                  >
                    {results.wholelyExemptNonResident
                      ? "Withholding Tax on Your Interest"
                      : "Tax on Your Local Interest"}
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(results.totalTax)}
                  </div>
                  <p
                    className={`text-sm mt-2 ${
                      allExempt ? "text-emerald-100" : "text-blue-100"
                    }`}
                  >
                    {allExempt
                      ? "All of your interest is covered — nothing to pay."
                      : results.wholelyExemptNonResident
                        ? `A final ${wtiRate}% withheld at source. No normal tax and no return needed.`
                        : `R ${fmt(
                            results.taxableInterest
                          )} of your R ${fmt(
                            results.totalInterest
                          )} interest is taxable, at your ${(
                            results.margRate * 100
                          ).toFixed(0)}% marginal rate.`}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl">
                  <Percent className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      allExempt ? "text-emerald-100" : "text-blue-100"
                    }`}
                  >
                    Total Interest
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.totalInterest)}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      allExempt ? "text-emerald-100" : "text-blue-100"
                    }`}
                  >
                    Tax-Free
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.exemptionUsed)}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      allExempt ? "text-emerald-100" : "text-blue-100"
                    }`}
                  >
                    You Keep
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.netInterest)}
                  </p>
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
                <Percent size={12} className="text-[#0077BB]" />
                Section 10(1)(i) exemption R {fmt(results.availableExemption)}
              </span>
            </div>

            {/* Non-resident notice */}
            {residency !== "resident" && (
              <div
                className={`rounded-2xl border p-5 flex gap-3 ${
                  residency === "nonResident"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-[#E8872E]/10 border-[#E8872E]/30"
                }`}
              >
                <Globe
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    residency === "nonResident"
                      ? "text-[#0077BB]"
                      : "text-[#E8872E]"
                  }`}
                />
                <div className="text-sm text-slate-700 leading-relaxed">
                  {residency === "nonResident" ? (
                    <>
                      <span className="font-semibold">
                        You are taxed on the withholding basis.
                      </span>{" "}
                      Your South African interest is exempt from normal tax
                      under section 10(1)(h), so the R23 800 / R34 500
                      exemption is irrelevant to you — the whole amount escapes
                      normal tax. Instead the payer withholds{" "}
                      <strong>{wtiRate}%</strong> under sections 50A–50H and
                      pays it to SARS. That is a final tax.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">
                        The section 10(1)(h) exemption does not apply to you.
                      </span>{" "}
                      Because you were in South Africa for more than 183 days
                      in the 12 months before the interest accrued, or the debt
                      is effectively connected to a South African permanent
                      establishment, your interest is subject to{" "}
                      <strong>normal tax</strong> at your marginal rate — and,
                      for the same reason, it is exempt from withholding tax
                      under section 50D(3). Section 10(1)(i) is worded for
                      &quot;any taxpayer who is a natural person&quot; and is
                      not limited to residents, so the exemption is applied
                      here; get advice before relying on it.
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Exemption meter */}
            {!results.wholelyExemptNonResident && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-slate-800">
                    Your Tax-Free Interest Room
                  </h3>
                  <span className="text-xs text-slate-400">
                    per person, not per account
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      meterPct >= 100 ? "bg-[#E8872E]" : "bg-emerald-500"
                    }`}
                    style={{ width: `${meterPct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-slate-600">
                    Used{" "}
                    <strong className="text-slate-800">
                      R {fmt(results.exemptionUsed)}
                    </strong>
                  </span>
                  <span className="text-slate-600">
                    {results.exemptionUnused > 0 ? (
                      <>
                        Unused{" "}
                        <strong className="text-emerald-600">
                          R {fmt(results.exemptionUnused)}
                        </strong>
                      </>
                    ) : (
                      <strong className="text-[#E8872E]">
                        Exemption fully used
                      </strong>
                    )}
                  </span>
                </div>
                <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                  {results.exemptionUnused > 0
                    ? `You could earn a further R ${fmt(
                        results.exemptionUnused
                      )} of local interest this year without paying a cent of tax on it.`
                    : `Every extra rand of local interest is now taxed at your ${(
                        results.margRate * 100
                      ).toFixed(
                        0
                      )}% marginal rate. A TFSA is the usual next step — interest inside it is exempt and does not touch this allowance.`}
                </p>
              </div>
            )}

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Interest vs Tax
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
                      Enter the interest you received to see the split.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  {results.sources
                    .filter((s) => s.value > 0)
                    .map((s) => (
                      <Row
                        key={s.label}
                        label={s.label}
                        value={`R ${fmt(s.value)}`}
                      />
                    ))}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-800 text-sm">
                      <span>Total Local Interest</span>
                      <span>R {fmt(results.totalInterest)}</span>
                    </div>
                  </div>
                  {results.wholelyExemptNonResident ? (
                    <>
                      <Row
                        label="Exempt — section 10(1)(h)"
                        value={`− R ${fmt(results.totalInterest)}`}
                        accent
                      />
                      <Row
                        label={`Withholding tax at ${wtiRate}%`}
                        value={`R ${fmt(results.wti)}`}
                        accent
                      />
                    </>
                  ) : (
                    <>
                      <Row
                        label="Less: section 10(1)(i) exemption"
                        value={`− R ${fmt(results.exemptionUsed)}`}
                        accent
                      />
                      <div className="pt-2 border-t border-dashed border-slate-200">
                        <div className="flex justify-between font-semibold text-slate-800 text-sm">
                          <span>Taxable Local Interest</span>
                          <span>R {fmt(results.taxableInterest)}</span>
                        </div>
                      </div>
                      <Row
                        label="Your other taxable income"
                        value={`R ${fmt(otherIncome)}`}
                      />
                      <Row
                        label={`Tax at your ${(
                          results.margRate * 100
                        ).toFixed(0)}% marginal rate`}
                        value={`R ${fmt(results.normalTaxOnInterest)}`}
                        accent
                      />
                    </>
                  )}
                  {tfsaInterest > 0 && (
                    <Row
                      label="TFSA interest (exempt, s 12T)"
                      value={`R ${fmt(tfsaInterest)}`}
                    />
                  )}
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Interest After Tax</span>
                      <span>R {fmt(results.netInterest)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    Effective tax on your interest:{" "}
                    {results.effectiveRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                How the interest exemption works
              </h3>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-800">
                    It is one allowance per person, not per account.
                  </strong>{" "}
                  Every local interest source you hold is added together first,
                  and the R{fmt(results.fullExemption)} comes off the total.
                  Splitting your money across five banks does not give you five
                  exemptions.
                </p>
                <p>
                  <strong className="text-slate-800">
                    Local interest only.
                  </strong>{" "}
                  Section 10(1)(i) exempts interest &quot;from a source in the
                  Republic&quot;. Interest from an offshore account is fully
                  taxable with no exempt portion — declare it separately on your
                  ITR12.
                </p>
                <p>
                  <strong className="text-slate-800">
                    A TFSA is on top, not instead.
                  </strong>{" "}
                  Interest on a tax free investment is exempt under section 12T
                  and is expressly excluded from section 10(1)(i), so it never
                  eats into this allowance.
                </p>
                <p>
                  <strong className="text-slate-800">
                    The taxable balance is taxed at your marginal rate.
                  </strong>{" "}
                  There is no separate rate for interest — the excess is added
                  to your other income and taxed in your top bracket, which is
                  why the same R10 000 of interest costs a 45% taxpayer far more
                  than an 18% one.
                </p>
              </div>
            </div>

            {/* Threshold note */}
            {results.taxableInterest > 0 && results.normalTaxOnInterest <= 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 leading-relaxed">
                  Your taxable interest exceeds the exemption, but your total
                  income for the year is still below the tax threshold once your
                  rebates are applied — so no tax is payable. You may still need
                  to file a return.
                </p>
              </div>
            )}
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
