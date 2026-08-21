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
  Briefcase,
  Info,
  ChevronDown,
  Calendar,
  Percent,
  Wallet,
  Users,
  Building2,
  Factory,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  Coins,
  Scale,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// Small Business Corporation (section 12E) graduated tables, verified against
// the SARS "Companies, Trusts and Small Business Corporations (SBC)" rates page.
// The 0% band tracks the individual tax threshold, so it moved for 2027 while
// the 7% / 21% / 27% rates themselves have not changed.
//
// The standard company rate is 27% for every year modelled here (it dropped
// from 28% for years of assessment ending on or after 31 March 2023).
//
// Turnover tax (the separate section 48 microbusiness regime) is included only
// as a comparison — it replaces income tax, VAT-registration obligations aside.
// Its threshold and table both changed for 2027: qualifying turnover rose from
// R1 million to R2.3 million and the tax-free band from R335 000 to R600 000.

type Band = { limit: number; rate: number; base: number };

const COMPANY_RATE = 0.27;
const GROSS_INCOME_LIMIT = 20000000;

const SBC_DATA: Record<
  string,
  {
    label: string;
    period: string;
    bands: Band[];
    turnoverLimit: number;
    turnoverBands: Band[];
  }
> = {
  "2027": {
    label: "2027 (Mar 2026 – Feb 2027)",
    period: "years ending 1 Apr 2026 – 31 Mar 2027",
    bands: [
      { limit: 99000, rate: 0, base: 0 },
      { limit: 365000, rate: 0.07, base: 0 },
      { limit: 550000, rate: 0.21, base: 18620 },
      { limit: Infinity, rate: 0.27, base: 57470 },
    ],
    turnoverLimit: 2300000,
    turnoverBands: [
      { limit: 600000, rate: 0, base: 0 },
      { limit: 950000, rate: 0.01, base: 0 },
      { limit: 1400000, rate: 0.02, base: 3500 },
      { limit: Infinity, rate: 0.03, base: 12500 },
    ],
  },
  "2026": {
    label: "2026 (Mar 2025 – Feb 2026)",
    period: "years ending 1 Apr 2025 – 31 Mar 2026",
    bands: [
      { limit: 95750, rate: 0, base: 0 },
      { limit: 365000, rate: 0.07, base: 0 },
      { limit: 550000, rate: 0.21, base: 18848 },
      { limit: Infinity, rate: 0.27, base: 57698 },
    ],
    turnoverLimit: 1000000,
    turnoverBands: [
      { limit: 335000, rate: 0, base: 0 },
      { limit: 500000, rate: 0.01, base: 0 },
      { limit: 750000, rate: 0.02, base: 1650 },
      { limit: Infinity, rate: 0.03, base: 6650 },
    ],
  },
  "2025": {
    label: "2025 (Mar 2024 – Feb 2025)",
    period: "years ending 1 Apr 2024 – 31 Mar 2025",
    bands: [
      { limit: 95750, rate: 0, base: 0 },
      { limit: 365000, rate: 0.07, base: 0 },
      { limit: 550000, rate: 0.21, base: 18848 },
      { limit: Infinity, rate: 0.27, base: 57698 },
    ],
    turnoverLimit: 1000000,
    turnoverBands: [
      { limit: 335000, rate: 0, base: 0 },
      { limit: 500000, rate: 0.01, base: 0 },
      { limit: 750000, rate: 0.02, base: 1650 },
      { limit: Infinity, rate: 0.03, base: 6650 },
    ],
  },
  "2024": {
    label: "2024 (Mar 2023 – Feb 2024)",
    period: "years ending 1 Apr 2023 – 31 Mar 2024",
    bands: [
      { limit: 95750, rate: 0, base: 0 },
      { limit: 365000, rate: 0.07, base: 0 },
      { limit: 550000, rate: 0.21, base: 18848 },
      { limit: Infinity, rate: 0.27, base: 57698 },
    ],
    turnoverLimit: 1000000,
    turnoverBands: [
      { limit: 335000, rate: 0, base: 0 },
      { limit: 500000, rate: 0.01, base: 0 },
      { limit: 750000, rate: 0.02, base: 1650 },
      { limit: Infinity, rate: 0.03, base: 6650 },
    ],
  },
};

// ─── Calculation Logic ────────────────────────────────────────────────────────

// Generic graduated-table engine: each band's base is the cumulative tax at the
// bottom of that band, and the rate applies to the excess over the band floor.
function taxFromTable(amount: number, bands: Band[]) {
  const value = Math.max(0, amount);
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    const floor = i === 0 ? 0 : bands[i - 1].limit;
    if (value <= band.limit || i === bands.length - 1) {
      return band.base + (value - floor) * band.rate;
    }
  }
  return 0;
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

export default function SmallBusinessIncomeTaxPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");

  // Section 12E(4)(a) qualifying gates that are a straight yes/no.
  const [entityOk, setEntityOk] = useState(true);
  const [naturalPersons, setNaturalPersons] = useState(true);
  const [noOtherShares, setNoOtherShares] = useState(true);
  const [notPsp, setNotPsp] = useState(true);

  // Gross income limitation [section 12E(4)(a)(i)].
  const [grossIncome, setGrossIncome] = useState(3200000);
  const [monthsTraded, setMonthsTraded] = useState(12);

  // Business activity requirement [section 12E(4)(a)(iii)].
  const [investmentIncome, setInvestmentIncome] = useState(60000);
  const [personalServiceIncome, setPersonalServiceIncome] = useState(0);
  const [capitalGains, setCapitalGains] = useState(0);
  const [threeEmployees, setThreeEmployees] = useState(false);

  // The tax base.
  const [taxableIncome, setTaxableIncome] = useState(650000);

  // Section 12E(1) and (1A) accelerated allowances.
  const [manufacturingPlant, setManufacturingPlant] = useState(0);
  const [otherYear1, setOtherYear1] = useState(0);
  const [otherYear2, setOtherYear2] = useState(0);
  const [otherYear3, setOtherYear3] = useState(0);

  const results = useMemo(() => {
    const data = SBC_DATA[taxYear];

    // The R20 million limit is reduced proportionately where the entity traded
    // for less than 12 months — R20m × full months traded ÷ 12 (IN 9, 4.1.3(c)).
    const grossLimit = (GROSS_INCOME_LIMIT * monthsTraded) / 12;
    const grossOk = grossIncome <= grossLimit;

    // Income from a "personal service" is only tainted where the service is
    // performed personally by a holder of shares (or a connected person) AND the
    // entity does not employ three or more full-time unconnected employees in
    // that business. Three employees switches the whole stream off.
    const taintedPersonalService = threeEmployees ? 0 : personalServiceIncome;
    const tainted = investmentIncome + taintedPersonalService;

    // The denominator is total receipts and accruals excluding those of a
    // capital nature, PLUS any capital gain (IN 9, 4.1.4(c)).
    const denominator = grossIncome + capitalGains;
    const taintedPct = denominator > 0 ? (tainted / denominator) * 100 : 0;
    const activityOk = taintedPct <= 20;

    const qualifies =
      entityOk &&
      naturalPersons &&
      noOtherShares &&
      notPsp &&
      grossOk &&
      activityOk;

    // Section 12E(1): 100% of manufacturing plant in the year it is brought into
    // use. Section 12E(1A): everything else at 50 / 30 / 20 over three years.
    const allowanceItems = [
      {
        label: "Manufacturing plant — 100%",
        cost: manufacturingPlant,
        rate: 1,
      },
      { label: "Other assets, year 1 — 50%", cost: otherYear1, rate: 0.5 },
      { label: "Other assets, year 2 — 30%", cost: otherYear2, rate: 0.3 },
      { label: "Other assets, year 3 — 20%", cost: otherYear3, rate: 0.2 },
    ].map((i) => ({ ...i, claim: i.cost * i.rate }));

    const rawAllowance = allowanceItems.reduce((s, i) => s + i.claim, 0);
    // The accelerated allowances are only available to a qualifying SBC.
    const allowance = qualifies ? rawAllowance : 0;

    const netTaxableIncome = Math.max(0, taxableIncome - allowance);

    const sbcTax = taxFromTable(netTaxableIncome, data.bands);
    const companyTax = netTaxableIncome * COMPANY_RATE;
    const taxPayable = qualifies ? sbcTax : companyTax;
    const saving = companyTax - sbcTax;
    const effectiveRate =
      netTaxableIncome > 0 ? (taxPayable / netTaxableIncome) * 100 : 0;

    // Marginal rate — the band the last rand of income falls into.
    const marginalBand =
      data.bands.find((b) => netTaxableIncome <= b.limit) ??
      data.bands[data.bands.length - 1];
    const marginalRate = qualifies ? marginalBand.rate : COMPANY_RATE;

    // Turnover tax comparison. Availability keys off qualifying turnover, which
    // for this comparison we take as gross income.
    const turnoverEligible = grossIncome > 0 && grossIncome <= data.turnoverLimit;
    const turnoverTax = turnoverEligible
      ? taxFromTable(grossIncome, data.turnoverBands)
      : 0;

    // Ordered reasoning trail — built by the same pass that decides the answer,
    // so the explanation can never drift from the logic.
    const trail: { ok: boolean; label: string; detail: string }[] = [
      {
        ok: entityOk,
        label: "Legal entity",
        detail: entityOk
          ? "A private company, close corporation, co-operative or personal liability company."
          : "Only a private company, close corporation, co-operative or personal liability company can be an SBC. A sole proprietor, partnership or trust cannot.",
      },
      {
        ok: naturalPersons,
        label: "Shareholders are natural persons",
        detail: naturalPersons
          ? "Every holder of shares was a natural person throughout the year."
          : "A single day of corporate shareholding disqualifies the company for the whole year.",
      },
      {
        ok: noOtherShares,
        label: "No other shareholdings",
        detail: noOtherShares
          ? "No shareholder held shares or an equity interest in another company."
          : "Holding shares in any other company — even for one day, and even a dormant one — disqualifies the company, unless the other company is on SARS's permitted list.",
      },
      {
        ok: notPsp,
        label: "Not a personal service provider",
        detail: notPsp
          ? "The company is not a personal service provider under the Fourth Schedule."
          : "A personal service provider is expressly excluded by section 12E(4)(a)(iv).",
      },
      {
        ok: grossOk,
        label: "Gross income limit",
        detail: grossOk
          ? `Gross income of R ${Math.round(grossIncome).toLocaleString(
              "en-ZA"
            )} is within the R ${Math.round(grossLimit).toLocaleString(
              "en-ZA"
            )} limit${monthsTraded < 12 ? " for a part year" : ""}.`
          : `Gross income of R ${Math.round(grossIncome).toLocaleString(
              "en-ZA"
            )} exceeds the R ${Math.round(grossLimit).toLocaleString(
              "en-ZA"
            )} limit${
              monthsTraded < 12
                ? ` (R20m × ${monthsTraded}/12 for a part year)`
                : ""
            }.`,
      },
      {
        ok: activityOk,
        label: "20% business activity test",
        detail: activityOk
          ? `Investment and personal-service income is ${taintedPct.toFixed(
              1
            )}% of receipts and accruals plus capital gains — inside the 20% ceiling.`
          : `Investment and personal-service income is ${taintedPct.toFixed(
              1
            )}% of receipts and accruals plus capital gains, above the 20% ceiling.`,
      },
    ];

    return {
      data,
      grossLimit,
      grossOk,
      tainted,
      taintedPersonalService,
      denominator,
      taintedPct,
      activityOk,
      qualifies,
      allowanceItems,
      allowance,
      rawAllowance,
      netTaxableIncome,
      sbcTax,
      companyTax,
      taxPayable,
      saving,
      effectiveRate,
      marginalRate,
      turnoverEligible,
      turnoverTax,
      trail,
    };
  }, [
    taxYear,
    entityOk,
    naturalPersons,
    noOtherShares,
    notPsp,
    grossIncome,
    monthsTraded,
    investmentIncome,
    personalServiceIncome,
    capitalGains,
    threeEmployees,
    taxableIncome,
    manufacturingPlant,
    otherYear1,
    otherYear2,
    otherYear3,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    { name: "SBC rates", value: results.sbcTax, color: "#0077BB" },
    { name: "Company 27%", value: results.companyTax, color: "#E8872E" },
    ...(results.turnoverEligible
      ? [{ name: "Turnover tax", value: results.turnoverTax, color: "#10b981" }]
      : []),
  ];

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Income Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Small Business Income Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Check whether your company qualifies as a Small Business
              Corporation under section 12E, and see what the graduated rates
              save you against the flat 27%.
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
                The Numbers
              </h2>

              {/* Tax Year */}
              <InputGroup
                label="Year Of Assessment"
                icon={Calendar}
                helpText="SBC tables are published by financial year end. Most small companies have a February year end."
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
                <p className="mt-2 text-xs text-slate-500">
                  SARS publishes this table for {results.data.period}.
                </p>
              </InputGroup>

              <InputGroup
                label="Taxable Income"
                icon={Wallet}
                helpText="Net profit after all normal deductions, before the section 12E accelerated allowances below."
              >
                <RandInput value={taxableIncome} onChange={setTaxableIncome} />
              </InputGroup>

              <InputGroup
                label="Gross Income (Turnover)"
                icon={TrendingUp}
                helpText="Total receipts and accruals excluding amounts of a capital nature. Used for the R20 million limit and the 20% activity test."
              >
                <RandInput value={grossIncome} onChange={setGrossIncome} />
              </InputGroup>

              <InputGroup
                label="Full Months Traded This Year"
                icon={Calendar}
                helpText="Where the year of assessment is shorter than 12 months, the R20 million gross income limit is reduced proportionately."
              >
                <Stepper
                  value={monthsTraded}
                  onChange={setMonthsTraded}
                  min={1}
                  max={12}
                  suffix={monthsTraded === 1 ? "month" : "months"}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Gross income limit:{" "}
                  <span className="font-semibold text-slate-700">
                    R {fmt(results.grossLimit)}
                  </span>
                </p>
              </InputGroup>
            </div>

            {/* Qualifying tests */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                Do You Qualify?
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Section 12E has to be re-tested every single year. Fail any one
                test and the company pays the flat 27% for that whole year.
              </p>

              <InputGroup
                label="Structural Tests"
                icon={Building2}
                helpText="All four must hold for the entire year of assessment."
              >
                <div className="space-y-2.5">
                  <Toggle
                    checked={entityOk}
                    onChange={setEntityOk}
                    label="Private company, CC, co-op or personal liability company"
                    hint="Sole proprietors, partnerships and trusts can never be an SBC."
                  />
                  <Toggle
                    checked={naturalPersons}
                    onChange={setNaturalPersons}
                    label="All shareholders were natural persons all year"
                    hint="A holding company or trust holding the shares beneficially disqualifies you."
                  />
                  <Toggle
                    checked={noOtherShares}
                    onChange={setNoOtherShares}
                    label="No shareholder held shares in another company"
                    hint="Even one dormant shell held for one day disqualifies the company, unless it is on SARS's permitted list."
                  />
                  <Toggle
                    checked={notPsp}
                    onChange={setNotPsp}
                    label="Not a personal service provider"
                    hint="A labour-broker-style company under the Fourth Schedule, e.g. more than 80% of income from one client."
                  />
                </div>
              </InputGroup>

              <InputGroup
                label="Investment Income"
                icon={Coins}
                helpText="Dividends, foreign dividends, royalties, rental from immovable property, annuities and interest."
              >
                <RandInput
                  value={investmentIncome}
                  onChange={setInvestmentIncome}
                />
              </InputGroup>

              <InputGroup
                label="Income From Personal Services"
                icon={Users}
                helpText="Accounting, consulting, legal, engineering, health, IT, management and the other listed fields, where the work is performed personally by a shareholder or a connected person."
              >
                <RandInput
                  value={personalServiceIncome}
                  onChange={setPersonalServiceIncome}
                  disabled={threeEmployees}
                />
                {threeEmployees && (
                  <p className="mt-2 text-xs text-emerald-700">
                    Not a &quot;personal service&quot; — you employ three or more
                    full-time unconnected employees in that business.
                  </p>
                )}
              </InputGroup>

              <InputGroup
                label="Three Or More Full-Time Employees?"
                icon={Users}
                helpText="Excluding shareholders and connected persons. If three or more are engaged full time in rendering that service, the income stops being a 'personal service' altogether."
              >
                <Toggle
                  checked={threeEmployees}
                  onChange={setThreeEmployees}
                  label="Yes — three or more, none of them shareholders or connected persons"
                  hint="This is the escape valve professionals miss: hire three unconnected full-timers and the personal-service taint falls away."
                />
              </InputGroup>

              <InputGroup
                label="Capital Gains For The Year"
                icon={TrendingUp}
                helpText="Capital receipts are stripped out of the 20% test's denominator, but the taxable capital gain is added back in."
              >
                <RandInput value={capitalGains} onChange={setCapitalGains} />
                <p className="mt-2 text-xs text-slate-500">
                  Tainted income:{" "}
                  <span
                    className={`font-semibold ${
                      results.activityOk ? "text-slate-700" : "text-[#b45f16]"
                    }`}
                  >
                    {results.taintedPct.toFixed(1)}%
                  </span>{" "}
                  of R {fmt(results.denominator)} — ceiling is 20%.
                </p>
              </InputGroup>
            </div>

            {/* Section 12E allowances */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                Accelerated Write-Offs
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Optional. Section 12E lets an SBC write assets off far faster
                than the ordinary wear-and-tear rates.
              </p>

              <InputGroup
                label="Manufacturing Plant Brought Into Use"
                icon={Factory}
                helpText="Plant or machinery used directly in a process of manufacture, or a process of a similar nature, is written off 100% in the year it is first brought into use."
              >
                <RandInput
                  value={manufacturingPlant}
                  onChange={setManufacturingPlant}
                />
              </InputGroup>

              <InputGroup
                label="Other Assets — Year 1 (50%)"
                icon={Briefcase}
                helpText="Any other asset that would qualify for section 11(e) wear and tear may instead be written off 50 / 30 / 20 over three years. Not apportioned for part years."
              >
                <RandInput value={otherYear1} onChange={setOtherYear1} />
              </InputGroup>

              <InputGroup label="Other Assets — Year 2 (30%)" icon={Briefcase}>
                <RandInput value={otherYear2} onChange={setOtherYear2} />
              </InputGroup>

              <InputGroup label="Other Assets — Year 3 (20%)" icon={Briefcase}>
                <RandInput value={otherYear3} onChange={setOtherYear3} />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimates only — not tax advice. Based on SARS Interpretation Note
                9 (Issue 7) and the SARS rates tables. Assessed losses, the
                section 20 loss-limitation rules, dividends tax on distributions,
                the section 12E(3) cost-of-moving rules, recoupments on disposal
                and SARS&apos;s list of permitted other shareholdings are not
                modelled. The turnover tax comparison is a separate elective
                regime with its own registration rules. Consult a registered tax
                professional for your company.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div
              className={`rounded-2xl shadow-xl text-white p-5 sm:p-8 ${
                results.qualifies
                  ? "bg-gradient-to-br from-[#0077BB] to-[#01527e]"
                  : "bg-gradient-to-br from-[#E8872E] to-[#b45f16]"
              }`}
            >
              <div className="flex justify-between items-start gap-3 mb-6">
                <div>
                  <p className="font-medium mb-1 text-sm text-blue-100">
                    Income Tax Payable
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    R {fmt(results.taxPayable)}
                  </div>
                  <p className="text-sm mt-2 text-blue-100">
                    {results.qualifies
                      ? `At SBC rates on taxable income of R ${fmt(
                          results.netTaxableIncome
                        )}.`
                      : `At the flat company rate of 27% — the company does not qualify as an SBC.`}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl flex-shrink-0">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-sm mb-1 text-blue-100">Effective Rate</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    {results.effectiveRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">Marginal Rate</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    {(results.marginalRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">
                    {results.qualifies ? "SBC Saving" : "SBC Would Save"}
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">R {fmt(results.saving)}</p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 -mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {results.data.label}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs shadow-sm border ${
                  results.qualifies
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-[#E8872E]/10 border-[#E8872E]/30 text-[#b45f16]"
                }`}
              >
                {results.qualifies ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <AlertTriangle size={12} />
                )}
                {results.qualifies ? "Qualifies as an SBC" : "Not an SBC"}
              </span>
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">
                  What The Regimes Cost
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Tax on the same year, three different ways.
                </p>
                <div className="h-48">
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
                </div>
                {!results.turnoverEligible && (
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Turnover tax is not shown — qualifying turnover must be R{" "}
                    {fmt(results.data.turnoverLimit)} or less.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <Row
                    label="Taxable income before allowances"
                    value={`R ${fmt(taxableIncome)}`}
                  />
                  {results.allowanceItems
                    .filter((i) => i.claim > 0)
                    .map((i) => (
                      <Row
                        key={i.label}
                        label={i.label}
                        value={`− R ${fmt(results.qualifies ? i.claim : 0)}`}
                      />
                    ))}
                  <Row
                    label="Taxable income"
                    value={`R ${fmt(results.netTaxableIncome)}`}
                    accent
                  />
                  <div className="h-px bg-slate-100" />
                  <Row
                    label="Tax at SBC rates"
                    value={`R ${fmt(results.sbcTax)}`}
                  />
                  <Row
                    label="Tax at the 27% company rate"
                    value={`R ${fmt(results.companyTax)}`}
                  />
                  {results.turnoverEligible && (
                    <Row
                      label="Tax under turnover tax"
                      value={`R ${fmt(results.turnoverTax)}`}
                    />
                  )}
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div
                      className={`flex justify-between font-bold ${
                        results.qualifies ? "text-[#0077BB]" : "text-[#b45f16]"
                      }`}
                    >
                      <span className="pr-3">Tax Payable</span>
                      <span className="whitespace-nowrap">
                        R {fmt(results.taxPayable)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} className="mt-0.5 flex-shrink-0" />
                    <span>
                      {results.qualifies
                        ? `The graduated rates save R ${fmt(
                            results.saving
                          )} against the flat 27%.`
                        : `Qualifying as an SBC would have saved R ${fmt(
                            results.saving
                          )}.`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Qualification trail */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-1">How We Got There</h3>
              <p className="text-xs text-slate-500 mb-4">
                Every section 12E test, in the order SARS applies them.
              </p>
              <div className="space-y-3">
                {results.trail.map((step) => (
                  <div key={step.label} className="flex gap-3">
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                        step.ok ? "bg-emerald-100" : "bg-[#E8872E]/20"
                      }`}
                    >
                      {step.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-[#b45f16]" />
                      )}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          step.ok ? "text-slate-800" : "text-[#b45f16]"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rate table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Scale size={16} className="text-[#0077BB]" />
                SBC Rates For {results.data.label}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Your band is highlighted.
              </p>
              <div className="space-y-1.5">
                {results.data.bands.map((band, i) => {
                  const floor = i === 0 ? 0 : results.data.bands[i - 1].limit;
                  const active =
                    results.qualifies &&
                    results.netTaxableIncome > floor &&
                    results.netTaxableIncome <= band.limit;
                  return (
                    <div
                      key={i}
                      className={`flex justify-between items-center px-3 py-2.5 rounded-xl text-sm ${
                        active
                          ? "bg-[#0077BB]/10 border border-[#0077BB]/30 font-semibold text-[#0077BB]"
                          : "bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span className="pr-3">
                        {band.limit === Infinity
                          ? `R ${fmt(floor + 1)} and above`
                          : `R ${fmt(floor + 1)} – R ${fmt(band.limit)}`}
                      </span>
                      <span className="whitespace-nowrap flex-shrink-0">
                        {band.rate === 0
                          ? "No tax"
                          : band.base > 0
                          ? `R ${fmt(band.base)} + ${(band.rate * 100).toFixed(
                              0
                            )}%`
                          : `${(band.rate * 100).toFixed(0)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                Four Section 12E Rules That Catch People Out
              </h3>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-800">
                    One dormant shell company costs you the whole year.
                  </p>
                  If any shareholder holds shares or an equity interest in any
                  other company — even a dormant one, even for a single day — the
                  company is not an SBC for that entire year of assessment. This
                  is the single most common disqualifier, and it is usually
                  accidental.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Three employees switch the professional taint off.
                  </p>
                  Consulting, legal, accounting, engineering, IT and health income
                  is only a &quot;personal service&quot; if a shareholder or
                  connected person performs it personally <em>and</em> the company
                  does not employ three or more full-time unconnected people in
                  that business. Employ three, and the 20% cap stops biting.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Interest and rent count against you.
                  </p>
                  The 20% test is not about profit — it is about receipts.
                  Dividends, interest, royalties and rental from immovable
                  property are all &quot;investment income&quot;. A company parking
                  cash in a call account can quietly breach the ceiling in a slow
                  trading year.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Qualifying is re-tested every single year.
                  </p>
                  An SBC in 2026 is not automatically an SBC in 2027. Both the
                  gross income limit and the 20% test are annual, and the R20
                  million limit is pro-rated down if the company traded for less
                  than 12 months.
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
      <span className="pr-3">{label}</span>
      <span className="whitespace-nowrap flex-shrink-0">{value}</span>
    </div>
  );
}
