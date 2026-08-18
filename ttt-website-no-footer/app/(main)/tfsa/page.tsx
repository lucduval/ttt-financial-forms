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
  Clock,
  AlertTriangle,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS Tax-Free Savings Account (TFSA) contribution limits per year of
// assessment. The annual limit rose from R36,000 to R46,000 with effect from
// 1 March 2026 (the 2027 year of assessment). The lifetime limit is R500,000.
// Growth (interest, dividends, capital gains) inside the account is tax-free;
// contributions above the annual or lifetime limit attract a 40% penalty tax.

const TAX_DATA: Record<
  string,
  { label: string; annualLimit: number; lifetimeLimit: number }
> = {
  "2027": {
    label: "2027 (Mar 2026 – Feb 2027)",
    annualLimit: 46000,
    lifetimeLimit: 500000,
  },
  "2026": {
    label: "2026 (Mar 2025 – Feb 2026)",
    annualLimit: 36000,
    lifetimeLimit: 500000,
  },
  "2025": {
    label: "2025 (Mar 2024 – Feb 2025)",
    annualLimit: 36000,
    lifetimeLimit: 500000,
  },
  "2024": {
    label: "2024 (Mar 2023 – Feb 2024)",
    annualLimit: 36000,
    lifetimeLimit: 500000,
  },
};

const MARGINAL_RATES = [0.18, 0.26, 0.31, 0.36, 0.39, 0.41, 0.45];

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TfsaPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [contribution, setContribution] = useState(3000);
  const [growth, setGrowth] = useState(9);
  const [years, setYears] = useState(20);
  const [marginalRate, setMarginalRate] = useState(0.31);

  const { annualLimit, lifetimeLimit } = TAX_DATA[taxYear];

  const results = useMemo(() => {
    const annualContribution =
      period === "monthly" ? contribution * 12 : contribution;
    const g = growth / 100;
    const gNet = g * (1 - marginalRate); // taxable account: growth taxed yearly

    // Grow both accounts identically; only the taxable one loses tax on growth.
    // Contribution is made at the start of each year, then grows for that year.
    let tfsaValue = 0;
    let taxableValue = 0;
    let contributed = 0;
    let lifetimeHitYear = 0;

    for (let y = 1; y <= years; y++) {
      const roomLeft = Math.max(0, lifetimeLimit - contributed);
      const thisContribution = Math.min(annualContribution, roomLeft);
      if (thisContribution < annualContribution && lifetimeHitYear === 0) {
        lifetimeHitYear = y;
      }
      contributed += thisContribution;
      tfsaValue = (tfsaValue + thisContribution) * (1 + g);
      taxableValue = (taxableValue + thisContribution) * (1 + gNet);
    }

    const tfsaGrowth = tfsaValue - contributed;
    const benefit = tfsaValue - taxableValue; // tax saved over the period
    const overAnnual = annualContribution > annualLimit;

    return {
      annualContribution,
      contributed,
      tfsaValue,
      taxableValue,
      tfsaGrowth,
      benefit,
      overAnnual,
      lifetimeHitYear,
    };
  }, [period, contribution, growth, years, marginalRate, annualLimit, lifetimeLimit]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    { name: "Tax-Free (TFSA)", value: results.tfsaValue, color: "#10b981" },
    { name: "Taxable Account", value: results.taxableValue, color: "#0077BB" },
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
                South African Tax-Free Savings
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              TFSA Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              See how much tax you save with a Tax-Free Savings Account. All
              growth inside a TFSA is free of income, dividends and capital gains
              tax — here&apos;s what that&apos;s worth over time.
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
                Your Plan
              </h2>

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="The annual contribution limit rose to R46,000 from the 2027 year of assessment (1 March 2026)."
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

              {/* Period Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl flex mb-8">
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

              {/* Contribution */}
              <InputGroup
                label={`Contribution (${period === "monthly" ? "per month" : "per year"})`}
                icon={Wallet}
                helpText="How much you put into the TFSA each period. The annual total counts against the contribution limit."
              >
                <RandInput value={contribution} onChange={setContribution} />
                <p className="mt-2 text-xs text-slate-400">
                  Annual: R {fmt(results.annualContribution)} · Limit: R{" "}
                  {fmt(annualLimit)}
                </p>
              </InputGroup>

              {/* Growth */}
              <InputGroup
                label="Expected Annual Growth"
                icon={TrendingUp}
                helpText="The average yearly return you expect. This is an assumption — markets vary."
              >
                <div className="space-y-3">
                  <input
                    type="range"
                    min={1}
                    max={15}
                    step={0.5}
                    value={growth}
                    onChange={(e) => setGrowth(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#0077BB]"
                  />
                  <div className="text-center font-bold text-[#0077BB] bg-blue-50 py-1.5 rounded-lg text-sm">
                    {growth}% per year
                  </div>
                </div>
              </InputGroup>

              {/* Years */}
              <InputGroup
                label="Investment Period"
                icon={Clock}
                helpText="How many years you plan to keep contributing and staying invested."
              >
                <div className="space-y-3">
                  <input
                    type="range"
                    min={1}
                    max={40}
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#0077BB]"
                  />
                  <div className="text-center font-bold text-[#0077BB] bg-blue-50 py-1.5 rounded-lg text-sm">
                    {years} {years === 1 ? "year" : "years"}
                  </div>
                </div>
              </InputGroup>

              {/* Marginal rate */}
              <InputGroup
                label="Your Marginal Tax Rate"
                icon={Percent}
                helpText="Used to estimate the tax a comparable non-TFSA (taxable) account would pay on its growth."
              >
                <div className="relative">
                  <select
                    value={marginalRate}
                    onChange={(e) => setMarginalRate(Number(e.target.value))}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    {MARGINAL_RATES.map((r) => (
                      <option key={r} value={r}>
                        {Math.round(r * 100)}%
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </InputGroup>
            </div>

            {/* Over-limit warning */}
            {(results.overAnnual || results.lifetimeHitYear > 0) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-relaxed">
                  {results.overAnnual && (
                    <>
                      Your annual contribution of R{" "}
                      {fmt(results.annualContribution)} exceeds the R{" "}
                      {fmt(annualLimit)} annual limit. The excess is taxed at 40%.{" "}
                    </>
                  )}
                  {results.lifetimeHitYear > 0 && (
                    <>
                      You reach the R {fmt(lifetimeLimit)} lifetime limit in year{" "}
                      {results.lifetimeHitYear}; contributions are capped there.
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This calculator provides estimates only and does not constitute
                financial or tax advice. Returns are assumed and not guaranteed.
                The taxable-account comparison applies your marginal rate to all
                growth as a simplification — real tax depends on the mix of
                interest, dividends and capital gains and the exemptions that
                apply. Consult a registered adviser.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl shadow-xl text-white p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-emerald-100 font-medium mb-1 text-sm">
                    Tax Saved Over {years} {years === 1 ? "Year" : "Years"}
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(results.benefit)}
                  </div>
                  <p className="text-sm text-emerald-100 mt-2">
                    vs the same money in a taxable account.
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl">
                  <PiggyBank className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-emerald-100 text-sm mb-1">
                    TFSA Value
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.tfsaValue)}
                  </p>
                </div>
                <div>
                  <p className="text-emerald-100 text-sm mb-1">
                    Total Contributed
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.contributed)}
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
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  TFSA vs Taxable Account
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        interval={0}
                      />
                      <YAxis
                        tickFormatter={(v: number) =>
                          `R${(v / 1000).toFixed(0)}k`
                        }
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        width={48}
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
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Breakdown
                </h3>
                <div className="space-y-3">
                  <Row
                    label="Total Contributed"
                    value={`R ${fmt(results.contributed)}`}
                  />
                  <Row
                    label="Tax-Free Growth"
                    value={`R ${fmt(results.tfsaGrowth)}`}
                  />
                  <div className="h-px bg-slate-100" />
                  <Row
                    label="TFSA Final Value"
                    value={`R ${fmt(results.tfsaValue)}`}
                    accent
                  />
                  <Row
                    label="Taxable Account Value"
                    value={`R ${fmt(results.taxableValue)}`}
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Tax Saved</span>
                      <span>R {fmt(results.benefit)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    All interest, dividends and capital gains inside a TFSA are
                    tax-free.
                  </div>
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
