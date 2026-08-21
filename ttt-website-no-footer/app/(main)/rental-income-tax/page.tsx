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
  Home,
  Wallet,
  Info,
  ChevronDown,
  RefreshCcw,
  Calendar,
  Percent,
  Receipt,
  Landmark,
} from "lucide-react";

// ─── Tax Data ────────────────────────────────────────────────────────────────
// SARS income tax tables per year of assessment (1 March – 28/29 February).
// Net rental profit is added to taxable income and taxed at the marginal rate,
// so this calculator uses the same brackets/rebates as the PAYE calculator.

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

export default function RentalIncomeTaxPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [otherIncome, setOtherIncome] = useState(450000);
  const [age, setAge] = useState(40);

  // Rental income + allowable expenses (entered in the same period as toggle).
  const [rent, setRent] = useState(12000);
  const [ratesTaxes, setRatesTaxes] = useState(1200);
  const [levies, setLevies] = useState(1500);
  const [bondInterest, setBondInterest] = useState(6000);
  const [insurance, setInsurance] = useState(400);
  const [commission, setCommission] = useState(1200);
  const [repairs, setRepairs] = useState(800);
  const [otherExpenses, setOtherExpenses] = useState(0);

  const results = useMemo(() => {
    const mult = period === "monthly" ? 12 : 1;

    const annualRent = rent * mult;
    const expenseParts = [
      { label: "Rates & taxes", value: ratesTaxes * mult },
      { label: "Levies", value: levies * mult },
      { label: "Bond interest", value: bondInterest * mult },
      { label: "Insurance", value: insurance * mult },
      { label: "Agent commission", value: commission * mult },
      { label: "Repairs & maintenance", value: repairs * mult },
      { label: "Other allowable", value: otherExpenses * mult },
    ];
    const totalExpenses = expenseParts.reduce((s, e) => s + e.value, 0);
    const netProfit = annualRent - totalExpenses; // may be negative (a loss)

    const taxWithout = taxAfterRebate(otherIncome, age, taxYear);
    const taxWith = taxAfterRebate(otherIncome + netProfit, age, taxYear);
    const rentalTax = taxWith - taxWithout; // negative if the loss reduces tax
    const netAfterTax = netProfit - rentalTax;
    const effectiveRate = netProfit !== 0 ? (rentalTax / netProfit) * 100 : 0;

    return {
      annualRent,
      expenseParts,
      totalExpenses,
      netProfit,
      rentalTax,
      netAfterTax,
      effectiveRate,
    };
  }, [
    period,
    rent,
    ratesTaxes,
    levies,
    bondInterest,
    insurance,
    commission,
    repairs,
    otherExpenses,
    otherIncome,
    age,
    taxYear,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const isLoss = results.netProfit < 0;

  const chartData = [
    {
      name: "Kept After Tax",
      value: Math.max(0, results.netAfterTax),
      color: "#10b981",
    },
    { name: "Tax", value: Math.max(0, results.rentalTax), color: "#0077BB" },
  ].filter((d) => d.value > 0);

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Income Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Rental Income Tax Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Letting out a property? Work out the tax on your net rental profit
              after allowable expenses — added to your income and taxed at your
              marginal SARS rate.
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

              {/* Period Toggle */}
              <InputGroup
                label="Amounts Are"
                icon={RefreshCcw}
                helpText="Enter rent and expenses either per month or per year — we annualise them for you."
              >
                <div className="bg-slate-100 p-1 rounded-xl flex">
                  {(["monthly", "yearly"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`flex-1 py-3 sm:py-2 text-sm font-semibold rounded-lg transition-all capitalize ${
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

              {/* Other taxable income */}
              <InputGroup
                label="Your Other Taxable Income (annual)"
                icon={Wallet}
                helpText="Your salary and other taxable income for the year, before the rental. This sets the marginal rate the rental profit is taxed at."
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

              <div className="h-px bg-slate-100 my-6" />

              {/* Rental income */}
              <InputGroup
                label="Rental Income"
                icon={Home}
                helpText="Gross rent received from the tenant, per the period selected above."
              >
                <RandInput value={rent} onChange={setRent} />
              </InputGroup>

              {/* Expenses */}
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Receipt size={12} /> Allowable Expenses
              </p>

              <InputGroup label="Rates & Taxes" icon={Landmark}>
                <RandInput value={ratesTaxes} onChange={setRatesTaxes} />
              </InputGroup>
              <InputGroup label="Levies" icon={Landmark}>
                <RandInput value={levies} onChange={setLevies} />
              </InputGroup>
              <InputGroup
                label="Bond Interest"
                icon={Percent}
                helpText="Only the interest portion of your bond repayment is deductible — not the capital."
              >
                <RandInput value={bondInterest} onChange={setBondInterest} />
              </InputGroup>
              <InputGroup label="Insurance" icon={Receipt}>
                <RandInput value={insurance} onChange={setInsurance} />
              </InputGroup>
              <InputGroup label="Agent Commission" icon={Receipt}>
                <RandInput value={commission} onChange={setCommission} />
              </InputGroup>
              <InputGroup
                label="Repairs & Maintenance"
                icon={Receipt}
                helpText="Repairs that restore the property are deductible. Improvements (extending / upgrading) are capital and not deductible here."
              >
                <RandInput value={repairs} onChange={setRepairs} />
              </InputGroup>
              <InputGroup
                label="Other Allowable Expenses"
                icon={Receipt}
                helpText="Municipal services, garden / security services, and other costs incurred in producing the rental income."
              >
                <RandInput value={otherExpenses} onChange={setOtherExpenses} />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This calculator provides estimates only and does not constitute
                tax advice. Only expenses incurred in producing the rental income
                are deductible; capital improvements are not. Where only part of a
                property is let, expenses must be apportioned. A net rental loss
                may be ring-fenced by SARS in some cases. Consult a registered tax
                professional for your situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div
              className={`rounded-2xl shadow-xl text-white p-5 sm:p-8 ${
                isLoss
                  ? "bg-gradient-to-br from-[#0077BB] to-[#01527e]"
                  : "bg-gradient-to-br from-emerald-600 to-emerald-800"
              }`}
            >
              <div className="flex justify-between items-start gap-3 mb-6">
                <div>
                  <p
                    className={`font-medium mb-1 text-sm ${
                      isLoss ? "text-blue-100" : "text-emerald-100"
                    }`}
                  >
                    {isLoss
                      ? "Net Rental Loss"
                      : "Rental Profit After Tax"}
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    R {fmt(Math.abs(isLoss ? results.netProfit : results.netAfterTax))}
                  </div>
                  <p
                    className={`text-sm mt-2 ${
                      isLoss ? "text-blue-100" : "text-emerald-100"
                    }`}
                  >
                    {isLoss
                      ? `This loss reduces your tax by about R ${fmt(
                          Math.abs(results.rentalTax)
                        )}.`
                      : `After R ${fmt(results.rentalTax)} tax on your net profit.`}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl flex-shrink-0">
                  <Home className="w-8 h-8 text-white" />
                </div>
              </div>

              <div
                className={`grid grid-cols-2 gap-3 sm:gap-4 border-t pt-6 ${
                  isLoss ? "border-white/20" : "border-white/20"
                }`}
              >
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      isLoss ? "text-blue-100" : "text-emerald-100"
                    }`}
                  >
                    {isLoss ? "Tax Saving" : "Tax on Rental"}
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(Math.abs(results.rentalTax))}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      isLoss ? "text-blue-100" : "text-emerald-100"
                    }`}
                  >
                    Net Profit / (Loss)
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(results.netProfit)}
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
                  Profit vs Tax
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
                      No taxable rental profit for this year.
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
                    label="Rental Income (annual)"
                    value={`R ${fmt(results.annualRent)}`}
                  />
                  <div className="h-px bg-slate-100" />
                  {results.expenseParts
                    .filter((e) => e.value > 0)
                    .map((e) => (
                      <Row
                        key={e.label}
                        label={e.label}
                        value={`− R ${fmt(e.value)}`}
                      />
                    ))}
                  <Row
                    label="Total Expenses"
                    value={`− R ${fmt(results.totalExpenses)}`}
                    accent
                  />
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-800 text-sm">
                      <span>Net Rental {isLoss ? "Loss" : "Profit"}</span>
                      <span>R {fmt(results.netProfit)}</span>
                    </div>
                  </div>
                  <Row
                    label={isLoss ? "Tax Saving" : "Tax at Marginal Rate"}
                    value={`${isLoss ? "+" : "−"} R ${fmt(
                      Math.abs(results.rentalTax)
                    )}`}
                    accent
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div
                      className={`flex justify-between font-bold ${
                        isLoss ? "text-[#0077BB]" : "text-emerald-600"
                      }`}
                    >
                      <span>{isLoss ? "Net Loss" : "Profit After Tax"}</span>
                      <span>
                        R {fmt(isLoss ? results.netProfit : results.netAfterTax)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    Effective tax on the rental: {results.effectiveRate.toFixed(1)}%
                    (your marginal rate).
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
      className={`flex justify-between gap-3 text-sm ${
        accent ? "text-[#0077BB] font-medium" : "text-slate-600"
      }`}
    >
      <span className="min-w-0">{label}</span>
      <span className="text-right whitespace-nowrap">{value}</span>
    </div>
  );
}
