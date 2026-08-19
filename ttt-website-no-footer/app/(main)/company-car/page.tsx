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
  Car,
  Info,
  ChevronDown,
  Calendar,
  Route,
  Briefcase,
  Fuel,
  Wrench,
  Percent,
  Banknote,
  ShieldCheck,
  FileText,
  Minus,
  Plus,
  Wallet,
  Landmark,
  TrendingDown,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS income tax tables per year of assessment (1 March – 28/29 February).
// Used to work out the extra tax the company-car fringe benefit costs you: the
// benefit is added to your taxable income on assessment, so the tax on it is the
// difference between your tax with and without it.

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

// SARS deemed FUEL cost per kilometre, by determined-value band, per year of
// assessment. This is the fuel column of the Gazetted cost-scale table (the same
// table used for travel allowances) — Interpretation Note 72 confirms the private
// fuel reduction is "private km × deemed fuel rate per kilometre per Gazette".
// Bands differ by year: 2024–2026 step in R100,000, 2027 steps in R115,000.
//   fuel = cents per kilometre.

type FuelBand = { limit: number; fuel: number };

const FUEL_BANDS: Record<string, FuelBand[]> = {
  "2027": [
    { limit: 115000, fuel: 132.9 },
    { limit: 230000, fuel: 148.4 },
    { limit: 345000, fuel: 161.2 },
    { limit: 460000, fuel: 173.4 },
    { limit: 575000, fuel: 185.5 },
    { limit: 690000, fuel: 212.8 },
    { limit: 805000, fuel: 216.5 },
    { limit: 920000, fuel: 220.1 },
    { limit: Infinity, fuel: 220.1 },
  ],
  "2026": [
    { limit: 100000, fuel: 146.7 },
    { limit: 200000, fuel: 163.8 },
    { limit: 300000, fuel: 177.9 },
    { limit: 400000, fuel: 191.4 },
    { limit: 500000, fuel: 204.8 },
    { limit: 600000, fuel: 234.9 },
    { limit: 700000, fuel: 238.9 },
    { limit: Infinity, fuel: 242.9 },
  ],
  "2025": [
    { limit: 100000, fuel: 151.7 },
    { limit: 200000, fuel: 169.4 },
    { limit: 300000, fuel: 184.0 },
    { limit: 400000, fuel: 197.9 },
    { limit: 500000, fuel: 211.8 },
    { limit: 600000, fuel: 243.0 },
    { limit: 700000, fuel: 247.1 },
    { limit: Infinity, fuel: 251.2 },
  ],
  "2024": [
    { limit: 100000, fuel: 141.5 },
    { limit: 200000, fuel: 158.0 },
    { limit: 300000, fuel: 171.7 },
    { limit: 400000, fuel: 184.6 },
    { limit: 500000, fuel: 197.6 },
    { limit: 600000, fuel: 226.6 },
    { limit: 700000, fuel: 230.5 },
    { limit: Infinity, fuel: 234.3 },
  ],
};

// Paragraph 7(4): 3.5% of determined value per month, reduced to 3.25% where a
// maintenance plan was included in the purchase price at the time of purchase.
const RATE_STANDARD = 0.035;
const RATE_MAINTENANCE_PLAN = 0.0325;

// Fourth Schedule "remuneration": the employer includes 80% of the monthly cash
// equivalent in remuneration for PAYE — only 20% where the employer is satisfied
// at least 80% of the use for the year will be for business purposes.
const PAYE_INCLUSION_HIGH = 0.8;
const PAYE_INCLUSION_LOW = 0.2;
const BUSINESS_USE_THRESHOLD = 80;

// Seventh Schedule para 7(1): 15% per completed 12 months on the reducing-balance
// method, where the employer held the vehicle before granting the employee use.
const DEPRECIATION_RATE = 0.15;

// ─── Calculation Logic ────────────────────────────────────────────────────────

function fuelBandFor(determinedValue: number, taxYear: string) {
  const bands = FUEL_BANDS[taxYear];
  return bands.find((b) => determinedValue <= b.limit) ?? bands[bands.length - 1];
}

function calculateAnnualTax(taxable: number, taxYear: string) {
  const { brackets } = TAX_DATA[taxYear];
  const income = Math.max(0, taxable);
  const bracket = brackets.find((b) => income <= b.limit) ?? brackets[brackets.length - 1];
  const prevLimit = brackets[brackets.indexOf(bracket) - 1]?.limit ?? 0;
  return bracket.base + (income - prevLimit) * bracket.rate;
}

function taxAfterRebate(taxable: number, taxYear: string, age: number) {
  const { rebates } = TAX_DATA[taxYear];
  let rebate = rebates.primary;
  if (age >= 65) rebate += rebates.secondary;
  if (age >= 75) rebate += rebates.tertiary;
  return Math.max(0, calculateAnnualTax(taxable, taxYear) - rebate);
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
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  disabled?: boolean;
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
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? 0 : Number(raw));
        }}
        className={`w-full ${
          suffix ? "pl-4 pr-14" : "pl-8 pr-4"
        } py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`}
        placeholder="0"
        min={0}
      />
      {suffix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
          {suffix}
        </div>
      )}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  suffix,
  min = 0,
  max = 99,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
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
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        aria-label="Increase"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompanyCarPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [determinedValue, setDeterminedValue] = useState(400000);
  const [maintenancePlan, setMaintenancePlan] = useState(true);
  const [yearsHeldBefore, setYearsHeldBefore] = useState(0);
  const [months, setMonths] = useState(12);
  const [totalKm, setTotalKm] = useState(36000);
  const [businessKm, setBusinessKm] = useState(17000);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [licenceCost, setLicenceCost] = useState(0);
  const [insuranceCost, setInsuranceCost] = useState(0);
  const [maintenanceCost, setMaintenanceCost] = useState(0);
  const [paysFuel, setPaysFuel] = useState(false);
  const [otherIncome, setOtherIncome] = useState(600000);
  const [age, setAge] = useState(40);

  const results = useMemo(() => {
    // ── Determined value, after any reducing-balance depreciation ──
    const rate = maintenancePlan ? RATE_MAINTENANCE_PLAN : RATE_STANDARD;
    const adjustedValue =
      determinedValue * Math.pow(1 - DEPRECIATION_RATE, yearsHeldBefore);
    const depreciation = determinedValue - adjustedValue;

    // ── Value of private use ──
    const monthlyValue = adjustedValue * rate;
    const annualValue = monthlyValue * months;

    // ── Logbook split ──
    const bizKm = Math.min(businessKm, totalKm || businessKm);
    const privateKm = Math.max(0, totalKm - bizKm);
    const businessPct = totalKm > 0 ? (bizKm / totalKm) * 100 : 0;
    const privateRatio = totalKm > 0 ? privateKm / totalKm : 0;

    // ── Reduction on assessment for business use (para 7(7)) ──
    const businessReduction =
      totalKm > 0 ? annualValue * (bizKm / totalKm) : 0;

    // ── Reductions for costs the employee bears in full (para 7(8)) ──
    const licenceReduction = licenceCost * privateRatio;
    const insuranceReduction = insuranceCost * privateRatio;
    // A vehicle under a maintenance plan means the employee cannot have borne
    // the full cost of maintenance, so no maintenance reduction is available.
    const maintenanceReduction = maintenancePlan
      ? 0
      : maintenanceCost * privateRatio;
    const band = fuelBandFor(adjustedValue, taxYear);
    const fuelRate = band.fuel / 100;
    const fuelReduction = paysFuel ? privateKm * fuelRate : 0;
    const costReductions =
      licenceReduction +
      insuranceReduction +
      maintenanceReduction +
      fuelReduction;

    // ── Consideration paid to the employer for the use of the vehicle ──
    const consideration = monthlyPayment * months;

    const rawCashEquivalent =
      annualValue - businessReduction - costReductions - consideration;
    const cashEquivalent = Math.max(0, rawCashEquivalent);
    // Reductions cannot create a loss — they can only wipe the benefit out.
    const fullyReduced = annualValue > 0 && rawCashEquivalent <= 0;

    // ── Tax on the benefit: the difference it makes to your assessment ──
    const taxWithout = taxAfterRebate(otherIncome, taxYear, age);
    const taxWith = taxAfterRebate(otherIncome + cashEquivalent, taxYear, age);
    const taxOnBenefit = taxWith - taxWithout;
    const effectiveRate =
      cashEquivalent > 0 ? (taxOnBenefit / cashEquivalent) * 100 : 0;

    // ── Monthly PAYE: 80% of the cash equivalent, or 20% if mostly business ──
    const payeInclusion =
      businessPct >= BUSINESS_USE_THRESHOLD
        ? PAYE_INCLUSION_LOW
        : PAYE_INCLUSION_HIGH;
    const monthlyCashEquivalent = Math.max(0, monthlyValue - monthlyPayment);
    const monthlyPayeBenefit = monthlyCashEquivalent * payeInclusion;

    return {
      rate,
      adjustedValue,
      depreciation,
      monthlyValue,
      annualValue,
      bizKm,
      privateKm,
      businessPct,
      privateRatio,
      businessReduction,
      licenceReduction,
      insuranceReduction,
      maintenanceReduction,
      fuelReduction,
      costReductions,
      consideration,
      cashEquivalent,
      fullyReduced,
      taxOnBenefit,
      effectiveRate,
      fuelRate,
      payeInclusion,
      monthlyCashEquivalent,
      monthlyPayeBenefit,
      overBusiness: businessKm > totalKm && totalKm > 0,
    };
  }, [
    taxYear,
    determinedValue,
    maintenancePlan,
    yearsHeldBefore,
    months,
    totalKm,
    businessKm,
    monthlyPayment,
    licenceCost,
    insuranceCost,
    maintenanceCost,
    paysFuel,
    otherIncome,
    age,
  ]);

  const fmt = (n: number) =>
    n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    {
      name: "Taxable benefit",
      value: Math.round(results.cashEquivalent),
      color: "#E8872E",
    },
    {
      name: "Business use",
      value: Math.round(results.businessReduction),
      color: "#059669",
    },
    {
      name: "Costs you pay",
      value: Math.round(results.costReductions),
      color: "#0077BB",
    },
    {
      name: "Paid to employer",
      value: Math.round(results.consideration),
      color: "#94a3b8",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Car className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Fringe Benefits
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Company Car Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Driving an employer-provided vehicle? Work out the fringe-benefit
              tax on your company car, the PAYE added to your payslip each month,
              and how much a logbook can cut it down on assessment.
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
                Your Company Car
              </h2>

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="The year of assessment (1 March – 28/29 February). The tax tables and the SARS deemed fuel rates change every year."
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

              {/* Determined value */}
              <InputGroup
                label="Determined Value of the Vehicle"
                icon={Car}
                helpText="The retail market value your employer paid for the car, INCLUDING VAT but excluding finance charges, interest and insurance. For a car held under an instalment agreement, use the cash value."
              >
                <RandInput
                  value={determinedValue}
                  onChange={setDeterminedValue}
                />
              </InputGroup>

              {/* Maintenance plan */}
              <InputGroup
                label="Maintenance Plan"
                icon={Wrench}
                helpText="If a maintenance plan was included in the purchase price at the time the employer bought the car, the monthly rate drops from 3.5% to 3.25%. A top-up plan added later does not count — and a car under a plan means you cannot claim a maintenance reduction."
              >
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMaintenancePlan(true)}
                    className={`px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                      maintenancePlan
                        ? "bg-[#0077BB]/10 border-[#0077BB]/40 text-[#0077BB]"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    Included — 3.25%
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaintenancePlan(false)}
                    className={`px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                      !maintenancePlan
                        ? "bg-[#0077BB]/10 border-[#0077BB]/40 text-[#0077BB]"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    None — 3.5%
                  </button>
                </div>
              </InputGroup>

              {/* Months of use */}
              <InputGroup
                label="Months You Had the Car"
                icon={Calendar}
                helpText="The number of months in the tax year you were entitled to use the car for private purposes. Part of a month counts as a month, pro-rated by days."
              >
                <Stepper
                  value={months}
                  onChange={setMonths}
                  suffix="month"
                  min={1}
                  max={12}
                />
              </InputGroup>

              {/* Depreciation */}
              <InputGroup
                label="Years Your Employer Owned It First"
                icon={TrendingDown}
                helpText="If your employer had the car for 12 months or more before giving you the use of it, the determined value drops by 15% for each completed 12-month period, on the reducing-balance method. Leave at 0 if the car was new to the company when you got it."
              >
                <Stepper
                  value={yearsHeldBefore}
                  onChange={setYearsHeldBefore}
                  suffix="year"
                  min={0}
                  max={10}
                />
              </InputGroup>

              {/* Consideration */}
              <InputGroup
                label="Monthly Amount You Pay Your Employer"
                icon={Wallet}
                helpText="Any monthly amount you pay your employer for the right to use the car. This reduces the taxable benefit — but payments towards licence, insurance, maintenance or fuel do not count here (claim those below instead)."
              >
                <RandInput
                  value={monthlyPayment}
                  onChange={setMonthlyPayment}
                />
              </InputGroup>
            </div>

            {/* Logbook & costs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-1 h-6 bg-[#E8872E] rounded-full mr-3" />
                Your Logbook &amp; Costs
              </h2>

              <InputGroup
                label="Total km Travelled"
                icon={Route}
                helpText="Total kilometres travelled in the car during the tax year, per your logbook."
              >
                <RandInput value={totalKm} onChange={setTotalKm} suffix="km" />
              </InputGroup>

              <InputGroup
                label="Business km Travelled"
                icon={Briefcase}
                helpText="Kilometres travelled for business, substantiated by a logbook. Travel between home and work is private, not business. Without a logbook SARS allows no reduction at all."
              >
                <RandInput
                  value={businessKm}
                  onChange={setBusinessKm}
                  suffix="km"
                />
              </InputGroup>

              {results.overBusiness && (
                <p className="text-xs text-amber-600 -mt-3 mb-4">
                  Business km can&apos;t exceed total km — capped at total.
                </p>
              )}

              <p className="text-xs text-slate-500 leading-relaxed mb-5 bg-slate-50 border border-slate-100 rounded-xl p-3">
                You can only claim the costs below if you bear{" "}
                <strong>100% of that cost yourself</strong>, for the whole period
                you had the car, with no reimbursement from your employer.
              </p>

              <InputGroup
                label="Licence Cost You Paid (per year)"
                icon={FileText}
                helpText="The full annual licence and registration cost, if you paid all of it yourself. Reduced by your private-use share."
              >
                <RandInput value={licenceCost} onChange={setLicenceCost} />
              </InputGroup>

              <InputGroup
                label="Insurance Cost You Paid (per year)"
                icon={ShieldCheck}
                helpText="The full annual insurance premium, if you paid all of it yourself. Reduced by your private-use share."
              >
                <RandInput value={insuranceCost} onChange={setInsuranceCost} />
              </InputGroup>

              <InputGroup
                label="Maintenance Cost You Paid (per year)"
                icon={Wrench}
                helpText="Full annual maintenance and repair costs you bore yourself. Not available where the car came with a maintenance plan — in that case you did not bear the full cost."
              >
                <RandInput
                  value={maintenanceCost}
                  onChange={setMaintenanceCost}
                  disabled={maintenancePlan}
                />
                {maintenancePlan && (
                  <p className="text-xs text-slate-400 mt-2">
                    Not claimable — the car is under a maintenance plan.
                  </p>
                )}
              </InputGroup>

              <InputGroup
                label="Fuel"
                icon={Fuel}
                helpText="If you pay for all the fuel yourself, SARS reduces the benefit by your private km × the Gazetted deemed fuel rate for your car's value band — you do not need your actual fuel slips for this."
              >
                <button
                  type="button"
                  onClick={() => setPaysFuel(!paysFuel)}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    paysFuel
                      ? "bg-[#0077BB]/10 border-[#0077BB]/40 text-[#0077BB]"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <Fuel className="w-4 h-4" />
                  {paysFuel
                    ? `I pay all the fuel — R${results.fuelRate.toFixed(2)}/km`
                    : "My employer pays the fuel"}
                </button>
              </InputGroup>

              <InputGroup
                label="Your Other Annual Taxable Income"
                icon={Landmark}
                helpText="Your salary and other taxable income for the year, excluding the company car benefit. The benefit is added on top of this, so it is taxed at your top marginal rate."
              >
                <RandInput value={otherIncome} onChange={setOtherIncome} />
              </InputGroup>

              <InputGroup
                label="Your Age"
                icon={Percent}
                helpText="SARS gives a bigger rebate from age 65 and again from 75, which affects your overall tax position."
              >
                <RandInput value={age} onChange={setAge} suffix="yrs" />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimate only. A SARS-compliant logbook is compulsory — without one
                no reduction is allowed and the full benefit is taxed. The business
                and cost reductions are only applied when SARS assesses your ITR12,
                not by your employer through payroll, so you may pay more PAYE
                during the year and recover it on assessment. Cars held under an
                operating lease, pool cars and vehicles with no taxable value are
                not covered here. Consult a registered tax professional for your
                situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div className="bg-gradient-to-br from-[#0077BB] to-[#01527e] rounded-2xl shadow-xl text-white p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-blue-200 font-medium mb-1 text-sm">
                    Taxable Fringe Benefit for the Year
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(results.cashEquivalent)}
                  </div>
                  <p className="text-sm text-blue-200 mt-2">
                    Adds about R {fmt(results.taxOnBenefit)} to your tax bill —
                    roughly {results.effectiveRate.toFixed(1)}% of the benefit.
                  </p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <Car className="w-8 h-8 text-blue-200" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div>
                  <p className="text-blue-200 text-sm mb-1">Monthly Benefit</p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.monthlyValue)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm mb-1">Business Use</p>
                  <p className="text-xl font-semibold">
                    {results.businessPct.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm mb-1">Extra Tax</p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.taxOnBenefit)}
                  </p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 -mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {TAX_DATA[taxYear].label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Percent size={12} className="text-[#0077BB]" />
                {(results.rate * 100).toFixed(2)}% per month
                {maintenancePlan ? " (maintenance plan)" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Fuel size={12} className="text-[#0077BB]" />
                Deemed fuel: R{results.fuelRate.toFixed(2)}/km
              </span>
            </div>

            {/* PAYE on your payslip */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                What Hits Your Payslip Each Month
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">
                    Monthly cash equivalent
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    R {fmt(results.monthlyCashEquivalent)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">
                    Included in remuneration
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    {(results.payeInclusion * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="bg-[#0077BB]/10 rounded-xl p-4">
                  <p className="text-xs text-[#0168A2] mb-1">
                    Added to your PAYE base
                  </p>
                  <p className="text-lg font-bold text-[#0077BB]">
                    R {fmt(results.monthlyPayeBenefit)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                {results.businessPct >= BUSINESS_USE_THRESHOLD
                  ? "Because at least 80% of your use is for business, your employer may include only 20% of the benefit in your remuneration for PAYE."
                  : "Your employer includes 80% of the benefit in your remuneration for PAYE. This drops to 20% only where the employer is satisfied at least 80% of your use will be for business."}
              </p>
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Where the Benefit Goes
                </h3>
                <div className="h-64">
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
                      Enter your car&apos;s determined value to see the split.
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 text-center mt-2">
                  {results.cashEquivalent > 0
                    ? "Only the orange slice is taxed — the rest is reduced away on assessment."
                    : "Your reductions cover the whole benefit — nothing is left to tax."}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <Row
                    label="Determined value"
                    value={`R ${fmt(determinedValue)}`}
                  />
                  {yearsHeldBefore > 0 && (
                    <>
                      <Row
                        label={`Less: depreciation (15% × ${yearsHeldBefore})`}
                        value={`− R ${fmt(results.depreciation)}`}
                      />
                      <Row
                        label="Adjusted determined value"
                        value={`R ${fmt(results.adjustedValue)}`}
                        accent
                      />
                    </>
                  )}
                  <Row
                    label={`Monthly value @ ${(results.rate * 100).toFixed(2)}%`}
                    value={`R ${fmt(results.monthlyValue)}`}
                  />
                  <Row
                    label={`Annual value (× ${months} month${
                      months === 1 ? "" : "s"
                    })`}
                    value={`R ${fmt(results.annualValue)}`}
                    accent
                  />
                  <div className="h-px bg-slate-100" />
                  <Row
                    label={`Less: business use (${fmt(results.bizKm)} / ${fmt(
                      totalKm
                    )} km)`}
                    value={`− R ${fmt(results.businessReduction)}`}
                  />
                  <Row
                    label="Less: licence you paid"
                    value={
                      results.licenceReduction > 0
                        ? `− R ${fmt(results.licenceReduction)}`
                        : "—"
                    }
                  />
                  <Row
                    label="Less: insurance you paid"
                    value={
                      results.insuranceReduction > 0
                        ? `− R ${fmt(results.insuranceReduction)}`
                        : "—"
                    }
                  />
                  <Row
                    label="Less: maintenance you paid"
                    value={
                      maintenancePlan
                        ? "n/a — plan"
                        : results.maintenanceReduction > 0
                        ? `− R ${fmt(results.maintenanceReduction)}`
                        : "—"
                    }
                  />
                  <Row
                    label={`Less: private fuel (${fmt(
                      results.privateKm
                    )} km × R${results.fuelRate.toFixed(2)})`}
                    value={
                      results.fuelReduction > 0
                        ? `− R ${fmt(results.fuelReduction)}`
                        : "—"
                    }
                  />
                  <Row
                    label="Less: paid to your employer"
                    value={
                      results.consideration > 0
                        ? `− R ${fmt(results.consideration)}`
                        : "—"
                    }
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-[#0077BB]">
                      <span>Taxable Fringe Benefit</span>
                      <span>R {fmt(results.cashEquivalent)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-[#b45f16] pt-1">
                    <span>Extra tax at your marginal rate</span>
                    <span>R {fmt(results.taxOnBenefit)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-2">
                    <Banknote size={11} />
                    Reductions for licence, insurance and maintenance are
                    apportioned by your private-use share (
                    {(results.privateRatio * 100).toFixed(0)}%).
                  </div>
                  {results.fullyReduced && (
                    <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 leading-relaxed">
                      Your reductions add up to more than the value of private
                      use, so the benefit is reduced to nil. The excess is not a
                      deduction against your other income.
                    </p>
                  )}
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
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
