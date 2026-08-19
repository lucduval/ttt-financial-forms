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
  Home,
  Info,
  ChevronDown,
  Calendar,
  Percent,
  Wallet,
  User,
  Ruler,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Monitor,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS income tax tables per year of assessment (1 March – 28/29 February).
// A home office deduction reduces taxable income, so the benefit is the tax
// saved at the taxpayer's marginal rate — the same brackets as the PAYE calc.
// Rules verified against SARS Interpretation Note 28 (Issue 3), 4 March 2022.

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

type Earner = "salaried" | "commission" | "selfEmployed";

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
        value={value === 0 ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? 0 : Number(raw));
        }}
        disabled={disabled}
        className={`w-full ${
          suffix ? "pl-4" : "pl-8"
        } pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold ${
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

export default function HomeOfficePage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [age, setAge] = useState(40);
  const [earner, setEarner] = useState<Earner>("salaried");
  const [income, setIncome] = useState(600000);

  // Section 23(b) qualifying gates.
  const [exclusiveUse, setExclusiveUse] = useState(true);
  const [equipped, setEquipped] = useState(true);
  const [mainlyThere, setMainlyThere] = useState(true);

  // Floor areas.
  const [officeArea, setOfficeArea] = useState(20);
  const [totalArea, setTotalArea] = useState(200);

  // Annual expenses in connection with the premises.
  const [rent, setRent] = useState(0);
  const [bondInterest, setBondInterest] = useState(45000);
  const [ratesTaxes, setRatesTaxes] = useState(12500);
  const [electricity, setElectricity] = useState(18000);
  const [repairs, setRepairs] = useState(10000);
  const [buildingInsurance, setBuildingInsurance] = useState(6000);
  const [security, setSecurity] = useState(4800);
  const [cleaning, setCleaning] = useState(0);

  // Non-premises costs.
  const [phoneInternet, setPhoneInternet] = useState(9000);
  const [wearAndTear, setWearAndTear] = useState(5600);

  const results = useMemo(() => {
    const qualifies = exclusiveUse && equipped && mainlyThere;
    const ratio = totalArea > 0 ? officeArea / totalArea : 0;

    // Section 23(m) applies to employees and office holders whose remuneration
    // is NOT mainly commission. Where it applies it limits the deduction to the
    // items listed in section 23(m)(i)–(iv).
    const restricted = earner === "salaried";

    // Interest on a bond used to acquire the premises is deductible under
    // section 24J, not section 11(a) or (d), so it fails the section 23(m)(iv)
    // exclusion and is prohibited for restricted taxpayers — for years of
    // assessment commencing on or after 1 March 2022 (IN 28 (Issue 3), 4.6.2(b)).
    const interestAllowed = !restricted;

    const premisesItems = [
      { label: "Rent", value: rent, allowed: true },
      {
        label: "Bond interest",
        value: bondInterest,
        allowed: interestAllowed,
      },
      { label: "Rates, taxes & municipal charges", value: ratesTaxes, allowed: true },
      { label: "Electricity", value: electricity, allowed: true },
      { label: "Repairs to the premises", value: repairs, allowed: true },
      { label: "Building insurance", value: buildingInsurance, allowed: true },
      { label: "Security", value: security, allowed: true },
      { label: "Cleaning", value: cleaning, allowed: true },
    ];

    // Floor-area apportionment. IN 28 is explicit that no further time-based
    // apportionment is applied on top of this.
    const apportioned = premisesItems.map((item) => ({
      ...item,
      share: item.value * ratio,
    }));

    const allowedPremises = apportioned
      .filter((i) => i.allowed)
      .reduce((s, i) => s + i.share, 0);
    const disallowedPremises = apportioned
      .filter((i) => !i.allowed)
      .reduce((s, i) => s + i.share, 0);

    // Phone, internet and stationery are not "expenses in connection with the
    // premises", so section 23(m) prohibits them for restricted taxpayers. They
    // are claimed in full (not floor-area apportioned) by everyone else.
    const phoneAllowed = !restricted;
    const allowedOther = phoneAllowed ? phoneInternet : 0;
    const disallowedOther = phoneAllowed ? 0 : phoneInternet;

    // Wear and tear on non-permanent office assets is excluded from the
    // section 23(m) prohibition by section 23(m)(ii), so everyone may claim it.
    const allowedWearAndTear = wearAndTear;

    const rawDeduction = allowedPremises + allowedOther + allowedWearAndTear;
    const deduction = qualifies ? rawDeduction : 0;
    const disallowed = disallowedPremises + disallowedOther;

    const taxWithout = taxAfterRebate(income, age, taxYear);
    const taxWith = taxAfterRebate(income - deduction, age, taxYear);
    const taxSaving = taxWithout - taxWith;
    const effectiveRate = deduction > 0 ? (taxSaving / deduction) * 100 : 0;

    // Paragraph 49: the home-office share of the property becomes "tainted" and
    // loses the primary-residence exclusion. Above 50% it stops being a primary
    // residence altogether.
    const losesPrimaryResidence = ratio > 0.5;

    return {
      qualifies,
      ratio,
      restricted,
      apportioned,
      allowedPremises,
      disallowedPremises,
      allowedOther,
      disallowedOther,
      allowedWearAndTear,
      deduction,
      disallowed,
      taxSaving,
      effectiveRate,
      losesPrimaryResidence,
    };
  }, [
    exclusiveUse,
    equipped,
    mainlyThere,
    officeArea,
    totalArea,
    earner,
    rent,
    bondInterest,
    ratesTaxes,
    electricity,
    repairs,
    buildingInsurance,
    security,
    cleaning,
    phoneInternet,
    wearAndTear,
    income,
    age,
    taxYear,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    { name: "You can claim", value: results.deduction, color: "#10b981" },
    { name: "Disallowed", value: results.disallowed, color: "#E8872E" },
  ].filter((d) => d.value > 0);

  const earnerLabels: Record<Earner, string> = {
    salaried: "Salaried employee",
    commission: "Commission earner",
    selfEmployed: "Self-employed",
  };

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Income Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Home Office Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Work out what you can actually deduct for a home office — and what
              section 23(m) quietly disallows if you are on a salary rather than
              commission.
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

              {/* Earner type */}
              <InputGroup
                label="How Are You Paid?"
                icon={Briefcase}
                helpText="Section 23(m) restricts employees whose remuneration is not mainly commission. Commission earners and the self-employed are not restricted."
              >
                <div className="bg-slate-100 p-1 rounded-xl flex">
                  {(
                    [
                      ["salaried", "Salary"],
                      ["commission", "Commission"],
                      ["selfEmployed", "Self-employed"],
                    ] as const
                  ).map(([e, label]) => (
                    <button
                      key={e}
                      onClick={() => setEarner(e)}
                      className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                        earner === e
                          ? "bg-white text-[#0077BB] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {earner === "salaried" &&
                    "More than half your pay is salary — section 23(m) applies."}
                  {earner === "commission" &&
                    "More than half your pay is commission or other performance-based variable pay."}
                  {earner === "selfEmployed" &&
                    "Sole proprietor or freelancer — you hold no office and earn no remuneration."}
                </p>
              </InputGroup>

              {/* Qualifying gates */}
              <InputGroup
                label="Do You Qualify?"
                icon={CheckCircle2}
                helpText="Section 23(b) requires all of these. Fail any one and no deduction is allowed at all."
              >
                <div className="space-y-2.5">
                  <Toggle
                    checked={exclusiveUse}
                    onChange={setExclusiveUse}
                    label="Used regularly and exclusively for work"
                    hint="A dedicated room. There is no allowance for incidental private use."
                  />
                  <Toggle
                    checked={equipped}
                    onChange={setEquipped}
                    label="Specifically equipped for your trade"
                    hint="Fitted out for the work — desk, equipment, the tools of your trade."
                  />
                  <Toggle
                    checked={mainlyThere}
                    onChange={setMainlyThere}
                    label={
                      earner === "commission"
                        ? "Duties mainly performed away from an employer's office"
                        : "More than 50% of duties performed there"
                    }
                    hint={
                      earner === "commission"
                        ? "Commission earners must mainly work somewhere other than an office provided by the employer."
                        : "A purely quantitative test — more than half your working time in the year."
                    }
                  />
                </div>
              </InputGroup>

              {/* Floor areas */}
              <InputGroup
                label="Home Office Floor Area"
                icon={Ruler}
                helpText="The actual measured area of the room. SARS does not accept estimates."
              >
                <RandInput
                  value={officeArea}
                  onChange={setOfficeArea}
                  suffix="m²"
                />
              </InputGroup>

              <InputGroup
                label="Total Floor Area of All Buildings"
                icon={Ruler}
                helpText="Every building on the property — the house plus garage, workers' quarters, outbuildings. NOT the erf size, and not the house alone."
              >
                <RandInput
                  value={totalArea}
                  onChange={setTotalArea}
                  suffix="m²"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Apportionment ratio:{" "}
                  <span className="font-semibold text-slate-700">
                    {(results.ratio * 100).toFixed(1)}%
                  </span>
                </p>
              </InputGroup>

              {/* Income */}
              <InputGroup
                label="Annual Taxable Income"
                icon={Wallet}
                helpText="Used to work out the tax you save at your marginal rate."
              >
                <RandInput value={income} onChange={setIncome} />
              </InputGroup>

              {/* Age */}
              <InputGroup
                label="Your Age"
                icon={User}
                helpText="Age determines the secondary (65+) and tertiary (75+) rebates."
              >
                <input
                  type="number"
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
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                Annual Costs
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Enter the full-year cost for the whole property — we apply the
                floor-area apportionment for you.
              </p>

              <InputGroup label="Rent" icon={Home}>
                <RandInput value={rent} onChange={setRent} />
              </InputGroup>

              <InputGroup
                label="Bond Interest"
                icon={Percent}
                helpText="Interest on a bond used to acquire the home is deductible under section 24J, so section 23(m) prohibits it for salaried employees from the 2023 year of assessment onwards."
              >
                <RandInput
                  value={bondInterest}
                  onChange={setBondInterest}
                  disabled={results.restricted}
                />
                {results.restricted && (
                  <p className="mt-2 text-xs text-[#b45f16]">
                    Prohibited by section 23(m) for salaried employees.
                  </p>
                )}
              </InputGroup>

              <InputGroup
                label="Rates, Taxes & Municipal Charges"
                icon={Home}
                helpText="Rates and taxes plus other municipal service charges such as sewerage and refuse."
              >
                <RandInput value={ratesTaxes} onChange={setRatesTaxes} />
              </InputGroup>

              <InputGroup label="Electricity" icon={Zap}>
                <RandInput value={electricity} onChange={setElectricity} />
              </InputGroup>

              <InputGroup
                label="Repairs to the Premises"
                icon={Home}
                helpText="Repairs under section 11(d) — restoring the premises, not improving them. Repairs to your computer do not qualify."
              >
                <RandInput value={repairs} onChange={setRepairs} />
              </InputGroup>

              <InputGroup
                label="Building Insurance"
                icon={Home}
                helpText="Only insurance of the building itself. Household contents insurance and bond (life) cover do not qualify."
              >
                <RandInput
                  value={buildingInsurance}
                  onChange={setBuildingInsurance}
                />
              </InputGroup>

              <InputGroup
                label="Security"
                icon={Home}
                helpText="Ongoing security costs for the premises. Capital costs such as installing a new system do not qualify."
              >
                <RandInput value={security} onChange={setSecurity} />
              </InputGroup>

              <InputGroup label="Cleaning" icon={Home}>
                <RandInput value={cleaning} onChange={setCleaning} />
              </InputGroup>

              <InputGroup
                label="Phone, Internet & Stationery"
                icon={Monitor}
                helpText="Not an expense 'in connection with the premises', so section 23(m) prohibits it for salaried employees. Claimed in full — not apportioned — by everyone else."
              >
                <RandInput
                  value={phoneInternet}
                  onChange={setPhoneInternet}
                  disabled={results.restricted}
                />
                {results.restricted && (
                  <p className="mt-2 text-xs text-[#b45f16]">
                    Prohibited by section 23(m) for salaried employees.
                  </p>
                )}
              </InputGroup>

              <InputGroup
                label="Wear & Tear on Office Equipment"
                icon={Monitor}
                helpText="The section 11(e) allowance on your computer, desk and chair. Section 23(m)(ii) allows this for everyone. Not floor-area apportioned."
              >
                <RandInput value={wearAndTear} onChange={setWearAndTear} />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimates only — not tax advice. Based on SARS Interpretation
                Note 28 (Issue 3). Sectional title levies need to be split
                between your own section and the common property before they can
                be claimed, and solar, generator and inverter costs are treated
                separately under section 12B — neither is modelled here. SARS
                requires actual measurements of floor area and will not accept an
                estimate. Consult a registered tax professional for your personal
                situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div
              className={`rounded-2xl shadow-xl text-white p-8 ${
                results.qualifies
                  ? "bg-gradient-to-br from-emerald-600 to-emerald-800"
                  : "bg-gradient-to-br from-[#0077BB] to-[#01527e]"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p
                    className={`font-medium mb-1 text-sm ${
                      results.qualifies ? "text-emerald-100" : "text-blue-100"
                    }`}
                  >
                    {results.qualifies
                      ? "Tax You Save"
                      : "You Don't Qualify Yet"}
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(results.taxSaving)}
                  </div>
                  <p
                    className={`text-sm mt-2 ${
                      results.qualifies ? "text-emerald-100" : "text-blue-100"
                    }`}
                  >
                    {results.qualifies
                      ? `From a deduction of R ${fmt(results.deduction)} as a ${
                          earnerLabels[earner]
                        }.`
                      : "Section 23(b) requires all three qualifying tests to be met."}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl">
                  <Home className="w-8 h-8 text-white" />
                </div>
              </div>

              <div
                className={`grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-white/20 pt-6`}
              >
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      results.qualifies ? "text-emerald-100" : "text-blue-100"
                    }`}
                  >
                    Deduction
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.deduction)}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      results.qualifies ? "text-emerald-100" : "text-blue-100"
                    }`}
                  >
                    Disallowed
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.disallowed)}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      results.qualifies ? "text-emerald-100" : "text-blue-100"
                    }`}
                  >
                    Office Share
                  </p>
                  <p className="text-xl font-semibold">
                    {(results.ratio * 100).toFixed(1)}%
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
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Briefcase size={12} className="text-[#0077BB]" />
                {earnerLabels[earner]}
              </span>
            </div>

            {/* Does not qualify banner */}
            {!results.qualifies && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-[#b45f16]">
                    No deduction is allowed.
                  </span>{" "}
                  Section 23(b) is all-or-nothing: the room must be regularly and
                  exclusively used for your trade, specifically equipped for it,
                  and you must mainly perform your duties there. Working from the
                  dining table three days a week does not qualify.
                </p>
              </div>
            )}

            {/* Primary residence warning */}
            {results.losesPrimaryResidence && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-[#b45f16]">
                    More than half the property is used for business.
                  </span>{" "}
                  At that point the home stops being a &quot;primary
                  residence&quot; at all, and the entire capital gain on sale —
                  including the private portion — is brought to account for CGT.
                </p>
              </div>
            )}

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">
                  Allowed vs Disallowed
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  After floor-area apportionment.
                </p>
                <div className="h-48">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) =>
                            v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                          }
                        />
                        <RechartsTooltip
                          cursor={{ fill: "#f1f5f9" }}
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
                      No qualifying home office costs entered.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  {results.apportioned
                    .filter((i) => i.value > 0 && i.allowed)
                    .map((i) => (
                      <Row
                        key={i.label}
                        label={`${i.label} × ${(results.ratio * 100).toFixed(
                          1
                        )}%`}
                        value={`R ${fmt(i.share)}`}
                      />
                    ))}
                  <Row
                    label="Premises costs allowed"
                    value={`R ${fmt(results.allowedPremises)}`}
                    accent
                  />
                  {results.allowedOther > 0 && (
                    <Row
                      label="Phone, internet & stationery"
                      value={`R ${fmt(results.allowedOther)}`}
                    />
                  )}
                  {results.allowedWearAndTear > 0 && (
                    <Row
                      label="Wear & tear (section 11(e))"
                      value={`R ${fmt(results.allowedWearAndTear)}`}
                    />
                  )}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-800 text-sm">
                      <span>Total Deduction</span>
                      <span>R {fmt(results.deduction)}</span>
                    </div>
                  </div>

                  {results.disallowed > 0 && (
                    <>
                      <div className="h-px bg-slate-100" />
                      <p className="text-xs font-semibold text-[#b45f16] pt-1">
                        Disallowed by section 23(m)
                      </p>
                      {results.apportioned
                        .filter((i) => i.value > 0 && !i.allowed)
                        .map((i) => (
                          <Row
                            key={i.label}
                            label={`${i.label} × ${(
                              results.ratio * 100
                            ).toFixed(1)}%`}
                            value={`R ${fmt(i.share)}`}
                          />
                        ))}
                      {results.disallowedOther > 0 && (
                        <Row
                          label="Phone, internet & stationery"
                          value={`R ${fmt(results.disallowedOther)}`}
                        />
                      )}
                    </>
                  )}

                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div
                      className={`flex justify-between font-bold ${
                        results.qualifies ? "text-emerald-600" : "text-[#0077BB]"
                      }`}
                    >
                      <span>Tax Saved</span>
                      <span>R {fmt(results.taxSaving)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    Worth {results.effectiveRate.toFixed(1)}% of the deduction —
                    your marginal rate.
                  </div>
                </div>
              </div>
            </div>

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                Four SARS Rules That Catch People Out
              </h3>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-800">
                    The denominator is every building, not just the house.
                  </p>
                  SARS apportions on the floor area of all buildings on the
                  property — house, garage, outbuildings, workers&apos; quarters.
                  Leaving the garage out inflates your claim. The erf size is
                  irrelevant.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Salaried employees lost the bond interest in 2022.
                  </p>
                  Bond interest is deductible under section 24J rather than
                  section 11(a), so it falls outside the section 23(m)(iv)
                  exclusion and is prohibited — for years of assessment
                  commencing on or after 1 March 2022. Commission earners and the
                  self-employed keep it.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    No second apportionment for time.
                  </p>
                  Once you have applied the floor-area ratio you claim the whole
                  amount. Working from the office three days out of five does not
                  cut your claim to three fifths — but the room must still be
                  exclusively a work room on the other two.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    It follows you to the sale of the house.
                  </p>
                  The home-office share becomes &quot;tainted&quot; and loses the
                  R2 million primary-residence exclusion, apportioned over the
                  years you used it that way. For a modest deduction now, weigh
                  the capital gain later.
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
      className={`flex justify-between text-sm ${
        accent ? "text-[#0077BB] font-medium" : "text-slate-600"
      }`}
    >
      <span className="pr-3">{label}</span>
      <span className="whitespace-nowrap flex-shrink-0">{value}</span>
    </div>
  );
}
