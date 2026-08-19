"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Users,
  Info,
  ChevronDown,
  Calendar,
  Wallet,
  User,
  Building2,
  Briefcase,
  CheckCircle2,
  XCircle,
  Landmark,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// Only the rebates are needed here: the "tax threshold" is simply the total
// rebate divided by the lowest bracket rate of 18%, so it is derived rather
// than hard-coded and can never drift out of step with the rebates.
// Verified against the SARS "Guide for Provisional Tax" (GEN-PT-01-G01,
// Revision 28, effective 29 June 2026) and the SARS rates of tax page.

const LOWEST_RATE = 0.18;

const TAX_DATA: Record<
  string,
  {
    label: string;
    rebates: { primary: number; secondary: number; tertiary: number };
    firstDue: string;
    secondDue: string;
  }
> = {
  "2027": {
    label: "2027 (Mar 2026 – Feb 2027)",
    rebates: { primary: 17820, secondary: 9765, tertiary: 3249 },
    firstDue: "31 August 2026",
    secondDue: "28 February 2027",
  },
  "2026": {
    label: "2026 (Mar 2025 – Feb 2026)",
    rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
    firstDue: "31 August 2025",
    secondDue: "28 February 2026",
  },
  "2025": {
    label: "2025 (Mar 2024 – Feb 2025)",
    rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
    firstDue: "31 August 2024",
    secondDue: "28 February 2025",
  },
  "2024": {
    label: "2024 (Mar 2023 – Feb 2024)",
    rebates: { primary: 16425, secondary: 9000, tertiary: 2997 },
    firstDue: "31 August 2023",
    secondDue: "29 February 2024",
  },
};

// Paragraph 1 of the Fourth Schedule: the de minimis for a natural person who
// carries on no business. Unchanged across the years modelled here.
const PASSIVE_DE_MINIMIS = 30000;

function taxThreshold(age: number, taxYear: string) {
  const { rebates } = TAX_DATA[taxYear];
  let rebate = rebates.primary;
  if (age >= 65) rebate += rebates.secondary;
  if (age >= 75) rebate += rebates.tertiary;
  return rebate / LOWEST_RATE;
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

export default function ProvisionalTaxpayerCheckPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [age, setAge] = useState(40);

  const [isCompany, setIsCompany] = useState(false);
  const [isExcludedEntity, setIsExcludedEntity] = useState(false);
  const [notifiedByCommissioner, setNotifiedByCommissioner] = useState(false);
  const [isLabourBroker, setIsLabourBroker] = useState(false);
  const [carriesOnBusiness, setCarriesOnBusiness] = useState(true);

  const [taxableIncome, setTaxableIncome] = useState(450000);
  const [passiveIncome, setPassiveIncome] = useState(0);

  const results = useMemo(() => {
    const threshold = taxThreshold(age, taxYear);

    // Order matters: entity-level exclusions beat everything else, then the
    // paragraph 1 inclusions, then the natural-person carve-outs.
    const steps: {
      label: string;
      detail: string;
      state: "yes" | "no";
    }[] = [];

    if (isExcludedEntity) {
      steps.push({
        label: "Specifically excluded entity",
        detail:
          "Deceased estates, approved PBOs and recreational clubs, body corporates and share block companies, section 10(1)(e) associations, small business funding entities and non-resident ship or aircraft owners taxed under section 33.",
        state: "yes",
      });
      return {
        verdict: "not-provisional" as const,
        reason:
          "Specifically excluded from provisional tax by paragraph 1 of the Fourth Schedule.",
        steps,
        threshold,
      };
    }
    steps.push({
      label: "Specifically excluded entity",
      detail: "Not a deceased estate, PBO, body corporate or similar.",
      state: "no",
    });

    if (isCompany) {
      steps.push({
        label: "A company or close corporation",
        detail: "Companies are provisional taxpayers without further tests.",
        state: "yes",
      });
      return {
        verdict: "provisional" as const,
        reason: "Every company is a provisional taxpayer.",
        steps,
        threshold,
      };
    }
    steps.push({
      label: "A company or close corporation",
      detail: "You are a natural person, so the individual tests below apply.",
      state: "no",
    });

    if (notifiedByCommissioner) {
      steps.push({
        label: "Notified by the Commissioner",
        detail: "SARS has told you that you are a provisional taxpayer.",
        state: "yes",
      });
      return {
        verdict: "provisional" as const,
        reason:
          "SARS has notified you that you are a provisional taxpayer, which settles it regardless of the other tests.",
        steps,
        threshold,
      };
    }
    steps.push({
      label: "Notified by the Commissioner",
      detail: "SARS has not designated you a provisional taxpayer.",
      state: "no",
    });

    if (isLabourBroker) {
      steps.push({
        label: "Labour broker with an exemption certificate",
        detail: "Paragraph 2(5)(a) exemption certificate held.",
        state: "yes",
      });
      return {
        verdict: "provisional" as const,
        reason:
          "A labour broker holding an exemption certificate under paragraph 2(5)(a) is a provisional taxpayer.",
        steps,
        threshold,
      };
    }
    steps.push({
      label: "Labour broker with an exemption certificate",
      detail: "Not a labour broker with a paragraph 2(5)(a) certificate.",
      state: "no",
    });

    if (carriesOnBusiness) {
      steps.push({
        label: "Carrying on a business",
        detail:
          "Freelancing, consulting, sole-trader trade or any other business income counts. The R30 000 and tax-threshold carve-outs are closed to you.",
        state: "yes",
      });
      return {
        verdict: "provisional" as const,
        reason:
          "You carry on a business, so the de minimis carve-outs cannot apply to you — they are only open to a natural person who derives no business income.",
        steps,
        threshold,
      };
    }
    steps.push({
      label: "Carrying on a business",
      detail:
        "No business income, so the two carve-outs below are available to you.",
      state: "no",
    });

    const underThreshold = taxableIncome <= threshold;
    const underDeMinimis = passiveIncome <= PASSIVE_DE_MINIMIS;

    steps.push({
      label: "Taxable income at or below the tax threshold",
      detail: `Your taxable income of R ${Math.round(
        taxableIncome
      ).toLocaleString("en-ZA")} against the R ${Math.round(
        threshold
      ).toLocaleString("en-ZA")} threshold for your age.`,
      state: underThreshold ? "yes" : "no",
    });

    steps.push({
      label: "Passive income at or below R30 000",
      detail: `Interest, dividends, foreign dividends, rental from letting fixed property and remuneration from an unregistered employer total R ${Math.round(
        passiveIncome
      ).toLocaleString("en-ZA")}.`,
      state: underDeMinimis ? "yes" : "no",
    });

    if (underThreshold || underDeMinimis) {
      return {
        verdict: "not-provisional" as const,
        reason: underThreshold
          ? "You derive no business income and your taxable income does not exceed the tax threshold, so you fall outside the definition."
          : "You derive no business income and your interest, dividends, foreign dividends and rental income do not exceed R30 000, so you fall outside the definition.",
        steps,
        threshold,
      };
    }

    return {
      verdict: "provisional" as const,
      reason:
        "You derive no business income, but your passive income exceeds R30 000 and your taxable income exceeds the tax threshold — so neither carve-out rescues you.",
      steps,
      threshold,
    };
  }, [
    age,
    taxYear,
    isCompany,
    isExcludedEntity,
    notifiedByCommissioner,
    isLabourBroker,
    carriesOnBusiness,
    taxableIncome,
    passiveIncome,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const isProvisional = results.verdict === "provisional";

  const chartData = [
    {
      name: "Your passive income",
      value: passiveIncome,
      color: passiveIncome > PASSIVE_DE_MINIMIS ? "#E8872E" : "#10b981",
    },
    { name: "SARS limit", value: PASSIVE_DE_MINIMIS, color: "#cbd5e1" },
  ];

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Income Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Am I a Provisional Taxpayer?
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              There is no registration form for provisional tax — you either meet
              the definition or you don&apos;t. Answer a few questions and see
              exactly which test decides it for you.
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
                About You
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

              {/* Age */}
              <InputGroup
                label="Your Age"
                icon={User}
                helpText="Age sets your tax threshold, which is one of the two carve-outs."
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

              {/* Situation toggles */}
              <InputGroup
                label="Your Situation"
                icon={Briefcase}
                helpText="Tick everything that applies. The tests are applied in the order SARS applies them."
              >
                <div className="space-y-2.5">
                  <Toggle
                    checked={carriesOnBusiness}
                    onChange={setCarriesOnBusiness}
                    label="I carry on a business"
                    hint="Freelancing, consulting, a side trade or any sole-proprietor income."
                  />
                  <Toggle
                    checked={isCompany}
                    onChange={setIsCompany}
                    label="I'm filing for a company or CC"
                    hint="Every company is a provisional taxpayer."
                  />
                  <Toggle
                    checked={notifiedByCommissioner}
                    onChange={setNotifiedByCommissioner}
                    label="SARS has notified me that I am one"
                    hint="A direct designation by the Commissioner overrides the other tests."
                  />
                  <Toggle
                    checked={isLabourBroker}
                    onChange={setIsLabourBroker}
                    label="I'm a labour broker with an exemption certificate"
                    hint="Issued under paragraph 2(5)(a) of the Fourth Schedule."
                  />
                  <Toggle
                    checked={isExcludedEntity}
                    onChange={setIsExcludedEntity}
                    label="Deceased estate, PBO, body corporate or similar"
                    hint="Also covers recreational clubs, share block companies and small business funding entities."
                  />
                </div>
              </InputGroup>

              {/* Taxable income */}
              <InputGroup
                label="Total Taxable Income"
                icon={Wallet}
                helpText="Your total taxable income for the year from all sources."
              >
                <RandInput value={taxableIncome} onChange={setTaxableIncome} />
              </InputGroup>

              {/* Passive income */}
              <InputGroup
                label="Interest, Dividends & Rental"
                icon={Landmark}
                helpText="Taxable income from interest, dividends, foreign dividends, rental from the letting of fixed property, and remuneration from an employer not registered for employees' tax."
              >
                <RandInput value={passiveIncome} onChange={setPassiveIncome} />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Guidance only — not tax advice. This tool applies the definition
                of &quot;provisional taxpayer&quot; in paragraph 1 of the Fourth
                Schedule to the facts you enter; SARS decides on your actual
                circumstances. Note that directors of private companies and
                members of close corporations are not automatically provisional
                taxpayers unless they have other business income. Consult a
                registered tax professional for your personal situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div
              className={`rounded-2xl shadow-xl text-white p-8 ${
                isProvisional
                  ? "bg-gradient-to-br from-[#0077BB] to-[#01527e]"
                  : "bg-gradient-to-br from-emerald-600 to-emerald-800"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p
                    className={`font-medium mb-1 text-sm ${
                      isProvisional ? "text-blue-100" : "text-emerald-100"
                    }`}
                  >
                    Your Status
                  </p>
                  <div className="text-4xl sm:text-5xl font-bold tracking-tight">
                    {isProvisional ? "Yes — provisional" : "No — not provisional"}
                  </div>
                  <p
                    className={`text-sm mt-3 max-w-lg leading-relaxed ${
                      isProvisional ? "text-blue-100" : "text-emerald-100"
                    }`}
                  >
                    {results.reason}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl">
                  {isProvisional ? (
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  ) : (
                    <XCircle className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>

              {isProvisional && (
                <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6">
                  <div>
                    <p className="text-sm mb-1 text-blue-100">First IRP6 due</p>
                    <p className="text-lg font-semibold">
                      {TAX_DATA[taxYear].firstDue}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm mb-1 text-blue-100">Second IRP6 due</p>
                    <p className="text-lg font-semibold">
                      {TAX_DATA[taxYear].secondDue}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tax year badge */}
            <div className="flex items-center gap-2 -mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {TAX_DATA[taxYear].label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Building2 size={12} className="text-[#0077BB]" />
                Threshold R {fmt(results.threshold)}
              </span>
            </div>

            {/* Chart + Test trail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">
                  The R30 000 Line
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Only open to you if you carry on no business.
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
                      <ReferenceLine
                        y={PASSIVE_DE_MINIMIS}
                        stroke="#E8872E"
                        strokeDasharray="4 4"
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  How We Got There
                </h3>
                <div className="space-y-3">
                  {results.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex-shrink-0 ${
                          step.state === "yes"
                            ? "text-[#0077BB]"
                            : "text-slate-300"
                        }`}
                      >
                        {step.state === "yes" ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <XCircle size={15} />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700 leading-snug">
                          {step.label}
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* What it means */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                {isProvisional
                  ? "What This Means For You"
                  : "Three Things Worth Knowing"}
              </h3>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                {isProvisional ? (
                  <>
                    <div>
                      <p className="font-semibold text-slate-800">
                        You file two IRP6 returns a year.
                      </p>
                      The first by {TAX_DATA[taxYear].firstDue}, the second by{" "}
                      {TAX_DATA[taxYear].secondDue} — plus your normal ITR12 at
                      the end. A return is due even when the payment works out to
                      nil.
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        Provisional tax is not an extra tax.
                      </p>
                      It is the same normal tax, paid in advance. Everything you
                      pay is credited against the assessment, and any excess is
                      refunded.
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        Under-estimating is expensive.
                      </p>
                      A second estimate below both 90% of your actual taxable
                      income and the basic amount attracts a 20% penalty, and
                      late payment carries a further 10%.
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="font-semibold text-slate-800">
                        Status is tested every year.
                      </p>
                      There is no registration or deregistration process. Pick up
                      a freelance client or push your interest income over R30
                      000 and you become one automatically.
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        Business income closes both carve-outs.
                      </p>
                      The R30 000 de minimis and the tax-threshold exclusion are
                      only available to a natural person who derives no income
                      from carrying on a business — any at all.
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        You still file an ITR12.
                      </p>
                      Not being a provisional taxpayer only means no IRP6
                      returns. Your normal annual income tax return is unaffected.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
