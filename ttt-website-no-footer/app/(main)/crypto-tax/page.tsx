"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import {
  Bitcoin,
  Wallet,
  Info,
  ChevronDown,
  RefreshCcw,
  Calendar,
  Tag,
  Percent,
  Banknote,
  Pickaxe,
  ArrowLeftRight,
  TrendingDown,
  Scale,
  Coins,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS income tax tables + CGT parameters per year of assessment.
// A crypto asset disposal is taxed one of two ways (SARS Draft Guide to the
// Taxation of Crypto Assets, 1 July 2026):
//   • capital in nature → Eighth Schedule, 40% inclusion for individuals, after
//     the annual exclusion. Max effective rate 18%.
//   • revenue in nature → the profit falls into "gross income" and is taxed at
//     the marginal rate (18%–45%). No annual exclusion, no inclusion rate.
// There is no primary-residence style exclusion for crypto, and crypto assets
// are "financial instruments" [s 1(1)] excluded from "personal-use asset"
// [para 53(3)(e)], so there is no personal-use let-off either.

const TAX_DATA: Record<
  string,
  {
    label: string;
    brackets: { limit: number; rate: number; base: number }[];
    rebates: { primary: number; secondary: number; tertiary: number };
    cgt: { inclusion: number; annualExclusion: number };
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
    cgt: { inclusion: 0.4, annualExclusion: 50000 },
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
    cgt: { inclusion: 0.4, annualExclusion: 40000 },
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
    cgt: { inclusion: 0.4, annualExclusion: 40000 },
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
    cgt: { inclusion: 0.4, annualExclusion: 40000 },
  },
};

// ─── The SARS "capital or revenue?" factors ──────────────────────────────────
// Para 3.2.4 of the draft guide. SARS is explicit that no single factor is
// decisive and that they must be weighed in aggregate — so this panel only ever
// indicates a leaning, it never decides.

const FACTORS: { key: string; label: string; help: string }[] = [
  {
    key: "profitMotive",
    label: "I bought it mainly to sell at a profit",
    help: "Your own stated reason for acquiring and disposing of the crypto asset (your ipse dixit). SARS treats this as the starting point, but it is not decisive without objective support.",
  },
  {
    key: "frequency",
    label: "I buy, sell or swap often",
    help: "Frequency of involvement in similar transactions. A high number of disposals across many different crypto assets points strongly to a revenue (trading) intention.",
  },
  {
    key: "shortHold",
    label: "I usually dispose within a year",
    help: "The length of time held, and the period you anticipated holding it at acquisition. Note there is no three-year rule for crypto — section 9C applies only to equity shares.",
  },
  {
    key: "monitor",
    label: "I actively watch the market to time disposals",
    help: "Your conduct and activities in relation to the asset. Regular research and monitoring in order to capitalise on market movements points to a scheme of profit-making.",
  },
  {
    key: "occupation",
    label: "Crypto is part of my business or occupation",
    help: "The nature of your business or occupation. If dealing in crypto assets forms part of what you do for a living, receipts are far more likely to be revenue in nature.",
  },
];

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

function marginalRate(taxableIncome: number, taxYear: string) {
  const { brackets } = TAX_DATA[taxYear];
  for (const b of brackets) if (taxableIncome <= b.limit) return b.rate;
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

export default function CryptoTaxPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [treatment, setTreatment] = useState<"capital" | "revenue">("capital");
  const [proceeds, setProceeds] = useState(400000);
  const [baseCost, setBaseCost] = useState(250000);
  const [costs, setCosts] = useState(5000);
  const [rewards, setRewards] = useState(0);
  const [otherIncome, setOtherIncome] = useState(500000);
  const [age, setAge] = useState(35);
  const [factors, setFactors] = useState<Record<string, boolean>>({});

  const isCapital = treatment === "capital";

  const results = useMemo(() => {
    const cgt = TAX_DATA[taxYear].cgt;
    const annualExclusion = cgt.annualExclusion;

    const totalCost = baseCost + costs;
    const gross = proceeds - totalCost;
    const profit = Math.max(0, gross);
    const rawLoss = Math.max(0, -gross);

    // Mining, staking and non-fortuitous airdrops are revenue in nature and are
    // included in gross income at market value on receipt — regardless of how
    // the disposals themselves are treated.
    const incomeBase = otherIncome + rewards;
    const rewardTax =
      taxAfterRebate(incomeBase, age, taxYear) -
      taxAfterRebate(otherIncome, age, taxYear);

    // ── Capital leg (Eighth Schedule) ──
    const netCapitalGain = Math.max(0, profit - annualExclusion);
    const exclusionUsedOnGain = profit - netCapitalGain;
    const includedGain = netCapitalGain * cgt.inclusion;
    const capitalTax = Math.max(
      0,
      taxAfterRebate(incomeBase + includedGain, age, taxYear) -
        taxAfterRebate(incomeBase, age, taxYear)
    );
    // A net capital loss must ALSO be reduced by the annual exclusion, and the
    // balance is ring-fenced — carried forward against future capital gains only.
    const assessedCapitalLoss = Math.max(0, rawLoss - annualExclusion);
    const exclusionUsedOnLoss = rawLoss - assessedCapitalLoss;

    // ── Revenue leg (gross income, s 11(a)/s 22 deduction of cost) ──
    const revenueTax = Math.max(
      0,
      taxAfterRebate(incomeBase + profit, age, taxYear) -
        taxAfterRebate(incomeBase, age, taxYear)
    );
    // A revenue loss reduces taxable income — unless s 20A ring-fences it.
    const revenueLossRelief =
      taxAfterRebate(incomeBase, age, taxYear) -
      taxAfterRebate(Math.max(0, incomeBase - rawLoss), age, taxYear);

    const disposalTax = isCapital ? capitalTax : revenueTax;
    const lossRelief = isCapital ? 0 : revenueLossRelief;
    const totalTax = rewardTax + disposalTax;

    const effectiveRate = profit > 0 ? (disposalTax / profit) * 100 : 0;
    const netInPocket = profit - disposalTax;
    const rate = marginalRate(incomeBase, taxYear);

    return {
      totalCost,
      gross,
      profit,
      rawLoss,
      isLoss: rawLoss > 0,
      incomeBase,
      rewardTax,
      exclusionUsedOnGain,
      netCapitalGain,
      includedGain,
      capitalTax,
      assessedCapitalLoss,
      exclusionUsedOnLoss,
      revenueTax,
      revenueLossRelief,
      disposalTax,
      lossRelief,
      totalTax,
      effectiveRate,
      netInPocket,
      marginal: rate,
      annualExclusion,
      atTopRate: rate === 0.45,
      penalty: revenueTax - capitalTax,
    };
  }, [
    proceeds,
    baseCost,
    costs,
    rewards,
    otherIncome,
    age,
    taxYear,
    isCapital,
  ]);

  // Leaning from the SARS factors — advisory only, never decisive.
  const factorCount = FACTORS.filter((f) => factors[f.key]).length;
  const leaning: "capital" | "revenue" | "unclear" | "unanswered" =
    factorCount === 0
      ? "unanswered"
      : factorCount === 1
      ? "capital"
      : factorCount >= 4
      ? "revenue"
      : "unclear";

  const fmt = (n: number) =>
    n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  // The bottom line of the breakdown card changes shape with the scenario: a
  // profit owes tax; a capital loss owes tax only on rewards; a revenue loss can
  // net out to a saving once the relief exceeds the tax on rewards.
  const footer = !results.isLoss
    ? { label: "Total Tax", value: results.totalTax }
    : isCapital
    ? { label: "Total Tax Due", value: results.rewardTax }
    : results.rewardTax >= results.revenueLossRelief
    ? {
        label: "Total Tax Due",
        value: results.rewardTax - results.revenueLossRelief,
      }
    : {
        label: "Tax Saved",
        value: results.revenueLossRelief - results.rewardTax,
      };

  const compareData = [
    {
      name: "Capital (CGT)",
      value: results.capitalTax,
      color: isCapital ? "#E8872E" : "#0077BB",
    },
    {
      name: "Revenue (income tax)",
      value: results.revenueTax,
      color: isCapital ? "#0077BB" : "#E8872E",
    },
  ];

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Bitcoin className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Crypto Asset Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Crypto Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              SARS taxes crypto profits either as a capital gain or as ordinary
              income — and the difference can be enormous. Work out both, and see
              which one your facts point to.
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
                Your Crypto Year
              </h2>

              {/* Treatment Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl flex mb-2">
                {(
                  [
                    ["capital", "Capital (investor)"],
                    ["revenue", "Revenue (trader)"],
                  ] as const
                ).map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setTreatment(val)}
                    className={`flex-1 py-3 sm:py-2 text-sm font-semibold rounded-lg transition-all ${
                      treatment === val
                        ? "bg-white text-[#0077BB] shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mb-8 px-1 leading-relaxed">
                {isCapital
                  ? "Held as an investment — taxed under the Eighth Schedule at a maximum effective rate of 18%."
                  : "Bought and sold to make a profit — the whole profit falls into gross income and is taxed at your marginal rate."}
              </p>

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="The year of assessment in which you disposed of the crypto asset (1 March – 28/29 February)."
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

              {/* Proceeds */}
              <InputGroup
                label="Total Disposal Value"
                icon={Tag}
                helpText="Everything you got for the crypto you disposed of this year. A swap of one crypto asset for another is a disposal too — use the market value of what you received. So is paying for goods or services in crypto."
              >
                <RandInput value={proceeds} onChange={setProceeds} />
              </InputGroup>

              {/* Base cost */}
              <InputGroup
                label="What You Paid For It"
                icon={Banknote}
                helpText="The cost of the crypto you disposed of. For capital holdings this is your base cost, worked out by specific identification or FIFO — the weighted-average method is not available for crypto. For revenue holdings it is the cost deductible under section 11(a)/section 22."
              >
                <RandInput value={baseCost} onChange={setBaseCost} />
              </InputGroup>

              {/* Fees */}
              <InputGroup
                label="Exchange Fees & Other Costs"
                icon={ArrowLeftRight}
                helpText="Trading, brokerage and network fees on the buy and the sell. These add to your base cost (capital) or are deducted from income (revenue)."
              >
                <RandInput value={costs} onChange={setCosts} />
              </InputGroup>

              {/* Rewards */}
              <InputGroup
                label="Mining, Staking & Airdrop Rewards"
                icon={Pickaxe}
                helpText="The market value, when you received it, of crypto earned from mining, staking or airdrops you worked for. SARS treats these as revenue in nature and includes them in gross income — whichever way your disposals are treated. Leave at 0 if you earned none."
              >
                <RandInput value={rewards} onChange={setRewards} />
              </InputGroup>

              {/* Other income */}
              <InputGroup
                label="Other Taxable Income"
                icon={Wallet}
                helpText="Your annual taxable income from salary and other sources. This sets the marginal rate at which the crypto profit is taxed."
              >
                <RandInput value={otherIncome} onChange={setOtherIncome} />
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
            </div>

            {/* SARS factors panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-1.5 flex items-center">
                <span className="w-1 h-6 bg-[#E8872E] rounded-full mr-3" />
                Not sure which applies?
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Tick what is true of you. These are the factors SARS weighs to
                decide whether your crypto is capital or revenue in nature.
              </p>

              <div className="space-y-2">
                {FACTORS.map((f) => {
                  const on = !!factors[f.key];
                  return (
                    <div key={f.key} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFactors((prev) => ({ ...prev, [f.key]: !on }))
                        }
                        className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                          on
                            ? "bg-[#E8872E]/10 border-[#E8872E]/40 text-[#b45f16]"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center ${
                            on
                              ? "bg-[#E8872E] border-[#E8872E]"
                              : "bg-white border-slate-300"
                          }`}
                        >
                          {on && (
                            <svg
                              viewBox="0 0 12 12"
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path d="M2 6.5 4.5 9 10 3.5" />
                            </svg>
                          )}
                        </span>
                        <span className="text-xs font-semibold leading-snug">
                          {f.label}
                        </span>
                      </button>
                      <div className="group relative flex-shrink-0">
                        <button
                          type="button"
                          aria-label="More information"
                          className="block p-2.5 -m-2.5 text-slate-300 hover:text-slate-500 transition-colors"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 bottom-7 w-64 max-w-[calc(100vw-3rem)] p-2.5 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-active:opacity-100 transition-opacity pointer-events-none z-20 leading-relaxed">
                          {f.help}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leaning strip */}
              <div
                className={`mt-5 rounded-xl p-4 border ${
                  leaning === "revenue"
                    ? "bg-[#E8872E]/10 border-[#E8872E]/30"
                    : leaning === "capital"
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Scale
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      leaning === "revenue"
                        ? "text-[#E8872E]"
                        : leaning === "capital"
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 mb-1">
                      {leaning === "unanswered"
                        ? "Tick the ones that apply to you"
                        : `${factorCount} of ${FACTORS.length} factors ticked — ${
                            leaning === "revenue"
                              ? "this points to revenue"
                              : leaning === "capital"
                              ? "this points to capital"
                              : "this is genuinely borderline"
                          }`}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      SARS is explicit that no single factor decides it — they are
                      weighed in aggregate, case by case, and your stated
                      intention needs objective support. There is no three-year
                      rule for crypto.
                    </p>
                    {(leaning === "capital" || leaning === "revenue") &&
                      leaning !== treatment && (
                        <button
                          type="button"
                          onClick={() => setTreatment(leaning)}
                          className="mt-2.5 text-xs font-bold text-[#0077BB] hover:text-[#01527e] underline decoration-dotted"
                        >
                          Calculate on the {leaning} basis instead →
                        </button>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimate only, for individuals (not companies or trusts). Whether
                your crypto is capital or revenue in nature is a question of fact
                that only SARS or a court can settle — this tool models both, it
                does not decide. It assumes a single year of disposals with no
                assessed loss brought forward, and does not cover VAT, donations
                tax, crypto arbitrage, De-Fi, hard forks, employment paid in
                crypto, or the 45-day identical-asset rule in paragraph 42.
                SARS&apos;s crypto guide was still in draft at the time of
                writing. Consult a registered tax professional for your situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            {results.isLoss ? (
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl shadow-xl text-white p-5 sm:p-8">
                <div className="flex justify-between items-start gap-3 mb-6">
                  <div>
                    <p className="text-emerald-100 font-medium mb-1 text-sm">
                      {isCapital
                        ? "Assessed Capital Loss to Carry Forward"
                        : "Tax Relief From Your Trading Loss"}
                    </p>
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                      R{" "}
                      {fmt(
                        isCapital
                          ? results.assessedCapitalLoss
                          : results.revenueLossRelief
                      )}
                    </div>
                    <p className="text-sm text-emerald-100 mt-2">
                      You made a loss of R {fmt(results.rawLoss)} on your
                      disposals — no tax is due on them.
                    </p>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl flex-shrink-0">
                    <TrendingDown className="w-8 h-8 text-emerald-100" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 border-t border-white/10 pt-6">
                  <div>
                    <p className="text-emerald-100 text-xs sm:text-sm mb-1">
                      {isCapital ? "Annual Exclusion Absorbed" : "At Your Marginal Rate"}
                    </p>
                    <p className="text-lg sm:text-xl font-semibold">
                      {isCapital
                        ? `R ${fmt(results.exclusionUsedOnLoss)}`
                        : `${(results.marginal * 100).toFixed(0)}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-100 text-xs sm:text-sm mb-1">
                      Tax Still Due on Rewards
                    </p>
                    <p className="text-lg sm:text-xl font-semibold">
                      R {fmt(results.rewardTax)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#0077BB] to-[#01527e] rounded-2xl shadow-xl text-white p-5 sm:p-8">
                <div className="flex justify-between items-start gap-3 mb-6">
                  <div>
                    <p className="text-blue-200 font-medium mb-1 text-sm">
                      Tax on Your Crypto
                    </p>
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                      R {fmt(results.totalTax)}
                    </div>
                    <p className="text-sm text-blue-200 mt-2">
                      On a profit of R {fmt(results.profit)}, taxed as{" "}
                      {isCapital ? "a capital gain" : "ordinary income"}.
                    </p>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl flex-shrink-0">
                    <Bitcoin className="w-8 h-8 text-blue-200" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 border-t border-white/10 pt-6">
                  <div>
                    <p className="text-blue-200 text-xs sm:text-sm mb-1">You Keep</p>
                    <p className="text-lg sm:text-xl font-semibold">
                      R {fmt(results.netInPocket)}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-xs sm:text-sm mb-1">Effective Rate</p>
                    <p className="text-lg sm:text-xl font-semibold">
                      {results.effectiveRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-xs sm:text-sm mb-1">Marginal Rate</p>
                    <p className="text-lg sm:text-xl font-semibold">
                      {(results.marginal * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tax year badge */}
            <div className="flex items-center gap-2 -mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {TAX_DATA[taxYear].label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Coins size={12} className="text-[#0077BB]" />
                {isCapital ? "Capital — Eighth Schedule" : "Revenue — gross income"}
              </span>
            </div>

            {/* Ring-fencing warning for revenue losses */}
            {results.isLoss && !isCapital && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold">
                    {results.atTopRate
                      ? "This relief may not be available."
                      : "Section 20A is worth checking."}
                  </span>{" "}
                  {results.atTopRate
                    ? "Buying and selling crypto assets is a trade listed in section 20A(2)(b)(ix), and on the income you have entered you are taxed at the top marginal rate — so SARS can ring-fence this loss, carrying it forward to be set off only against future crypto trading income rather than against your salary."
                    : "Buying and selling crypto assets is a trade listed in section 20A(2)(b)(ix). Where a taxpayer is at the top marginal rate, SARS can ring-fence such a loss so that it shelters only future crypto trading income. On the income you have entered you are below that rate, so ring-fencing should not apply here."}
                </p>
              </div>
            )}

            {/* Capital-loss note */}
            {results.isLoss && isCapital && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-[#0077BB] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  An assessed capital loss cannot be set off against your salary
                  or other ordinary income — it is carried forward and used only
                  against future capital gains. The annual exclusion of R{" "}
                  {fmt(results.annualExclusion)} is applied to the loss first, and
                  any unused balance of it is forfeited.
                </p>
              </div>
            )}

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  What the Treatment Costs You
                </h3>
                {results.profit > 0 ? (
                  <>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={compareData}
                          margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#64748b" }}
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
                            {compareData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-400 text-center mt-2">
                      {results.penalty > 0
                        ? `Getting it wrong costs R ${fmt(
                            results.penalty
                          )} — revenue treatment is that much dearer.`
                        : "Both treatments cost the same on these numbers."}
                    </p>
                  </>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-center px-4">
                    <TrendingDown className="w-8 h-8 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-400 leading-relaxed">
                      No profit to tax on these numbers — enter a disposal value
                      above what you paid to compare the two treatments.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <Row label="Disposal Value" value={`R ${fmt(proceeds)}`} />
                  <Row
                    label={isCapital ? "Less: Base Cost" : "Less: Cost of Crypto Sold"}
                    value={`− R ${fmt(baseCost)}`}
                    green
                  />
                  <Row
                    label="Less: Fees & Other Costs"
                    value={`− R ${fmt(costs)}`}
                    green
                  />
                  <div className="h-px bg-slate-100" />
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{results.isLoss ? "Loss" : "Profit"} on Disposal</span>
                    <span>
                      {results.isLoss ? "−" : ""}R{" "}
                      {fmt(results.isLoss ? results.rawLoss : results.profit)}
                    </span>
                  </div>

                  {isCapital ? (
                    <>
                      <Row
                        label={`Less: Annual Exclusion (R ${fmt(
                          results.annualExclusion
                        )})`}
                        value={`− R ${fmt(
                          results.isLoss
                            ? results.exclusionUsedOnLoss
                            : results.exclusionUsedOnGain
                        )}`}
                        green
                      />
                      {results.isLoss ? (
                        <Row
                          label="Assessed Capital Loss Carried Forward"
                          value={`R ${fmt(results.assessedCapitalLoss)}`}
                          accent
                        />
                      ) : (
                        <>
                          <Row
                            label="Net Capital Gain"
                            value={`R ${fmt(results.netCapitalGain)}`}
                          />
                          <Row
                            label="Inclusion Rate (40%)"
                            value={`R ${fmt(results.includedGain)}`}
                            accent
                          />
                        </>
                      )}
                    </>
                  ) : (
                    <Row
                      label={
                        results.isLoss
                          ? "Deducted From Taxable Income"
                          : "Added to Gross Income in Full"
                      }
                      value={`R ${fmt(
                        results.isLoss ? results.rawLoss : results.profit
                      )}`}
                      accent
                    />
                  )}

                  {rewards > 0 && (
                    <Row
                      label="Plus: Mining / Staking / Airdrops"
                      value={`R ${fmt(rewards)}`}
                    />
                  )}

                  <div className="pt-3 border-t border-dashed border-slate-200 space-y-2">
                    {!results.isLoss && rewards > 0 && (
                      <>
                        <Row
                          label="Tax on Disposal Profit"
                          value={`R ${fmt(results.disposalTax)}`}
                        />
                        <Row
                          label="Tax on Rewards"
                          value={`R ${fmt(results.rewardTax)}`}
                        />
                      </>
                    )}
                    {results.isLoss && rewards > 0 && (
                      <Row
                        label="Tax on Rewards"
                        value={`R ${fmt(results.rewardTax)}`}
                      />
                    )}
                    {results.isLoss && !isCapital && rewards > 0 && (
                      <Row
                        label="Relief From the Loss"
                        value={`− R ${fmt(results.revenueLossRelief)}`}
                        green
                      />
                    )}
                    <div className="flex justify-between font-bold text-[#0077BB]">
                      <span>{footer.label}</span>
                      <span>R {fmt(footer.value)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} className="flex-shrink-0 mt-0.5" />
                    {results.isLoss
                      ? isCapital
                        ? "A capital loss cannot reduce ordinary income — it only shelters future capital gains."
                        : "A trading loss reduces taxable income at your marginal rate, subject to section 20A."
                      : isCapital
                      ? "Taxed at your marginal rate on the included gain — max effective CGT rate is 18%."
                      : "The whole profit is taxed at your marginal rate — up to 45%."}
                  </div>
                </div>
              </div>
            </div>

            {/* SARS rules card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                Five SARS Rules That Catch People Out
              </h3>
              <div className="space-y-3.5">
                <RuleRow
                  icon={ArrowLeftRight}
                  title="Every swap is a disposal"
                  body="Trading BTC for Ethereum is a barter transaction. The tax event happens at the swap, at market value — it is not deferred until you cash out to rands."
                />
                <RuleRow
                  icon={Calendar}
                  title="There is no three-year rule"
                  body="The section 9C rule that deems shares held three years to be capital does not apply to crypto assets. Every disposal is judged on its own facts."
                />
                <RuleRow
                  icon={Wallet}
                  title="Personal crypto is not a personal-use asset"
                  body="Crypto assets are financial instruments, and paragraph 53(3)(e) excludes them from the personal-use asset exemption. Holding it for yourself does not put it outside CGT."
                />
                <RuleRow
                  icon={Pickaxe}
                  title="Mining and staking are income when received"
                  body="Rewards go into gross income at their market value on the day they land in your wallet — before you have sold anything, and whichever way your disposals are treated."
                />
                <RuleRow
                  icon={Banknote}
                  title="Base cost is FIFO or specific identification"
                  body="You may pick which units you sold, or use first-in-first-out. The weighted-average method is not available, because crypto exchanges are not recognised exchanges."
                />
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

function RuleRow({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="bg-blue-50 rounded-lg p-2 h-fit flex-shrink-0">
        <Icon className="w-4 h-4 text-[#0077BB]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{body}</p>
      </div>
    </div>
  );
}
