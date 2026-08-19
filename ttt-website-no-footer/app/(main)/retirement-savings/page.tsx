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
  PiggyBank,
  Wallet,
  Info,
  ChevronDown,
  Calendar,
  Percent,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  RefreshCcw,
  Minus,
  Plus,
  Landmark,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS income tax tables per year of assessment (1 March – 28/29 February),
// with the section 11F retirement fund contribution deduction limits and the
// section 12T tax free investment limits used for the comparison leg.
//
// Section 11F(2): the deduction is the LESSER of —
//   (a) the monetary cap — R350 000, raised to R430 000 from 1 March 2026;
//   (b) 27,5% of the greater of remuneration or taxable income; and
//   (c) taxable income before this deduction and before including any taxable
//       capital gain.
// The 27,5% base in (b) is also determined before the taxable capital gain, and
// before retirement lump sums, severance benefits, the section 6quat credit and
// bona fide donations.

const TAX_DATA: Record<
  string,
  {
    label: string;
    brackets: { limit: number; rate: number; base: number }[];
    rebates: { primary: number; secondary: number; tertiary: number };
    retirementCap: number;
    tfsaAnnualLimit: number;
    tfsaLifetimeLimit: number;
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
    retirementCap: 430000,
    tfsaAnnualLimit: 46000,
    tfsaLifetimeLimit: 500000,
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
    retirementCap: 350000,
    tfsaAnnualLimit: 36000,
    tfsaLifetimeLimit: 500000,
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
    retirementCap: 350000,
    tfsaAnnualLimit: 36000,
    tfsaLifetimeLimit: 500000,
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
    retirementCap: 350000,
    tfsaAnnualLimit: 36000,
    tfsaLifetimeLimit: 500000,
  },
};

const CONTRIBUTION_PERCENTAGE = 0.275;

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

function Stepper({
  value,
  onChange,
  min = 0,
  max = 45,
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

export default function RetirementSavingsPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [age, setAge] = useState(40);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  // Income side
  const [remuneration, setRemuneration] = useState(600000);
  const [otherIncome, setOtherIncome] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [capitalGain, setCapitalGain] = useState(0);

  // Contribution side (entered in the period selected above)
  const [fundContribution, setFundContribution] = useState(4500);
  const [raContribution, setRaContribution] = useState(2500);
  const [broughtForward, setBroughtForward] = useState(0);

  // Projection
  const [years, setYears] = useState(20);
  const [growth, setGrowth] = useState(9);

  const { retirementCap, tfsaAnnualLimit, tfsaLifetimeLimit } =
    TAX_DATA[taxYear];

  const results = useMemo(() => {
    const mult = period === "monthly" ? 12 : 1;
    const annualFund = fundContribution * mult;
    const annualRa = raContribution * mult;
    const contributionsThisYear = annualFund + annualRa;
    const contributionsClaimable = contributionsThisYear + broughtForward;

    // Taxable income before the s 11F deduction and before the taxable capital
    // gain (limit (c), and the taxable-income leg of the 27,5% test).
    const taxableIncomeExclCG = Math.max(
      0,
      remuneration + otherIncome - otherDeductions
    );
    const base = Math.max(remuneration, taxableIncomeExclCG);

    const limitPercentage = base * CONTRIBUTION_PERCENTAGE;
    const limitCap = retirementCap;
    const limitTaxableIncome = taxableIncomeExclCG;

    const limits = [
      {
        key: "cap",
        label: `The R${limitCap.toLocaleString("en-ZA")} cap`,
        phrase: `the R${limitCap.toLocaleString("en-ZA")} cap`,
        value: limitCap,
      },
      {
        key: "percentage",
        label: "27,5% of the greater of remuneration or taxable income",
        phrase:
          "27,5% of the greater of your remuneration and your taxable income",
        value: limitPercentage,
      },
      {
        key: "taxableIncome",
        label: "Taxable income before this deduction and before capital gains",
        phrase:
          "your taxable income before this deduction and before capital gains",
        value: limitTaxableIncome,
      },
    ];
    const bindingLimit = limits.reduce((a, b) => (b.value < a.value ? b : a));
    const maxDeduction = bindingLimit.value;

    const allowed = Math.min(contributionsClaimable, maxDeduction);
    const excess = Math.max(0, contributionsClaimable - allowed);
    const unusedRoom = Math.max(0, maxDeduction - allowed);

    // Tax with and without the deduction. The taxable capital gain is included
    // in taxable income for the tax itself, even though it is excluded from the
    // deduction limits.
    const taxableIncomeInclCG = taxableIncomeExclCG + capitalGain;
    const taxWithout = taxAfterRebate(taxableIncomeInclCG, age, taxYear);
    const taxWith = taxAfterRebate(
      taxableIncomeInclCG - allowed,
      age,
      taxYear
    );
    const taxSaving = taxWithout - taxWith;
    const netCost = contributionsThisYear - taxSaving;
    const savingRate =
      contributionsThisYear > 0 ? (taxSaving / contributionsThisYear) * 100 : 0;
    const margRate = marginalRate(taxableIncomeInclCG, taxYear);

    // ── Projection ──
    // The RA is funded with the gross contribution. The alternatives are funded
    // with the same out-of-pocket cost, which is the gross contribution less
    // the tax it saves — the honest like-for-like comparison.
    const g = growth / 100;
    const gNet = g * (1 - margRate);
    const outOfPocket = contributionsThisYear > 0 ? netCost : 0;

    let raValue = 0;
    let tfsaValue = 0;
    let taxableValue = 0;
    let tfsaContributed = 0;
    let tfsaCappedYear = 0;

    for (let y = 1; y <= years; y++) {
      raValue = (raValue + contributionsThisYear) * (1 + g);

      const roomLeft = Math.max(0, tfsaLifetimeLimit - tfsaContributed);
      const tfsaThisYear = Math.min(outOfPocket, tfsaAnnualLimit, roomLeft);
      if (tfsaThisYear < outOfPocket && tfsaCappedYear === 0) {
        tfsaCappedYear = y;
      }
      tfsaContributed += tfsaThisYear;
      tfsaValue = (tfsaValue + tfsaThisYear) * (1 + g);

      taxableValue = (taxableValue + outOfPocket) * (1 + gNet);
    }

    return {
      annualFund,
      annualRa,
      contributionsThisYear,
      contributionsClaimable,
      taxableIncomeExclCG,
      taxableIncomeInclCG,
      base,
      limits,
      bindingLimit,
      maxDeduction,
      allowed,
      excess,
      unusedRoom,
      taxWithout,
      taxWith,
      taxSaving,
      netCost,
      savingRate,
      margRate,
      raValue,
      tfsaValue,
      taxableValue,
      tfsaContributed,
      tfsaCappedYear,
      outOfPocket,
      totalContributed: contributionsThisYear * years,
    };
  }, [
    period,
    fundContribution,
    raContribution,
    broughtForward,
    remuneration,
    otherIncome,
    otherDeductions,
    capitalGain,
    retirementCap,
    age,
    taxYear,
    growth,
    years,
    tfsaAnnualLimit,
    tfsaLifetimeLimit,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    {
      name: "Retirement fund",
      value: Math.max(0, results.raValue),
      color: "#0077BB",
    },
    { name: "TFSA", value: Math.max(0, results.tfsaValue), color: "#10b981" },
    {
      name: "Taxable account",
      value: Math.max(0, results.taxableValue),
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
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Income Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Retirement Savings Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Pension, provident and retirement annuity contributions are
              deductible up to 27,5% of your income, capped at R
              {fmt(retirementCap)} a year. See how much of yours SARS allows,
              what it saves you, and what the money grows to.
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
                helpText="Select the year of assessment (1 March – 28/29 February). The monetary cap rose from R350 000 to R430 000 from 1 March 2026 — the first increase since 2016."
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
                helpText="Age determines your primary, secondary, or tertiary tax rebate — and therefore what the deduction saves you."
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

              <div className="h-px bg-slate-100 my-6" />

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Wallet size={12} /> Your Income (annual)
              </p>

              <InputGroup
                label="Remuneration"
                icon={Wallet}
                helpText="Your remuneration for PAYE purposes — salary, allowances, bonuses and taxable fringe benefits, including any retirement fund contribution your employer makes on your behalf."
              >
                <RandInput value={remuneration} onChange={setRemuneration} />
              </InputGroup>

              <InputGroup
                label="Other Taxable Income"
                icon={TrendingUp}
                helpText="Non-remuneration income: net rental profit, business or freelance income, taxable interest. Excludes capital gains, which are entered separately."
              >
                <RandInput value={otherIncome} onChange={setOtherIncome} />
              </InputGroup>

              <InputGroup
                label="Other Deductions Claimed"
                icon={Receipt}
                helpText="Deductions other than retirement contributions — a travel claim, home office, or a rental loss. These reduce your taxable income, which is why SARS uses the GREATER of remuneration or taxable income for the 27,5% test."
              >
                <RandInput
                  value={otherDeductions}
                  onChange={setOtherDeductions}
                />
              </InputGroup>

              <InputGroup
                label="Taxable Capital Gain"
                icon={TrendingUp}
                helpText="The taxable capital gain included in your income for the year. It is deliberately excluded from both the 27,5% base and the taxable-income limit — a big capital gain does not buy you more retirement deduction room."
              >
                <RandInput value={capitalGain} onChange={setCapitalGain} />
                {capitalGain > 0 && (
                  <p className="mt-2 text-xs text-[#b45f16] bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-lg px-3 py-2 leading-relaxed">
                    Excluded from the section 11F limits, but still taxed — so
                    it raises your tax without raising your deduction room.
                  </p>
                )}
              </InputGroup>

              <div className="h-px bg-slate-100 my-6" />

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <PiggyBank size={12} /> Your Contributions
              </p>

              {/* Period Toggle */}
              <InputGroup
                label="Contributions Are"
                icon={RefreshCcw}
                helpText="Enter contributions either per month or per year — we annualise them for you."
              >
                <div className="bg-slate-100 p-1 rounded-xl flex">
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
              </InputGroup>

              <InputGroup
                label="Pension / Provident Fund"
                icon={Landmark}
                helpText="Your own contribution plus your employer's. Your employer's contribution is a taxable fringe benefit in your hands and is then treated as if you made it, so it counts towards your 27,5%."
              >
                <RandInput
                  value={fundContribution}
                  onChange={setFundContribution}
                />
              </InputGroup>

              <InputGroup
                label="Retirement Annuity"
                icon={PiggyBank}
                helpText="Contributions to a retirement annuity fund. All retirement funds share one 27,5% limit — an RA does not get its own."
              >
                <RandInput
                  value={raContribution}
                  onChange={setRaContribution}
                />
              </InputGroup>

              <InputGroup
                label="Excess Brought Forward"
                icon={Clock}
                helpText="Contributions disallowed in earlier years are not lost. Section 11F(3) deems them contributed in the following year, so they queue up until there is room — or they reduce the tax on your eventual lump sum or annuity."
              >
                <RandInput
                  value={broughtForward}
                  onChange={setBroughtForward}
                />
              </InputGroup>

              <div className="h-px bg-slate-100 my-6" />

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Clock size={12} /> Projection
              </p>

              <InputGroup
                label="Years Until Retirement"
                icon={Clock}
                helpText="How long the money keeps compounding before you retire."
              >
                <Stepper
                  value={years}
                  onChange={setYears}
                  min={1}
                  max={45}
                  suffix="years"
                />
              </InputGroup>

              <InputGroup
                label="Expected Growth (after fees)"
                icon={TrendingUp}
                helpText="Annual return after fees. Use a realistic net number — fees of 1–2% a year make a very large difference over decades."
              >
                <RandInput value={growth} onChange={setGrowth} suffix="%" />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This calculator provides estimates only and does not constitute
                tax advice or financial advice. The projection assumes a level
                contribution and a constant return, ignores inflation, and holds
                the current limits and tax tables for every future year — real
                returns vary and the law changes. Retirement fund money is not
                the same as money in your pocket: at retirement up to one third
                may be taken as a lump sum, taxed on the SARS retirement lump
                sum table, and the balance must buy an annuity that is taxed as
                income. The two-pot rules, provident fund vested rights, and
                transfers between funds are not modelled. Consult a registered
                tax professional and a licensed financial adviser.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div
              className={`rounded-2xl shadow-xl text-white p-8 ${
                results.excess > 0
                  ? "bg-gradient-to-br from-[#E8872E] to-[#b45f16]"
                  : "bg-gradient-to-br from-emerald-600 to-emerald-800"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p
                    className={`font-medium mb-1 text-sm ${
                      results.excess > 0 ? "text-orange-100" : "text-emerald-100"
                    }`}
                  >
                    Tax You Save This Year
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(results.taxSaving)}
                  </div>
                  <p
                    className={`text-sm mt-2 ${
                      results.excess > 0 ? "text-orange-100" : "text-emerald-100"
                    }`}
                  >
                    R {fmt(results.contributionsThisYear)} of contributions
                    really costs you R {fmt(results.netCost)} — a{" "}
                    {results.savingRate.toFixed(1)}% discount, funded by SARS.
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl">
                  <PiggyBank className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      results.excess > 0 ? "text-orange-100" : "text-emerald-100"
                    }`}
                  >
                    Deduction Allowed
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.allowed)}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      results.excess > 0 ? "text-orange-100" : "text-emerald-100"
                    }`}
                  >
                    Not Deductible
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.excess)}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      results.excess > 0 ? "text-orange-100" : "text-emerald-100"
                    }`}
                  >
                    Unused Room
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.unusedRoom)}
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
                Marginal rate {(results.margRate * 100).toFixed(0)}%
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Landmark size={12} className="text-[#0077BB]" />
                Cap R {fmt(retirementCap)}
              </span>
            </div>

            {/* The three limits */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-1">
                Your Section 11F Ceiling
              </h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                The deduction is the lowest of three numbers. Yours is capped by{" "}
                <strong className="text-slate-700">
                  {results.bindingLimit.phrase}
                </strong>
                .
              </p>
              <div className="space-y-3">
                {results.limits.map((l) => {
                  const binding = l.key === results.bindingLimit.key;
                  return (
                    <div
                      key={l.key}
                      className={`flex items-start justify-between gap-4 p-3.5 rounded-xl border ${
                        binding
                          ? "bg-[#0077BB]/5 border-[#0077BB]/40"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${
                            binding ? "bg-[#0077BB]" : "bg-slate-300"
                          }`}
                        >
                          {binding && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </span>
                        <span
                          className={`text-sm leading-snug ${
                            binding
                              ? "text-[#0077BB] font-semibold"
                              : "text-slate-600"
                          }`}
                        >
                          {l.label}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold whitespace-nowrap ${
                          binding ? "text-[#0077BB]" : "text-slate-500"
                        }`}
                      >
                        R {fmt(l.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                The 27,5% is applied to R {fmt(results.base)} — the greater of
                your remuneration (R {fmt(remuneration)}) and your taxable
                income before this deduction and before capital gains (R{" "}
                {fmt(results.taxableIncomeExclCG)}).
              </p>
            </div>

            {/* Excess warning */}
            {results.excess > 0 && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-2xl p-5 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold">
                    R {fmt(results.excess)} of your contributions is not
                    deductible this year — but it is not wasted.
                  </span>{" "}
                  Section 11F(3) deems the disallowed amount to have been
                  contributed on the first day of the following year of
                  assessment, so it queues up and is claimed as soon as you have
                  room. Anything still unclaimed when you retire reduces the
                  taxable portion of your retirement lump sum, and any balance
                  after that reduces the annuity income you are taxed on.
                </p>
              </div>
            )}

            {results.excess === 0 && results.unusedRoom > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold">
                    You have R {fmt(results.unusedRoom)} of deduction room left
                    this year.
                  </span>{" "}
                  Contributing that much more — a single additional contribution
                  before the end of February counts — would save you a further R{" "}
                  {fmt(
                    taxAfterRebate(
                      results.taxableIncomeInclCG - results.allowed,
                      age,
                      taxYear
                    ) -
                      taxAfterRebate(
                        results.taxableIncomeInclCG -
                          results.allowed -
                          results.unusedRoom,
                        age,
                        taxYear
                      )
                  )}{" "}
                  in tax. Unused room is not carried forward.
                </p>
              </div>
            )}

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">
                  In {years} Years
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Same cost to you each year: R {fmt(results.outOfPocket)} out of
                  pocket.
                </p>
                <div className="h-56">
                  {results.contributionsThisYear > 0 ? (
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
                            v >= 1000000
                              ? `${(v / 1000000).toFixed(1)}m`
                              : `${Math.round(v / 1000)}k`
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
                      Enter your contributions to see the projection.
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                  The retirement fund bar is before retirement tax; the TFSA bar
                  is entirely tax-free in your hands.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <Row
                    label="Pension / provident (annual)"
                    value={`R ${fmt(results.annualFund)}`}
                  />
                  <Row
                    label="Retirement annuity (annual)"
                    value={`R ${fmt(results.annualRa)}`}
                  />
                  {broughtForward > 0 && (
                    <Row
                      label="Excess brought forward"
                      value={`R ${fmt(broughtForward)}`}
                    />
                  )}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-800 text-sm">
                      <span>Contributions Claimable</span>
                      <span>R {fmt(results.contributionsClaimable)}</span>
                    </div>
                  </div>
                  <Row
                    label="Section 11F ceiling"
                    value={`R ${fmt(results.maxDeduction)}`}
                    accent
                  />
                  <Row
                    label="Deduction allowed"
                    value={`R ${fmt(results.allowed)}`}
                    accent
                  />
                  <div className="h-px bg-slate-100" />
                  <Row
                    label="Taxable income before deduction"
                    value={`R ${fmt(results.taxableIncomeInclCG)}`}
                  />
                  <Row
                    label="Taxable income after deduction"
                    value={`R ${fmt(
                      Math.max(0, results.taxableIncomeInclCG - results.allowed)
                    )}`}
                  />
                  <Row
                    label="Tax without the deduction"
                    value={`R ${fmt(results.taxWithout)}`}
                  />
                  <Row
                    label="Tax with the deduction"
                    value={`R ${fmt(results.taxWith)}`}
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Tax Saved</span>
                      <span>R {fmt(results.taxSaving)}</span>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <Row
                    label={`Contributed over ${years} years`}
                    value={`R ${fmt(results.totalContributed)}`}
                  />
                  <Row
                    label="Retirement fund at retirement"
                    value={`R ${fmt(results.raValue)}`}
                    accent
                  />
                  <Row
                    label="Growth earned"
                    value={`R ${fmt(
                      Math.max(0, results.raValue - results.totalContributed)
                    )}`}
                  />
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    Growth of {growth}% a year, before inflation.
                  </div>
                </div>
              </div>
            </div>

            {/* TFSA cap note */}
            {results.tfsaCappedYear > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-3">
                <Info className="w-5 h-5 text-[#0077BB] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 leading-relaxed">
                  The TFSA leg is limited from year {results.tfsaCappedYear}: a
                  tax-free savings account takes at most R{" "}
                  {fmt(tfsaAnnualLimit)} a year and R {fmt(tfsaLifetimeLimit)}{" "}
                  in your lifetime, and your out-of-pocket contribution of R{" "}
                  {fmt(results.outOfPocket)} a year runs into that. A retirement
                  fund has no lifetime limit — only the annual 27,5% test.
                </p>
              </div>
            )}

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                How the retirement deduction works
              </h3>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-800">
                    One limit across every fund.
                  </strong>{" "}
                  Pension, provident and retirement annuity contributions share a
                  single 27,5% allowance, capped at R {fmt(retirementCap)} for
                  the {taxYear} year of assessment. Opening a second RA does not
                  create more room.
                </p>
                <p>
                  <strong className="text-slate-800">
                    SARS uses the greater of two income figures.
                  </strong>{" "}
                  27,5% is applied to remuneration or taxable income, whichever
                  is higher — so a large travel or home-office claim cannot
                  shrink your retirement allowance.
                </p>
                <p>
                  <strong className="text-slate-800">
                    A capital gain does not help.
                  </strong>{" "}
                  The taxable capital gain is stripped out of both the 27,5% base
                  and the taxable-income limit. Selling an asset in the same year
                  raises your tax bill without raising your deduction room.
                </p>
                <p>
                  <strong className="text-slate-800">
                    Excess contributions wait their turn.
                  </strong>{" "}
                  Anything over the limit rolls into the next year, and whatever
                  is still unclaimed at retirement comes off the taxable portion
                  of your lump sum first, then your annuity income.
                </p>
                <p>
                  <strong className="text-slate-800">
                    The deduction is worth your marginal rate.
                  </strong>{" "}
                  At {(results.margRate * 100).toFixed(0)}%, every R100 you
                  contribute reduces your tax by R
                  {(results.margRate * 100).toFixed(0)} — which is why the same
                  contribution is far more valuable to a high earner.
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
