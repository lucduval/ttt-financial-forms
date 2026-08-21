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
  Wallet,
  Info,
  ChevronDown,
  Calendar,
  HeartPulse,
  PiggyBank,
  Landmark,
  Building2,
  Target,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  TrendingUp,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS income tax tables per year of assessment (1 March – 28/29 February).
// This calculator runs the ordinary PAYE engine backwards, so it uses exactly
// the same brackets, rebates and medical scheme fees tax credits as the PAYE
// calculator — nothing new is introduced here.
//
// The section 11F retirement deduction is capped at the lesser of 27.5% of
// remuneration/taxable income and a fixed rand amount: R350 000 for 2024–2026,
// raised to R430 000 for 2027 (from 1 March 2026).

const TAX_DATA: Record<
  string,
  {
    label: string;
    brackets: { limit: number; rate: number; base: number }[];
    rebates: { primary: number; secondary: number; tertiary: number };
    medical: { main: number; firstDep: number; additional: number };
    retirementCap: number;
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
    retirementCap: 430000,
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
    retirementCap: 350000,
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
    retirementCap: 350000,
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
    retirementCap: 350000,
  },
};

// Unemployment Insurance Contributions Act, 2002: 1% employee and 1% employer,
// on remuneration up to R17 712 a month (R212 544 a year) — the ceiling in
// force since 1 June 2021 and unchanged for 2027. This is the reason a naive
// inversion of the payslip breaks: above the ceiling the UIF line stops
// growing, so the net-to-gross relationship changes slope.
const UIF_CEILING_MONTHLY = 17712;
const UIF_RATE = 0.01;

// Skills Development Levy: 1% of total remuneration, payable by the employer,
// with employers whose total annual payroll is R500 000 or less exempt.
const SDL_RATE = 0.01;

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

function marginalRate(taxableIncome: number, taxYear: string) {
  const { brackets } = TAX_DATA[taxYear];
  for (const b of brackets) {
    if (taxableIncome <= b.limit) return b.rate;
  }
  return brackets[brackets.length - 1].rate;
}

type Payslip = {
  annualGross: number;
  retirement: number;
  taxableIncome: number;
  taxBeforeCredits: number;
  medicalCredits: number;
  paye: number;
  uif: number;
  medicalPremium: number;
  otherDeductions: number;
  net: number;
};

/**
 * The forward payslip: gross in, net out. Everything else in this calculator
 * is this function run backwards.
 */
function payslipFromGross(
  annualGross: number,
  opts: {
    taxYear: string;
    age: number;
    retirementPct: number;
    medAidMembers: number;
    annualMedicalPremium: number;
    annualOtherDeductions: number;
    includeUif: boolean;
  }
): Payslip {
  const { rebates, medical, retirementCap } = TAX_DATA[opts.taxYear];

  // Section 11F: the lesser of the elected contribution, 27.5% of the greater
  // of remuneration and taxable income, and the annual rand cap.
  const elected = annualGross * (opts.retirementPct / 100);
  const retirement = Math.max(
    0,
    Math.min(elected, annualGross * 0.275, retirementCap)
  );

  const taxableIncome = Math.max(0, annualGross - retirement);
  let rebate = rebates.primary;
  if (opts.age >= 65) rebate += rebates.secondary;
  if (opts.age >= 75) rebate += rebates.tertiary;
  const taxBeforeCredits = Math.max(
    0,
    normalTax(taxableIncome, opts.taxYear) - rebate
  );

  let monthlyCredits = 0;
  if (opts.medAidMembers > 0) {
    monthlyCredits += medical.main;
    if (opts.medAidMembers > 1) monthlyCredits += medical.firstDep;
    if (opts.medAidMembers > 2) {
      monthlyCredits += (opts.medAidMembers - 2) * medical.additional;
    }
  }
  const medicalCredits = monthlyCredits * 12;
  const paye = Math.max(0, taxBeforeCredits - medicalCredits);

  const uif = opts.includeUif
    ? Math.min(annualGross / 12, UIF_CEILING_MONTHLY) * UIF_RATE * 12
    : 0;

  const net =
    annualGross -
    paye -
    uif -
    retirement -
    opts.annualMedicalPremium -
    opts.annualOtherDeductions;

  return {
    annualGross,
    retirement,
    taxableIncome,
    taxBeforeCredits,
    medicalCredits,
    paye,
    uif,
    medicalPremium: opts.annualMedicalPremium,
    otherDeductions: opts.annualOtherDeductions,
    net,
  };
}

/**
 * Inverts the payslip by bisection.
 *
 * Bisection rather than algebra on purpose. The forward function is
 * piecewise-linear and strictly increasing — every extra rand of gross leaves
 * at least 38c of net even in the top bracket with the full 27.5% retirement
 * contribution — but it has kinks at every bracket boundary, at the UIF
 * earnings ceiling, at the 27.5% / rand-cap crossover on section 11F and at
 * the point where medical credits stop being fully used. Solving each segment
 * algebraically means enumerating every combination of those kinks; bisection
 * needs none of that and converges to the cent in well under a hundred steps.
 */
function grossFromNet(
  targetNet: number,
  opts: Parameters<typeof payslipFromGross>[1]
) {
  if (targetNet <= 0) return 0;
  let lo = 0;
  let hi = Math.max(1000, targetNet * 4);
  // Grow the upper bound until it definitely overshoots.
  for (let i = 0; i < 40 && payslipFromGross(hi, opts).net < targetNet; i++) {
    hi *= 2;
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (payslipFromGross(mid, opts).net < targetNet) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
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
        inputMode="decimal"
        value={value === 0 ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? 0 : Number(raw));
        }}
        className={`w-full ${
          suffix ? "pl-4 pr-16" : "pl-8 pr-4"
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

export default function NetToGrossPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [age, setAge] = useState(35);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [targetNet, setTargetNet] = useState(30000);

  const [includeUif, setIncludeUif] = useState(true);
  const [retirementPct, setRetirementPct] = useState(0);
  const [medAidMembers, setMedAidMembers] = useState(0);
  const [medAidPremium, setMedAidPremium] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [sdlApplies, setSdlApplies] = useState(true);

  const results = useMemo(() => {
    const annualTarget = period === "monthly" ? targetNet * 12 : targetNet;
    const opts = {
      taxYear,
      age,
      retirementPct,
      medAidMembers,
      annualMedicalPremium:
        period === "monthly" ? medAidPremium * 12 : medAidPremium,
      annualOtherDeductions:
        period === "monthly" ? otherDeductions * 12 : otherDeductions,
      includeUif,
    };

    const gross = grossFromNet(annualTarget, opts);
    const slip = payslipFromGross(gross, opts);

    // Employer-side cost. UIF is matched rand for rand up to the same
    // ceiling; SDL is 1% of remuneration and only applies where the
    // employer's total annual payroll exceeds R500 000.
    const employerUif = includeUif
      ? Math.min(gross / 12, UIF_CEILING_MONTHLY) * UIF_RATE * 12
      : 0;
    const sdl = sdlApplies ? gross * SDL_RATE : 0;
    const costToCompany = gross + employerUif + sdl;

    const totalDeductions =
      slip.paye + slip.uif + slip.retirement + slip.medicalPremium + slip.otherDeductions;
    const deductionRate = gross > 0 ? (totalDeductions / gross) * 100 : 0;
    const effectiveTaxRate = gross > 0 ? (slip.paye / gross) * 100 : 0;
    const margRate = marginalRate(slip.taxableIncome, taxYear);

    // The next rand of gross is worth this much net — the honest answer to
    // "how much more do they have to pay me to give me R1 000 more?"
    const probe = payslipFromGross(gross + 1000, opts);
    const keepRate = (probe.net - slip.net) / 1000;

    const aboveUifCeiling = gross / 12 > UIF_CEILING_MONTHLY;
    const retirementCapped =
      retirementPct > 0 &&
      slip.retirement < gross * (retirementPct / 100) - 0.5;

    return {
      annualTarget,
      gross,
      slip,
      employerUif,
      sdl,
      costToCompany,
      totalDeductions,
      deductionRate,
      effectiveTaxRate,
      margRate,
      keepRate,
      aboveUifCeiling,
      retirementCapped,
      accurate: Math.abs(slip.net - annualTarget) < 1,
    };
  }, [
    targetNet,
    period,
    taxYear,
    age,
    retirementPct,
    medAidMembers,
    medAidPremium,
    otherDeductions,
    includeUif,
    sdlApplies,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });
  const per = (n: number) => (period === "monthly" ? n / 12 : n);

  const chartData = [
    {
      name: "Take-Home Pay",
      value: Math.max(0, results.slip.net),
      color: "#10b981",
    },
    { name: "PAYE", value: Math.max(0, results.slip.paye), color: "#0077BB" },
    {
      name: "Retirement",
      value: Math.max(0, results.slip.retirement),
      color: "#E8872E",
    },
    { name: "UIF", value: Math.max(0, results.slip.uif), color: "#0168A2" },
    {
      name: "Medical Aid",
      value: Math.max(0, results.slip.medicalPremium),
      color: "#a855f7",
    },
    {
      name: "Other Deductions",
      value: Math.max(0, results.slip.otherDeductions),
      color: "#94a3b8",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Payroll
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Net to Gross Salary Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Know what you need in your pocket? Work backwards to the gross
              salary that gets you there — after PAYE, UIF and everything else
              your payslip takes off.
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
                What You Want to Take Home
              </h2>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {(
                  [
                    { key: "monthly", label: "Per month" },
                    { key: "yearly", label: "Per year" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      if (p.key === period) return;
                      setPeriod(p.key);
                      setTargetNet(
                        p.key === "yearly"
                          ? Math.round(targetNet * 12)
                          : Math.round(targetNet / 12)
                      );
                      setMedAidPremium(
                        p.key === "yearly"
                          ? Math.round(medAidPremium * 12)
                          : Math.round(medAidPremium / 12)
                      );
                      setOtherDeductions(
                        p.key === "yearly"
                          ? Math.round(otherDeductions * 12)
                          : Math.round(otherDeductions / 12)
                      );
                    }}
                    className={`py-3 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      period === p.key
                        ? "bg-[#0077BB] border-[#0077BB] text-white shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <InputGroup
                label={`Target Take-Home Pay (${
                  period === "monthly" ? "per month" : "per year"
                })`}
                icon={Target}
                helpText="The amount you want to actually land in your bank account, after PAYE, UIF and every deduction you list below."
              >
                <RandInput value={targetNet} onChange={setTargetNet} />
              </InputGroup>

              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="The year of assessment runs 1 March to 28/29 February. Brackets and rebates changed for 2027 and the retirement cap rose from R350 000 to R430 000."
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

              <InputGroup
                label="Age"
                icon={Calendar}
                helpText="Your age on the last day of the year of assessment. From 65 you get the secondary rebate and from 75 the tertiary one, so you need less gross for the same net."
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

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                What Comes Off Your Payslip
              </h2>

              <Toggle
                checked={includeUif}
                onChange={setIncludeUif}
                label="Deduct UIF"
                hint="1% of remuneration, capped at R177.12 a month. Uncheck if you are a director or member paid without UIF."
              />

              <div className="h-px bg-slate-100 my-6" />

              <InputGroup
                label="Retirement Contribution"
                icon={PiggyBank}
                helpText="Your own contribution to a pension, provident or retirement annuity fund, as a percentage of your gross salary. It comes off your pay, but it also reduces the tax — section 11F allows it up to 27.5% of income, capped in rands per year."
              >
                <div className="space-y-3">
                  <input
                    type="range"
                    min={0}
                    max={27.5}
                    step={0.5}
                    value={retirementPct}
                    onChange={(e) => setRetirementPct(Number(e.target.value))}
                    className="calc-slider w-full cursor-pointer"
                  />
                  <div className="text-center font-bold text-[#0077BB] bg-blue-50 py-1.5 rounded-lg text-sm">
                    {retirementPct}% of gross — R{" "}
                    {fmt(per(results.slip.retirement))}{" "}
                    {period === "monthly" ? "p/m" : "p/a"}
                  </div>
                </div>
              </InputGroup>

              <InputGroup
                label="Medical Scheme Members"
                icon={HeartPulse}
                helpText="You plus your dependants. Each member earns a medical scheme fees tax credit that reduces the PAYE withheld — so the more members, the less gross you need."
              >
                <Stepper
                  value={medAidMembers}
                  onChange={setMedAidMembers}
                  min={0}
                  max={12}
                  suffix={medAidMembers === 1 ? "member" : "members"}
                />
              </InputGroup>

              <InputGroup
                label={`Medical Scheme Contribution (${
                  period === "monthly" ? "per month" : "per year"
                })`}
                icon={HeartPulse}
                helpText="What actually comes off your payslip for medical aid. This is not a tax deduction — the tax relief comes through the credits above — but it does reduce what lands in your account."
              >
                <RandInput value={medAidPremium} onChange={setMedAidPremium} />
              </InputGroup>

              <InputGroup
                label={`Other Deductions (${
                  period === "monthly" ? "per month" : "per year"
                })`}
                icon={Wallet}
                helpText="Anything else your employer takes off — group life, a staff loan, a garnishee order, union dues, parking. These reduce your take-home but not your tax."
              >
                <RandInput
                  value={otherDeductions}
                  onChange={setOtherDeductions}
                />
              </InputGroup>

              <div className="h-px bg-slate-100 my-6" />

              <Toggle
                checked={sdlApplies}
                onChange={setSdlApplies}
                label="Employer pays Skills Development Levy"
                hint="1% of remuneration. Employers with a total annual payroll of R500 000 or less are exempt. Only affects the cost-to-company figure, not your pay."
              />
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This calculator provides estimates only and does not constitute
                tax advice. It works out the <strong>cash salary</strong> you
                need, taxed as ordinary remuneration on the annual tables. It
                does not model travel or other allowances taxed at 80% / 20%,
                fringe benefits such as a company car or employer medical
                contributions, commission, bonuses, share incentives, an
                employer&apos;s contribution to your retirement fund (itself a
                taxable fringe benefit that also counts towards the section 11F
                limit), a tax directive, or the section 6B additional medical
                expenses credit. Employers apply PAYE monthly, so a real
                payslip can differ by a few rand from the annual answer.
                Consult a registered tax professional for your situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div className="rounded-2xl shadow-xl text-white p-5 sm:p-8 bg-gradient-to-br from-[#0077BB] to-[#01527e]">
              <div className="flex justify-between items-start gap-3 mb-6">
                <div>
                  <p className="font-medium mb-1 text-sm text-blue-100">
                    Gross Salary You Need{" "}
                    {period === "monthly" ? "Per Month" : "Per Year"}
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    R {fmt(per(results.gross))}
                  </div>
                  <p className="text-sm mt-2 text-blue-100">
                    {results.annualTarget <= 0
                      ? "Enter the take-home pay you are aiming for."
                      : `To take home R ${fmt(
                          per(results.annualTarget)
                        )} ${
                          period === "monthly" ? "a month" : "a year"
                        } — that is R ${fmt(
                          per(results.totalDeductions)
                        )} of deductions, or ${results.deductionRate.toFixed(
                          1
                        )}% of gross.`}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl flex-shrink-0">
                  <Target className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-sm mb-1 text-blue-100">
                    {period === "monthly" ? "Annual Gross" : "Monthly Gross"}
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R{" "}
                    {fmt(
                      period === "monthly" ? results.gross : results.gross / 12
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">PAYE</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(per(results.slip.paye))}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">Cost to Company</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(per(results.costToCompany))}
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
                <TrendingUp size={12} className="text-[#0077BB]" />
                {(results.margRate * 100).toFixed(0)}% marginal rate
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Wallet size={12} className="text-[#0077BB]" />
                {results.effectiveTaxRate.toFixed(1)}% effective tax
              </span>
              {results.accurate && results.annualTarget > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-700 shadow-sm">
                  <CheckCircle2 size={12} />
                  Solved to the rand
                </span>
              )}
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Where the Gross Goes
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
                      Enter the take-home pay you are aiming for.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between font-semibold text-slate-800 text-sm">
                    <span>Gross salary</span>
                    <span>R {fmt(per(results.gross))}</span>
                  </div>
                  {results.slip.retirement > 0 && (
                    <Row
                      label="Less: retirement contribution"
                      value={`− R ${fmt(per(results.slip.retirement))}`}
                      accent
                    />
                  )}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-800 text-sm">
                      <span>Taxable income</span>
                      <span>R {fmt(per(results.slip.taxableIncome))}</span>
                    </div>
                  </div>
                  <Row
                    label="Tax after rebates"
                    value={`R ${fmt(per(results.slip.taxBeforeCredits))}`}
                  />
                  {results.slip.medicalCredits > 0 && (
                    <Row
                      label={`Less: medical credits (${medAidMembers} member${
                        medAidMembers === 1 ? "" : "s"
                      })`}
                      value={`− R ${fmt(per(results.slip.medicalCredits))}`}
                      accent
                    />
                  )}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-800 text-sm">
                      <span>PAYE</span>
                      <span>R {fmt(per(results.slip.paye))}</span>
                    </div>
                  </div>
                  {results.slip.uif > 0 && (
                    <Row
                      label="UIF (1%, capped)"
                      value={`R ${fmt(per(results.slip.uif))}`}
                    />
                  )}
                  {results.slip.medicalPremium > 0 && (
                    <Row
                      label="Medical scheme contribution"
                      value={`R ${fmt(per(results.slip.medicalPremium))}`}
                    />
                  )}
                  {results.slip.otherDeductions > 0 && (
                    <Row
                      label="Other deductions"
                      value={`R ${fmt(per(results.slip.otherDeductions))}`}
                    />
                  )}
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Take-home pay</span>
                      <span>R {fmt(per(results.slip.net))}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <CheckCircle2 size={11} />
                    Matches your target of R {fmt(per(results.annualTarget))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cost to company */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-slate-800">
                  What It Costs Your Employer
                </h3>
                <span className="text-xs text-slate-400">
                  {period === "monthly" ? "per month" : "per year"}
                </span>
              </div>
              <div className="space-y-3">
                <Row label="Gross salary" value={`R ${fmt(per(results.gross))}`} />
                {results.employerUif > 0 && (
                  <Row
                    label="Employer UIF (1%, matched and capped)"
                    value={`R ${fmt(per(results.employerUif))}`}
                    accent
                  />
                )}
                {results.sdl > 0 && (
                  <Row
                    label="Skills Development Levy (1%)"
                    value={`R ${fmt(per(results.sdl))}`}
                    accent
                  />
                )}
                <div className="pt-3 border-t border-dashed border-slate-200">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total cost to company</span>
                    <span>R {fmt(per(results.costToCompany))}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pt-1">
                  For every R1 that reaches your bank account, your employer
                  spends R
                  {results.slip.net > 0
                    ? (results.costToCompany / results.slip.net).toFixed(2)
                    : "0.00"}
                  .
                </p>
              </div>
            </div>

            {/* Marginal note */}
            {results.annualTarget > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-3">
                <TrendingUp className="w-5 h-5 text-[#0077BB] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold">
                    The next R1 000 of gross is worth R
                    {fmt(results.keepRate * 1000)} to you.
                  </span>{" "}
                  At this salary you are in the{" "}
                  {(results.margRate * 100).toFixed(0)}% bracket
                  {results.slip.retirement > 0 &&
                    ", and your retirement contribution takes a further slice before it reaches you"}
                  . So an extra R1 000 of gross{" "}
                  {period === "monthly" ? "a month" : "a year"} moves your
                  take-home by roughly R{fmt(results.keepRate * 1000)}{" "}
                  {period === "monthly" ? "a month" : "a year"} — worth knowing
                  before you negotiate.
                </div>
              </div>
            )}

            {/* UIF ceiling note */}
            {results.aboveUifCeiling && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex gap-3">
                <Landmark className="w-5 h-5 text-[#0077BB] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold">
                    You are above the UIF earnings ceiling.
                  </span>{" "}
                  UIF is charged on the first R
                  {fmt(UIF_CEILING_MONTHLY)} of monthly remuneration only, so
                  your contribution is pinned at R177.12 a month no matter how
                  much further the gross rises. That flat spot is exactly why
                  this page solves the salary by iteration rather than by
                  algebra — the deduction curve has a corner in it.
                </div>
              </div>
            )}

            {/* Retirement cap note */}
            {results.retirementCapped && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-2xl p-5 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold">
                    Your retirement deduction is capped.
                  </span>{" "}
                  Section 11F allows the lesser of 27.5% of income and R
                  {fmt(TAX_DATA[taxYear].retirementCap)} a year, and you have
                  hit the rand cap. Contributions above the cap are not wasted —
                  they roll over and reduce the tax on your retirement lump sum
                  or annuity later — but they give you no deduction this year.
                </div>
              </div>
            )}

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                What &quot;net&quot; means here
              </h3>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-800">
                    Every calculator answers this differently, so here is ours.
                  </strong>{" "}
                  Net means the money that actually reaches your bank account:
                  gross salary less PAYE, less UIF, less your own retirement
                  contribution, less your medical scheme contribution, less
                  anything else you listed. If your idea of &quot;net&quot; is
                  only after PAYE and UIF, set the other fields to zero.
                </p>
                <p>
                  <strong className="text-slate-800">
                    It is the PAYE calculator run backwards.
                  </strong>{" "}
                  There is no separate net-to-gross tax table. This page takes
                  the same brackets, rebates and medical credits, guesses a
                  gross, works out the resulting net, and narrows the guess
                  until the net matches your target to the rand.
                </p>
                <p>
                  <strong className="text-slate-800">
                    Medical credits cut the gross you need.
                  </strong>{" "}
                  The medical scheme fees tax credit comes off the tax itself,
                  not off your income, so it is worth the same rands to every
                  taxpayer — and it lowers the gross required for a given
                  take-home.
                </p>
                <p>
                  <strong className="text-slate-800">
                    Cost to company is a different number again.
                  </strong>{" "}
                  Your employer also pays 1% UIF and, unless their total payroll
                  is R500 000 or less, 1% Skills Development Levy on top of your
                  gross. When a job is advertised at a &quot;cost to
                  company&quot; figure, that is the number they mean.
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
      className={`flex justify-between gap-3 text-sm ${
        accent ? "text-[#0077BB] font-medium" : "text-slate-600"
      }`}
    >
      <span className="min-w-0">{label}</span>
      <span className="text-right whitespace-nowrap">{value}</span>
    </div>
  );
}
