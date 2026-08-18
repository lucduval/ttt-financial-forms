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
  Car,
  Info,
  ChevronDown,
  Calendar,
  Route,
  Briefcase,
  Fuel,
  Wrench,
  Percent,
  Gauge,
  Banknote,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS travel-allowance "cost scale" tables (fixed / fuel / maintenance) per
// vehicle-value band, plus the prescribed "simplified" rate per km. These change
// EVERY year and the value bands differ between years (2024–2026 use R100,000
// increments; 2027 uses R115,000 increments), so each year has its own table.
//   fixed = rand per year · fuel/maint = cents per km.
// Verified against SARS eLogbooks / the PAYE Rate-per-Kilometre schedule.

type Band = { limit: number; fixed: number; fuel: number; maint: number };

const TRAVEL_DATA: Record<
  string,
  { label: string; deemedRate: number; bands: Band[] }
> = {
  "2027": {
    label: "2027 (Mar 2026 – Feb 2027)",
    deemedRate: 4.95,
    bands: [
      { limit: 115000, fixed: 38344, fuel: 132.9, maint: 49.1 },
      { limit: 230000, fixed: 68487, fuel: 148.4, maint: 61.4 },
      { limit: 345000, fixed: 98689, fuel: 161.2, maint: 67.8 },
      { limit: 460000, fixed: 125393, fuel: 173.4, maint: 74.0 },
      { limit: 575000, fixed: 152097, fuel: 185.5, maint: 86.9 },
      { limit: 690000, fixed: 180078, fuel: 212.8, maint: 102.0 },
      { limit: 805000, fixed: 208106, fuel: 216.5, maint: 114.5 },
      { limit: 920000, fixed: 237679, fuel: 220.1, maint: 126.1 },
      { limit: Infinity, fixed: 237679, fuel: 220.1, maint: 126.9 },
    ],
  },
  "2026": {
    label: "2026 (Mar 2025 – Feb 2026)",
    deemedRate: 4.76,
    bands: [
      { limit: 100000, fixed: 33940, fuel: 146.7, maint: 47.4 },
      { limit: 200000, fixed: 60688, fuel: 163.8, maint: 59.3 },
      { limit: 300000, fixed: 87497, fuel: 177.9, maint: 65.4 },
      { limit: 400000, fixed: 111273, fuel: 191.4, maint: 71.4 },
      { limit: 500000, fixed: 135048, fuel: 204.8, maint: 83.9 },
      { limit: 600000, fixed: 159934, fuel: 234.9, maint: 98.5 },
      { limit: 700000, fixed: 184867, fuel: 238.9, maint: 110.5 },
      { limit: Infinity, fixed: 211121, fuel: 242.9, maint: 122.5 },
    ],
  },
  "2025": {
    label: "2025 (Mar 2024 – Feb 2025)",
    deemedRate: 4.64,
    bands: [
      { limit: 100000, fixed: 34480, fuel: 151.7, maint: 46.0 },
      { limit: 200000, fixed: 61770, fuel: 169.4, maint: 57.6 },
      { limit: 300000, fixed: 89119, fuel: 184.0, maint: 63.5 },
      { limit: 400000, fixed: 113436, fuel: 197.9, maint: 69.3 },
      { limit: 500000, fixed: 137752, fuel: 211.8, maint: 81.5 },
      { limit: 600000, fixed: 163178, fuel: 243.0, maint: 95.6 },
      { limit: 700000, fixed: 188653, fuel: 247.1, maint: 107.3 },
      { limit: Infinity, fixed: 215447, fuel: 251.2, maint: 118.9 },
    ],
  },
  "2024": {
    label: "2024 (Mar 2023 – Feb 2024)",
    deemedRate: 4.64,
    bands: [
      { limit: 100000, fixed: 33760, fuel: 141.5, maint: 43.8 },
      { limit: 200000, fixed: 60329, fuel: 158.0, maint: 54.8 },
      { limit: 300000, fixed: 86958, fuel: 171.7, maint: 60.4 },
      { limit: 400000, fixed: 110554, fuel: 184.6, maint: 65.9 },
      { limit: 500000, fixed: 134150, fuel: 197.6, maint: 77.5 },
      { limit: 600000, fixed: 158856, fuel: 226.6, maint: 91.0 },
      { limit: 700000, fixed: 183611, fuel: 230.5, maint: 102.1 },
      { limit: Infinity, fixed: 209685, fuel: 234.3, maint: 113.1 },
    ],
  },
};

const MARGINAL_RATES = [
  { rate: 0.18, label: "18%" },
  { rate: 0.26, label: "26%" },
  { rate: 0.31, label: "31%" },
  { rate: 0.36, label: "36%" },
  { rate: 0.39, label: "39%" },
  { rate: 0.41, label: "41%" },
  { rate: 0.45, label: "45%" },
];

// ─── Calculation Logic ────────────────────────────────────────────────────────

function bandFor(value: number, taxYear: string) {
  const { bands } = TRAVEL_DATA[taxYear];
  return bands.find((b) => value <= b.limit) ?? bands[bands.length - 1];
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
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
          {suffix}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TravelDeductionPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [vehicleValue, setVehicleValue] = useState(400000);
  const [totalKm, setTotalKm] = useState(25000);
  const [businessKm, setBusinessKm] = useState(12000);
  const [paysFuel, setPaysFuel] = useState(true);
  const [paysMaintenance, setPaysMaintenance] = useState(true);
  const [actualCosts, setActualCosts] = useState(0);
  const [marginalRate, setMarginalRate] = useState(0.31);

  const results = useMemo(() => {
    const band = bandFor(vehicleValue, taxYear);
    const bizKm = Math.min(businessKm, totalKm || businessKm);
    const businessPct = totalKm > 0 ? (bizKm / totalKm) * 100 : 0;

    // ── Cost-scale (deemed) method ──
    const fixedPerKm = totalKm > 0 ? band.fixed / totalKm : 0;
    const fuelPerKm = paysFuel ? band.fuel / 100 : 0;
    const maintPerKm = paysMaintenance ? band.maint / 100 : 0;
    const costPerKm = fixedPerKm + fuelPerKm + maintPerKm;
    const deemedDeduction = costPerKm * bizKm;

    // ── Actual-cost method ──
    const actualDeduction =
      totalKm > 0 ? actualCosts * (bizKm / totalKm) : 0;

    const bestMethod =
      actualDeduction > deemedDeduction ? "actual" : "deemed";
    const bestDeduction = Math.max(deemedDeduction, actualDeduction);
    const taxSaving = bestDeduction * marginalRate;

    return {
      band,
      businessPct,
      fixedPerKm,
      fuelPerKm,
      maintPerKm,
      costPerKm,
      deemedDeduction,
      actualDeduction,
      bestMethod,
      bestDeduction,
      taxSaving,
      overBusiness: businessKm > totalKm && totalKm > 0,
    };
  }, [
    vehicleValue,
    totalKm,
    businessKm,
    paysFuel,
    paysMaintenance,
    actualCosts,
    marginalRate,
    taxYear,
  ]);

  const fmt = (n: number) =>
    n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = [
    { name: "Cost Tables", value: Math.round(results.deemedDeduction), color: "#0077BB" },
    { name: "Actual Costs", value: Math.round(results.actualDeduction), color: "#E8872E" },
  ];

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
                South African Travel Allowance
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Travel Deduction Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Get a travel allowance? Keep a logbook and compare the SARS cost
              tables against your actual costs to work out the biggest travel
              deduction you can claim.
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
                Your Vehicle &amp; Travel
              </h2>

              {/* Tax Year */}
              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="The year of assessment (1 March – 28/29 February). SARS updates the cost tables every year."
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

              {/* Vehicle value */}
              <InputGroup
                label="Value of the Vehicle"
                icon={Car}
                helpText="The purchase price of the vehicle including VAT (or its cash value). This selects the SARS cost-table band."
              >
                <RandInput value={vehicleValue} onChange={setVehicleValue} />
              </InputGroup>

              {/* Total km */}
              <InputGroup
                label="Total km Travelled"
                icon={Route}
                helpText="Total kilometres travelled in the vehicle during the year, per your logbook."
              >
                <RandInput
                  value={totalKm}
                  onChange={setTotalKm}
                  suffix="km"
                />
              </InputGroup>

              {/* Business km */}
              <InputGroup
                label="Business km Travelled"
                icon={Briefcase}
                helpText="Kilometres travelled for business (not private / home-to-office), substantiated by your logbook. Only business km are deductible."
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

              {/* Who pays fuel / maintenance */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaysFuel(!paysFuel)}
                  className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    paysFuel
                      ? "bg-[#0077BB]/10 border-[#0077BB]/40 text-[#0077BB]"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <Fuel className="w-4 h-4" /> I pay fuel
                </button>
                <button
                  type="button"
                  onClick={() => setPaysMaintenance(!paysMaintenance)}
                  className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    paysMaintenance
                      ? "bg-[#0077BB]/10 border-[#0077BB]/40 text-[#0077BB]"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <Wrench className="w-4 h-4" /> I pay upkeep
                </button>
              </div>

              {/* Actual costs */}
              <InputGroup
                label="Actual Vehicle Costs (optional)"
                icon={Banknote}
                helpText="Your real total running costs for the year — fuel, repairs, services, insurance, licence and wear-and-tear (or finance/lease). Enter this to compare the actual-cost method against the SARS tables. Leave 0 to use the tables only."
              >
                <RandInput value={actualCosts} onChange={setActualCosts} />
              </InputGroup>

              {/* Marginal rate */}
              <InputGroup
                label="Your Marginal Tax Rate"
                icon={Percent}
                helpText="The top income tax rate that applies to your income. A travel deduction reduces your taxable income, so your tax saving is the deduction times this rate."
              >
                <div className="relative">
                  <select
                    value={marginalRate}
                    onChange={(e) => setMarginalRate(Number(e.target.value))}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    {MARGINAL_RATES.map((m) => (
                      <option key={m.rate} value={m.rate}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimate only. A SARS-compliant logbook is compulsory to claim any
                travel deduction. Fuel and maintenance rates apply only if you
                bear those costs in full. The deduction is claimed against a
                travel allowance and offsets it — it is not a cash refund.
                Consult a registered tax professional for your situation.
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
                    Best Travel Deduction
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(results.bestDeduction)}
                  </div>
                  <p className="text-sm text-blue-200 mt-2">
                    Using the{" "}
                    {results.bestMethod === "deemed"
                      ? "SARS cost tables"
                      : "actual-cost method"}
                    {" "}— about R {fmt(results.taxSaving)} off your tax.
                  </p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <Car className="w-8 h-8 text-blue-200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                <div>
                  <p className="text-blue-200 text-sm mb-1">Business Portion</p>
                  <p className="text-xl font-semibold">
                    {results.businessPct.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm mb-1">
                    Estimated Tax Saving
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.taxSaving)}
                  </p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 -mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {TRAVEL_DATA[taxYear].label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Gauge size={12} className="text-[#0077BB]" />
                SARS rate: R{TRAVEL_DATA[taxYear].deemedRate.toFixed(2)}/km
                (reimbursive)
              </span>
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Compare the Methods
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#64748b" }}
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
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-400 text-center mt-2">
                  {results.actualDeduction === 0
                    ? "Add your actual costs to compare."
                    : results.bestMethod === "deemed"
                    ? "The SARS cost tables give the bigger deduction."
                    : "Your actual costs give the bigger deduction."}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Cost-Table Breakdown
                </h3>
                <div className="space-y-3">
                  <Row
                    label="Fixed cost / km"
                    value={`R ${results.fixedPerKm.toFixed(2)}`}
                  />
                  <Row
                    label="Fuel cost / km"
                    value={
                      paysFuel
                        ? `R ${results.fuelPerKm.toFixed(2)}`
                        : "excluded"
                    }
                  />
                  <Row
                    label="Maintenance / km"
                    value={
                      paysMaintenance
                        ? `R ${results.maintPerKm.toFixed(2)}`
                        : "excluded"
                    }
                  />
                  <div className="h-px bg-slate-100" />
                  <Row
                    label="Total cost per km"
                    value={`R ${results.costPerKm.toFixed(2)}`}
                    accent
                  />
                  <Row
                    label="× Business km"
                    value={`${fmt(Math.min(businessKm, totalKm || businessKm))} km`}
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-[#0077BB]">
                      <span>Cost-Table Deduction</span>
                      <span>R {fmt(results.deemedDeduction)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    Fixed cost is spread over your total km, then only business km
                    are claimed.
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
