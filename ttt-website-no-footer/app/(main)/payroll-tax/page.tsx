"use client";

import React, { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Users,
  Info,
  ChevronDown,
  Calendar,
  Percent,
  Wallet,
  User,
  HeartPulse,
  GraduationCap,
  Landmark,
  Clock,
  Handshake,
  PiggyBank,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  Building2,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// Everything an employer pays over on a single EMP201: PAYE (Fourth Schedule),
// UIF (Unemployment Insurance Contributions Act), SDL (Skills Development
// Levies Act) and the ETI set-off (Employment Tax Incentive Act).
//
// Verified against: the SARS individual rates tables; the SARS Guide for
// Employers in respect of the UIF (UIF-GEN-01-G01, Revision 9); the SARS Guide
// for Employers in respect of Skills Development Levy (SDL-GEN-01-G01,
// Revision 5); and the SARS ETI pages including the changes effective
// 1 April 2025.

const TAX_DATA: Record<
  string,
  {
    label: string;
    brackets: { limit: number; rate: number; base: number }[];
    rebates: { primary: number; secondary: number; tertiary: number };
    medical: { main: number; firstDep: number; additional: number };
    retirementCap: number;
    // Which ETI table applied for that year of assessment.
    etiEra: "current" | "previous";
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
    etiEra: "current",
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
    etiEra: "current",
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
    etiEra: "previous",
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
    etiEra: "previous",
  },
};

// UIF: 1% employee + 1% employer, on remuneration up to a ceiling that has been
// R17 712 per month (R212 544 a year) since 1 June 2021.
const UIF_RATE = 0.01;
const UIF_CEILING_MONTHLY = 17712;

// SDL: 1% of the leviable amount. An employer is exempt where the total
// remuneration for the coming 12 months will not exceed R500 000.
const SDL_RATE = 0.01;
const SDL_EXEMPTION = 500000;

// Section 11F: 27.5% of remuneration, capped in rand per year.
const RETIREMENT_PCT = 0.275;
// Paragraph 2(4)(f): payroll-deducted section 18A donations, limited to 5% of
// remuneration after the retirement deduction.
const DONATION_PCT = 0.05;

// ETI determination table (section 7 of the ETI Act). The 1 April 2025
// amendments lifted the bands but left the R1 500 / R750 maximums alone.
const ETI_TABLES = {
  current: {
    label: "From 1 April 2025",
    firstBandTop: 2500,
    flatTop: 5500,
    cap: 7500,
    pctFirst: 0.6,
    pctSecond: 0.3,
    maxFirst: 1500,
    maxSecond: 750,
    minWage160: 2500,
  },
  previous: {
    label: "1 March 2022 – 31 March 2025",
    firstBandTop: 2000,
    flatTop: 4500,
    cap: 6500,
    pctFirst: 0.75,
    pctSecond: 0.375,
    maxFirst: 1500,
    maxSecond: 750,
    minWage160: 2000,
  },
} as const;

const ETI_FULL_HOURS = 160;

// ─── Calculation Logic ────────────────────────────────────────────────────────

function normalTax(taxableIncome: number, taxYear: string) {
  const { brackets } = TAX_DATA[taxYear];
  const value = Math.max(0, taxableIncome);
  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const floor = i === 0 ? 0 : brackets[i - 1].limit;
    if (value <= bracket.limit || i === brackets.length - 1) {
      return bracket.base + (value - floor) * bracket.rate;
    }
  }
  return 0;
}

function etiAmount(
  remuneration: number,
  era: "current" | "previous",
  firstTwelve: boolean
) {
  const t = ETI_TABLES[era];
  if (remuneration <= 0 || remuneration >= t.cap) return 0;
  const max = firstTwelve ? t.maxFirst : t.maxSecond;
  if (remuneration < t.firstBandTop) {
    return remuneration * (firstTwelve ? t.pctFirst : t.pctSecond);
  }
  if (remuneration < t.flatTop) return max;
  // Taper down to nil at the cap. The slope is 75% / 37.5% in both tables.
  const slope = firstTwelve ? 0.75 : 0.375;
  return Math.max(0, max - slope * (remuneration - t.flatTop));
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
  disabled,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
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
        disabled={disabled}
        className={`w-full ${
          suffix ? "pl-4" : "pl-8"
        } pr-14 py-3 border rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold ${
          disabled
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-slate-50 border-slate-200 text-slate-800"
        }`}
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

export default function PayrollTaxPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  // The employee's package.
  const [gross, setGross] = useState(28000);
  const [commission, setCommission] = useState(0);
  const [retirement, setRetirement] = useState(2100);
  const [donations, setDonations] = useState(0);
  const [medAidMembers, setMedAidMembers] = useState(1);
  const [age, setAge] = useState(34);
  const [under24Hours, setUnder24Hours] = useState(false);

  // The employer.
  const [annualPayroll, setAnnualPayroll] = useState(1800000);
  const [sdlExemptEmployer, setSdlExemptEmployer] = useState(false);

  // ETI.
  const [claimEti, setClaimEti] = useState(false);
  const [etiMonth, setEtiMonth] = useState(1);
  const [etiHours, setEtiHours] = useState(160);

  const results = useMemo(() => {
    const data = TAX_DATA[taxYear];
    const divisor = period === "annual" ? 12 : 1;

    const monthlyGross = gross / divisor;
    const monthlyCommission = Math.min(commission / divisor, monthlyGross);
    const monthlyRetirement = retirement / divisor;
    const monthlyDonations = donations / divisor;

    const annualGross = monthlyGross * 12;

    // ── PAYE ────────────────────────────────────────────────────────────────
    // Section 11F: the lesser of the actual contribution, 27.5% of remuneration
    // and the annual rand cap.
    const retirementAllowed = Math.min(
      monthlyRetirement * 12,
      annualGross * RETIREMENT_PCT,
      data.retirementCap
    );
    // Paragraph 2(4)(f): 5% of remuneration after the retirement deduction.
    const donationCeiling = (annualGross - retirementAllowed) * DONATION_PCT;
    const donationsAllowed = Math.min(monthlyDonations * 12, Math.max(0, donationCeiling));

    const taxableRemuneration = Math.max(
      0,
      annualGross - retirementAllowed - donationsAllowed
    );

    let rebate = data.rebates.primary;
    if (age >= 65) rebate += data.rebates.secondary;
    if (age >= 75) rebate += data.rebates.tertiary;

    let monthlyCredits = 0;
    if (medAidMembers > 0) {
      monthlyCredits += data.medical.main;
      if (medAidMembers > 1) monthlyCredits += data.medical.firstDep;
      if (medAidMembers > 2)
        monthlyCredits += (medAidMembers - 2) * data.medical.additional;
    }
    const annualCredits = monthlyCredits * 12;

    const grossTax = normalTax(taxableRemuneration, taxYear);
    const annualPaye = Math.max(0, grossTax - rebate - annualCredits);
    const monthlyPaye = annualPaye / 12;

    // ── UIF ─────────────────────────────────────────────────────────────────
    // Remuneration for UIF purposes excludes commission, pensions and retiring
    // allowances — but is NOT reduced by the employee's pension contributions.
    // The Act does not apply at all where the employee works under 24 hours a
    // month.
    const uifApplies = !under24Hours;
    const uifRemuneration = Math.max(0, monthlyGross - monthlyCommission);
    const uifBase = uifApplies
      ? Math.min(uifRemuneration, UIF_CEILING_MONTHLY)
      : 0;
    const uifCapped = uifApplies && uifRemuneration > UIF_CEILING_MONTHLY;
    const uifEmployee = uifBase * UIF_RATE;
    const uifEmployer = uifBase * UIF_RATE;

    // ── SDL ─────────────────────────────────────────────────────────────────
    // The levy is 1% of the balance of remuneration AFTER the paragraph 2(4)
    // allowable deductions — pension, provident and RA contributions and
    // payroll donations. Commission is not excluded.
    const sdlExempt = sdlExemptEmployer || annualPayroll <= SDL_EXEMPTION;
    const sdlLeviable = Math.max(
      0,
      monthlyGross - retirementAllowed / 12 - donationsAllowed / 12
    );
    const sdl = sdlExempt ? 0 : sdlLeviable * SDL_RATE;

    // ── ETI ─────────────────────────────────────────────────────────────────
    const etiTable = ETI_TABLES[data.etiEra];
    const firstTwelve = etiMonth <= 12;
    const hours = Math.max(1, etiHours);
    // Where the employee works less than 160 hours, remuneration is grossed up
    // to 160 hours, the incentive is read off the table, and the result is then
    // reduced in the same proportion.
    const grossedUp =
      hours < ETI_FULL_HOURS
        ? (monthlyGross * ETI_FULL_HOURS) / hours
        : monthlyGross;
    const etiFullMonth = etiAmount(grossedUp, data.etiEra, firstTwelve);
    const etiRaw =
      hours < ETI_FULL_HOURS
        ? (etiFullMonth * hours) / ETI_FULL_HOURS
        : etiFullMonth;
    const overEtiCap = grossedUp >= etiTable.cap;
    const underMinWage = grossedUp < etiTable.minWage160;
    const eti = claimEti ? etiRaw : 0;
    // ETI is set off against PAYE. Anything left over is carried to the
    // EMP501 reconciliation rather than paid out monthly.
    const etiClaimed = Math.min(eti, monthlyPaye);
    const etiCarried = eti - etiClaimed;

    // ── Totals ──────────────────────────────────────────────────────────────
    const emp201 = monthlyPaye - etiClaimed + uifEmployee + uifEmployer + sdl;
    const employerCost = monthlyGross + uifEmployer + sdl - etiClaimed;
    const takeHome =
      monthlyGross -
      monthlyPaye -
      uifEmployee -
      monthlyRetirement -
      monthlyDonations;

    return {
      data,
      monthlyGross,
      monthlyCommission,
      monthlyRetirement,
      monthlyDonations,
      annualGross,
      retirementAllowed,
      donationsAllowed,
      donationCeiling,
      taxableRemuneration,
      rebate,
      monthlyCredits,
      annualCredits,
      grossTax,
      annualPaye,
      monthlyPaye,
      uifApplies,
      uifRemuneration,
      uifBase,
      uifCapped,
      uifEmployee,
      uifEmployer,
      sdlExempt,
      sdlLeviable,
      sdl,
      etiTable,
      firstTwelve,
      eti,
      etiClaimed,
      etiCarried,
      overEtiCap,
      underMinWage,
      emp201,
      employerCost,
      takeHome,
    };
  }, [
    taxYear,
    period,
    gross,
    commission,
    retirement,
    donations,
    medAidMembers,
    age,
    under24Hours,
    annualPayroll,
    sdlExemptEmployer,
    claimEti,
    etiMonth,
    etiHours,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });
  const fmt2 = (n: number) =>
    n.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  // SARS publishes the ETI bands to the cent — R0 to R2 499,99, not R2 499.
  const bandTop = (n: number) => `${fmt(n - 1)},99`;

  const chartData = [
    {
      name: "PAYE",
      value: Math.max(0, results.monthlyPaye - results.etiClaimed),
      color: "#0077BB",
    },
    {
      name: "UIF",
      value: results.uifEmployee + results.uifEmployer,
      color: "#E8872E",
    },
    { name: "SDL", value: results.sdl, color: "#10b981" },
  ].filter((d) => d.value > 0);

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Payroll Taxes
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Payroll Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Every line on your monthly EMP201 for one employee — PAYE, UIF both
              sides, SDL and the ETI set-off — plus the real cost to company.
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
                The Employee
              </h2>

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="Year of assessment (1 March – 28/29 February). It sets the tax tables, the medical credits and the ETI table."
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

              {/* Period */}
              <InputGroup
                label="Are Your Figures Monthly Or Annual?"
                icon={Clock}
                helpText="EMP201 is a monthly declaration, so annual figures are divided by twelve."
              >
                <div className="bg-slate-100 p-1 rounded-xl flex">
                  {(
                    [
                      ["monthly", "Monthly"],
                      ["annual", "Annual"],
                    ] as const
                  ).map(([p, label]) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`flex-1 py-3 sm:py-2 text-sm font-semibold rounded-lg transition-all ${
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

              <InputGroup
                label="Gross Remuneration"
                icon={Wallet}
                helpText="The full package subject to PAYE — salary, allowances, overtime, commission and taxable fringe benefits."
              >
                <RandInput value={gross} onChange={setGross} />
              </InputGroup>

              <InputGroup
                label="Of Which Commission"
                icon={Handshake}
                helpText="Commission is part of remuneration for PAYE and SDL, but the UIF Act excludes it from the contribution base entirely."
              >
                <RandInput value={commission} onChange={setCommission} />
                {results.monthlyCommission > 0 && (
                  <p className="mt-2 text-xs text-emerald-700">
                    Excluded from the UIF base — R{" "}
                    {fmt2(results.monthlyCommission)} a month.
                  </p>
                )}
              </InputGroup>

              <InputGroup
                label="Retirement Fund Contributions"
                icon={PiggyBank}
                helpText="The employee's pension, provident or RA contributions deducted through payroll. Limited to 27.5% of remuneration and the annual rand cap."
              >
                <RandInput value={retirement} onChange={setRetirement} />
                <p className="mt-2 text-xs text-slate-500">
                  Deductible for PAYE:{" "}
                  <span className="font-semibold text-slate-700">
                    R {fmt(results.retirementAllowed / 12)}
                  </span>{" "}
                  a month · annual cap R {fmt(results.data.retirementCap)}.
                </p>
              </InputGroup>

              <InputGroup
                label="Payroll Donations (Section 18A)"
                icon={Handshake}
                helpText="Donations the employer pays over on the employee's behalf to an approved PBO. Limited to 5% of remuneration after the retirement deduction."
              >
                <RandInput value={donations} onChange={setDonations} />
                <p className="mt-2 text-xs text-slate-500">
                  5% ceiling:{" "}
                  <span className="font-semibold text-slate-700">
                    R {fmt(results.donationCeiling / 12)}
                  </span>{" "}
                  a month.
                </p>
              </InputGroup>

              <InputGroup
                label="Medical Aid Members"
                icon={HeartPulse}
                helpText="Main member plus dependants. The employer sets the section 6A credit off against PAYE each month."
              >
                <Stepper
                  value={medAidMembers}
                  onChange={setMedAidMembers}
                  min={0}
                  max={12}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Monthly credit:{" "}
                  <span className="font-semibold text-slate-700">
                    R {fmt(results.monthlyCredits)}
                  </span>
                </p>
              </InputGroup>

              <InputGroup
                label="Employee Age"
                icon={User}
                helpText="Age determines the secondary (65+) and tertiary (75+) rebates."
              >
                <input
                  type="number"
                  inputMode="decimal"
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

              <InputGroup
                label="Hours Worked"
                icon={Clock}
                helpText="The UIF Act does not apply to an employee who works less than 24 hours a month."
              >
                <Toggle
                  checked={under24Hours}
                  onChange={setUnder24Hours}
                  label="Works less than 24 hours a month"
                  hint="No UIF contribution is due by either side."
                />
              </InputGroup>
            </div>

            {/* Employer */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                The Employer
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                SDL is an employer-level levy, so it depends on your whole
                payroll — not on this one employee.
              </p>

              <InputGroup
                label="Total Annual Payroll"
                icon={Building2}
                helpText="Total remuneration payable to all employees over the next 12 months. Below R500 000 you are not required to register for SDL."
              >
                <RandInput value={annualPayroll} onChange={setAnnualPayroll} />
                <p
                  className={`mt-2 text-xs ${
                    results.sdlExempt ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {results.sdlExempt
                    ? "Below the R500 000 threshold — no SDL is payable."
                    : "Above the R500 000 threshold — SDL applies at 1%."}
                </p>
              </InputGroup>

              <InputGroup
                label="Exempt Employer?"
                icon={GraduationCap}
                helpText="National and provincial government, public entities largely funded by Parliament, certain PBOs and exempted municipalities pay no SDL."
              >
                <Toggle
                  checked={sdlExemptEmployer}
                  onChange={setSdlExemptEmployer}
                  label="Government, exempt PBO or exempted municipality"
                  hint="Exempt from SDL, but still registers for PAYE."
                />
              </InputGroup>
            </div>

            {/* ETI */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                Employment Tax Incentive
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Optional. ETI reduces the PAYE you pay over for a young
                employee — up to R1 500 a month, for up to 24 months.
              </p>

              <InputGroup
                label="Qualifying ETI Employee?"
                icon={GraduationCap}
                helpText="Aged 18 to 29, holds a South African ID, asylum seeker permit or refugee ID, first employed by you on or after 1 October 2013, not a connected person, not a domestic worker, and paid at least the applicable minimum wage."
              >
                <Toggle
                  checked={claimEti}
                  onChange={setClaimEti}
                  label="Yes — all the qualifying tests are met"
                  hint="Age 18–29, valid ID, employed since 1 October 2013, not connected to you, not a domestic worker, paid at least the minimum wage."
                />
              </InputGroup>

              <InputGroup
                label="Month Of Employment"
                icon={Calendar}
                helpText="Months 1 to 12 pay the higher rate; months 13 to 24 pay half. After 24 qualifying months the incentive stops."
              >
                <Stepper
                  value={etiMonth}
                  onChange={setEtiMonth}
                  min={1}
                  max={24}
                  suffix={etiMonth === 1 ? "month" : "months"}
                />
                <p className="mt-2 text-xs text-slate-500">
                  {results.firstTwelve
                    ? "First 12 months — the higher band applies."
                    : "Second 12 months — the incentive halves."}
                </p>
              </InputGroup>

              <InputGroup
                label="Hours Employed This Month"
                icon={Clock}
                helpText="160 hours is a full month. Below that, remuneration is grossed up to 160 hours to read the table, then the incentive is scaled back down."
              >
                <RandInput
                  value={etiHours}
                  onChange={setEtiHours}
                  suffix="hrs"
                />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimates only — not tax advice. This models one employee; your
                actual EMP201 aggregates every employee, and ETI is set off
                against the total PAYE for the month. Directors&apos; deemed
                remuneration, travel and other allowances with a partial
                inclusion, tax directives, variable and annual payments,
                retrospective ETI disqualification for outstanding returns or
                debt, and the special economic zone rules are not modelled.
                Consult a registered tax professional or your payroll provider.
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
                    Monthly EMP201 Payment
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    R {fmt2(results.emp201)}
                  </div>
                  <p className="text-sm mt-2 text-blue-100">
                    Due to SARS within 7 days after month end, for one employee
                    on R {fmt(results.monthlyGross)} a month.
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl flex-shrink-0">
                  <FileText className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-sm mb-1 text-blue-100">PAYE</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt2(results.monthlyPaye)}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">UIF</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt2(results.uifEmployee + results.uifEmployer)}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">SDL</p>
                  <p className="text-lg sm:text-xl font-semibold">R {fmt2(results.sdl)}</p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">ETI Earned</p>
                  <p className="text-lg sm:text-xl font-semibold">R {fmt2(results.eti)}</p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 -mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {results.data.label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Landmark size={12} className="text-[#0077BB]" />
                UIF ceiling R {fmt(UIF_CEILING_MONTHLY)} p/m
              </span>
              {claimEti && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                  <GraduationCap size={12} className="text-[#0077BB]" />
                  ETI table {results.etiTable.label}
                </span>
              )}
            </div>

            {/* Warnings */}
            {results.uifCapped && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-[#0077BB] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  UIF is capped. Remuneration of R{" "}
                  {fmt(results.uifRemuneration)} exceeds the R{" "}
                  {fmt(UIF_CEILING_MONTHLY)} monthly ceiling, so each side
                  contributes the maximum R {fmt2(UIF_CEILING_MONTHLY * UIF_RATE)}{" "}
                  — R {fmt2(UIF_CEILING_MONTHLY * UIF_RATE * 2)} in total, no
                  matter how much more the employee earns.
                </p>
              </div>
            )}

            {claimEti && results.overEtiCap && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-[#b45f16]">
                    No ETI is available.
                  </span>{" "}
                  Monthly remuneration of R {fmt(results.monthlyGross)} is at or
                  above the R {fmt(results.etiTable.cap)} ceiling for this
                  period. The incentive tapers to nil there.
                </p>
              </div>
            )}

            {claimEti && !results.overEtiCap && results.underMinWage && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-[#b45f16]">
                    Check the minimum wage.
                  </span>{" "}
                  Grossed up to 160 hours this employee earns under R{" "}
                  {fmt(results.etiTable.minWage160)} a month. Where no wage
                  regulating measure applies, that is the floor below which no
                  ETI may be claimed at all — so the figure shown assumes an
                  applicable minimum wage is in place and is being met.
                </p>
              </div>
            )}

            {claimEti && results.etiCarried > 0.5 && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-[#0077BB] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  ETI of R {fmt2(results.eti)} exceeds this employee&apos;s PAYE
                  of R {fmt2(results.monthlyPaye)}. On a real EMP201 you set the
                  incentive off against the total PAYE for all employees; any
                  unused R {fmt2(results.etiCarried)} rolls into the EMP501
                  reconciliation rather than being paid out this month.
                </p>
              </div>
            )}

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">
                  What Makes Up The EMP201
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  After the ETI set-off.
                </p>
                <div className="h-56">
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
                              maximumFractionDigits: 2,
                            })}`
                          }
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-sm text-slate-400 px-4">
                      Nothing is payable on this month&apos;s EMP201.
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
                    label="Annual remuneration"
                    value={`R ${fmt(results.annualGross)}`}
                  />
                  {results.retirementAllowed > 0 && (
                    <Row
                      label="Less retirement contributions"
                      value={`− R ${fmt(results.retirementAllowed)}`}
                    />
                  )}
                  {results.donationsAllowed > 0 && (
                    <Row
                      label="Less payroll donations"
                      value={`− R ${fmt(results.donationsAllowed)}`}
                    />
                  )}
                  <Row
                    label="Taxable remuneration"
                    value={`R ${fmt(results.taxableRemuneration)}`}
                    accent
                  />
                  <Row
                    label="Tax per the tables"
                    value={`R ${fmt(results.grossTax)}`}
                  />
                  <Row label="Less rebates" value={`− R ${fmt(results.rebate)}`} />
                  {results.annualCredits > 0 && (
                    <Row
                      label="Less medical credits"
                      value={`− R ${fmt(results.annualCredits)}`}
                    />
                  )}
                  <Row
                    label="Annual PAYE"
                    value={`R ${fmt(results.annualPaye)}`}
                    accent
                  />
                  <div className="h-px bg-slate-100" />
                  <Row
                    label="PAYE for the month"
                    value={`R ${fmt2(results.monthlyPaye)}`}
                  />
                  {results.etiClaimed > 0 && (
                    <Row
                      label="Less ETI set off against this employee's PAYE"
                      value={`− R ${fmt2(results.etiClaimed)}`}
                    />
                  )}
                  <Row
                    label={`UIF — employee (1% of R ${fmt(results.uifBase)})`}
                    value={`R ${fmt2(results.uifEmployee)}`}
                  />
                  <Row
                    label="UIF — employer (1%)"
                    value={`R ${fmt2(results.uifEmployer)}`}
                  />
                  <Row
                    label={
                      results.sdlExempt
                        ? "SDL — exempt employer"
                        : `SDL (1% of R ${fmt(results.sdlLeviable)})`
                    }
                    value={`R ${fmt2(results.sdl)}`}
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-[#0077BB]">
                      <span className="pr-3">Total EMP201</span>
                      <span className="whitespace-nowrap">
                        R {fmt2(results.emp201)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} className="mt-0.5 flex-shrink-0" />
                    <span>
                      {(
                        (results.emp201 / Math.max(1, results.monthlyGross)) *
                        100
                      ).toFixed(1)}
                      % of gross remuneration goes to SARS each month.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Two sides of the payslip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">
                  What It Costs You
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  The employer&apos;s side, per month.
                </p>
                <div className="space-y-3">
                  <Row
                    label="Gross remuneration"
                    value={`R ${fmt2(results.monthlyGross)}`}
                  />
                  <Row
                    label="Employer UIF"
                    value={`R ${fmt2(results.uifEmployer)}`}
                  />
                  <Row label="SDL" value={`R ${fmt2(results.sdl)}`} />
                  {results.etiClaimed > 0 && (
                    <Row
                      label="Less ETI"
                      value={`− R ${fmt2(results.etiClaimed)}`}
                    />
                  )}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-[#0077BB]">
                      <span className="pr-3">Cost To Company</span>
                      <span className="whitespace-nowrap">
                        R {fmt2(results.employerCost)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">
                  What They Take Home
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  The employee&apos;s side, per month.
                </p>
                <div className="space-y-3">
                  <Row
                    label="Gross remuneration"
                    value={`R ${fmt2(results.monthlyGross)}`}
                  />
                  <Row label="PAYE" value={`− R ${fmt2(results.monthlyPaye)}`} />
                  <Row
                    label="Employee UIF"
                    value={`− R ${fmt2(results.uifEmployee)}`}
                  />
                  {results.monthlyRetirement > 0 && (
                    <Row
                      label="Retirement contributions"
                      value={`− R ${fmt2(results.monthlyRetirement)}`}
                    />
                  )}
                  {results.monthlyDonations > 0 && (
                    <Row
                      label="Payroll donations"
                      value={`− R ${fmt2(results.monthlyDonations)}`}
                    />
                  )}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span className="pr-3">Net Pay</span>
                      <span className="whitespace-nowrap">
                        R {fmt2(results.takeHome)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-slate-400 pt-1">
                    <Info size={11} className="mt-0.5 flex-shrink-0" />
                    <span>
                      SDL and the employer&apos;s UIF are never deducted from the
                      employee — they sit on top of the package.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                Four Payroll Rules That Catch People Out
              </h3>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-800">
                    Commission is not in the UIF base.
                  </p>
                  Remuneration for UIF purposes expressly excludes any amount paid
                  by way of commission, along with pensions and retiring
                  allowances. A commission-heavy sales role can owe far less UIF
                  than its payslip suggests — and payroll systems configured on
                  gross pay quietly over-deduct.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    SDL and UIF use different bases.
                  </p>
                  SDL is 1% of the balance of remuneration <em>after</em> the
                  paragraph 2(4) deductions — pension, provident and RA
                  contributions and payroll donations come off first. UIF gets no
                  such reduction. Same payslip, two different bases, and mixing
                  them up is one of the most common EMP201 errors.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    The UIF ceiling has not moved since June 2021.
                  </p>
                  Contributions stop at R17 712 a month, so the most anyone pays
                  is R177.12 each side — R354.24 in total. Everyone earning above
                  the ceiling pays exactly the same amount.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    ETI bands moved on 1 April 2025, but the maximum did not.
                  </p>
                  The tax-free band rose from R2 000 to R2 500 and the cut-off
                  from R6 500 to R7 500, yet the maximum incentive stayed at
                  R1 500 in the first year and R750 in the second. Because the
                  change took effect on 1 April 2025, the 2026 year of assessment
                  actually straddles both tables — March 2025 still used the old
                  one.
                </div>
              </div>
            </div>

            {/* ETI table reference */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <GraduationCap size={16} className="text-[#0077BB]" />
                ETI Table — {results.etiTable.label}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Per qualifying employee, per month.
              </p>
              <div className="space-y-1.5">
                {[
                  {
                    band: `R 0 – R ${bandTop(results.etiTable.firstBandTop)}`,
                    first: `${(results.etiTable.pctFirst * 100).toFixed(
                      0
                    )}% of pay`,
                    second: `${(results.etiTable.pctSecond * 100).toFixed(
                      0
                    )}% of pay`,
                  },
                  {
                    band: `R ${fmt(results.etiTable.firstBandTop)} – R ${bandTop(
                      results.etiTable.flatTop
                    )}`,
                    first: `R ${fmt(results.etiTable.maxFirst)}`,
                    second: `R ${fmt(results.etiTable.maxSecond)}`,
                  },
                  {
                    band: `R ${fmt(results.etiTable.flatTop)} – R ${bandTop(
                      results.etiTable.cap
                    )}`,
                    first: "Tapers to nil",
                    second: "Tapers to nil",
                  },
                  {
                    band: `R ${fmt(results.etiTable.cap)} and above`,
                    first: "No incentive",
                    second: "No incentive",
                  },
                ].map((row, i) => {
                  const active =
                    claimEti &&
                    ((i === 0 && results.monthlyGross < results.etiTable.firstBandTop) ||
                      (i === 1 &&
                        results.monthlyGross >= results.etiTable.firstBandTop &&
                        results.monthlyGross < results.etiTable.flatTop) ||
                      (i === 2 &&
                        results.monthlyGross >= results.etiTable.flatTop &&
                        results.monthlyGross < results.etiTable.cap) ||
                      (i === 3 && results.monthlyGross >= results.etiTable.cap));
                  return (
                    <div
                      key={i}
                      className={`flex justify-between items-center px-3 py-2.5 rounded-xl text-sm ${
                        active
                          ? "bg-[#0077BB]/10 border border-[#0077BB]/30 font-semibold text-[#0077BB]"
                          : "bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span className="pr-3">{row.band}</span>
                      <span className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">
                        {results.firstTwelve ? row.first : row.second}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Showing the{" "}
                {results.firstTwelve ? "first" : "second"} 12 months of
                employment.
              </p>
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
      <span className="pr-3">{label}</span>
      <span className="whitespace-nowrap flex-shrink-0">{value}</span>
    </div>
  );
}
