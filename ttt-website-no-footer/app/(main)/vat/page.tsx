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
  Percent,
  Info,
  ChevronDown,
  Tag,
  ArrowLeftRight,
  Store,
  ShoppingCart,
  Receipt,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
} from "lucide-react";

// ─── VAT Data ────────────────────────────────────────────────────────────────
// Verified against the SARS Value-Added Tax pages, the SARS Budget 2026 FAQs and
// the VAT 404 Guide for Vendors (Issue 15).
//
//  • The standard rate is 15%, in force since 1 April 2018 (previously 14%).
//    The 2025 Budget's proposed increases to 15.5% (1 May 2025) and 16%
//    (1 April 2026) were both withdrawn — the rate never changed.
//  • The tax fraction used to strip VAT out of a VAT-inclusive amount is
//    rate / (100 + rate), i.e. 15/115 at the standard rate.
//  • Registration thresholds changed on 1 April 2026 for the first time in
//    17 years: compulsory R1m → R2.3m, voluntary R50 000 → R120 000.

// Keys are numeric-like, so an explicit order array is used for the dropdown —
// Object.entries would otherwise sort "14" ahead of "15".
const RATE_ORDER = ["15", "14"];

const RATES: Record<string, { label: string; rate: number; note: string }> = {
  "15": {
    label: "15% — standard rate (from 1 April 2018)",
    rate: 15,
    note: "The standard rate has been 15% since 1 April 2018. The 2025 Budget's proposed increases to 15.5% and 16% were withdrawn.",
  },
  "14": {
    label: "14% — historic rate (before 1 April 2018)",
    rate: 14,
    note: "Use 14% only for supplies made before 1 April 2018, or adjustments that relate back to them.",
  },
};

const THRESHOLDS: Record<
  string,
  { label: string; compulsory: number; voluntary: number }
> = {
  current: {
    label: "From 1 April 2026",
    compulsory: 2300000,
    voluntary: 120000,
  },
  previous: {
    label: "Before 1 April 2026",
    compulsory: 1000000,
    voluntary: 50000,
  },
};

// Category C (monthly returns) is compulsory once turnover exceeds this in any
// consecutive 12-month period — VAT 404 Guide, 3.1.2.
const MONTHLY_CATEGORY_TURNOVER = 30000000;

type Direction = "add" | "remove";
type Basis = "incl" | "excl";

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VatPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [rateKey, setRateKey] = useState("15");
  const [direction, setDirection] = useState<Direction>("add");
  const [amount, setAmount] = useState(10000);

  // Registration test.
  const [era, setEra] = useState("current");
  const [supplies12m, setSupplies12m] = useState(1500000);

  // Optional VAT201 return position.
  const [basis, setBasis] = useState<Basis>("incl");
  const [sales, setSales] = useState(0);
  const [purchases, setPurchases] = useState(0);

  const results = useMemo(() => {
    const rate = RATES[rateKey].rate;
    const fraction = rate / (100 + rate);

    // Add VAT: the amount entered is VAT-exclusive.
    // Remove VAT: the amount entered is VAT-inclusive, so strip the VAT out
    // using the tax fraction rather than taking rate% of the inclusive figure.
    let excl: number;
    let vat: number;
    let incl: number;
    if (direction === "add") {
      excl = amount;
      vat = (amount * rate) / 100;
      incl = excl + vat;
    } else {
      incl = amount;
      vat = incl * fraction;
      excl = incl - vat;
    }

    // 15% of the exclusive price is only 13.04% of the inclusive price — the
    // single most common VAT arithmetic mistake.
    const vatShareOfIncl = incl > 0 ? (vat / incl) * 100 : 0;

    const { compulsory, voluntary } = THRESHOLDS[era];
    let status: "compulsory" | "voluntary" | "none";
    if (supplies12m > compulsory) status = "compulsory";
    else if (supplies12m > voluntary) status = "voluntary";
    else status = "none";
    const toCompulsory = Math.max(0, compulsory - supplies12m);

    // Tax period category. A/B (two-monthly) is the default allocation;
    // Category C (monthly) becomes compulsory above R30m turnover.
    const category =
      supplies12m > MONTHLY_CATEGORY_TURNOVER ? "C" : "A or B";

    // VAT201 position — output tax on supplies made, less input tax on goods
    // and services acquired for the enterprise.
    const outputTax = basis === "incl" ? sales * fraction : (sales * rate) / 100;
    const inputTax =
      basis === "incl" ? purchases * fraction : (purchases * rate) / 100;
    const net = outputTax - inputTax;
    const hasReturn = sales > 0 || purchases > 0;

    return {
      rate,
      fraction,
      excl,
      vat,
      incl,
      vatShareOfIncl,
      compulsory,
      voluntary,
      status,
      toCompulsory,
      category,
      outputTax,
      inputTax,
      net,
      hasReturn,
    };
  }, [rateKey, direction, amount, era, supplies12m, basis, sales, purchases]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });
  const fmt2 = (n: number) =>
    n.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const chartData = [
    { name: "Price excl. VAT", value: results.excl, color: "#0077BB" },
    { name: `VAT at ${results.rate}%`, value: results.vat, color: "#E8872E" },
  ].filter((d) => d.value > 0);

  const statusCopy = {
    compulsory: {
      title: "You must register for VAT",
      body: `Your taxable supplies of R ${fmt(
        supplies12m
      )} exceed the compulsory threshold of R ${fmt(
        results.compulsory
      )}. You must apply within 21 business days of exceeding it.`,
    },
    voluntary: {
      title: "You may register voluntarily",
      body: `You are under the compulsory threshold of R ${fmt(
        results.compulsory
      )} — another R ${fmt(
        results.toCompulsory
      )} of taxable supplies would tip you over — but you are above the R ${fmt(
        results.voluntary
      )} voluntary threshold, so you may choose to register.`,
    },
    none: {
      title: "You cannot register yet",
      body: `Taxable supplies of R ${fmt(
        supplies12m
      )} are below the R ${fmt(
        results.voluntary
      )} voluntary registration threshold, so registration is not available.`,
    },
  }[results.status];

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Percent className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Value-Added Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              VAT Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Add or strip out 15% VAT, check whether you have crossed the new
              R2.3 million registration threshold, and work out your VAT201
              position.
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
                Work Out The VAT
              </h2>

              {/* Direction */}
              <InputGroup
                label="What Do You Want To Do?"
                icon={ArrowLeftRight}
                helpText="Adding VAT starts from a VAT-exclusive price. Removing VAT starts from the price on the invoice, which already includes VAT."
              >
                <div className="bg-slate-100 p-1 rounded-xl flex">
                  {(
                    [
                      ["add", "Add VAT"],
                      ["remove", "Remove VAT"],
                    ] as const
                  ).map(([d, label]) => (
                    <button
                      key={d}
                      onClick={() => setDirection(d)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        direction === d
                          ? "bg-white text-[#0077BB] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {direction === "add"
                    ? "Your amount excludes VAT — we add it on."
                    : "Your amount already includes VAT — we back it out using the 15/115 tax fraction."}
                </p>
              </InputGroup>

              {/* Amount */}
              <InputGroup
                label={
                  direction === "add"
                    ? "Amount Excluding VAT"
                    : "Amount Including VAT"
                }
                icon={Tag}
              >
                <RandInput value={amount} onChange={setAmount} />
              </InputGroup>

              {/* Rate */}
              <InputGroup
                label="VAT Rate"
                icon={Percent}
                helpText="15% since 1 April 2018. Only use 14% for supplies made before that date."
              >
                <div className="relative">
                  <select
                    value={rateKey}
                    onChange={(e) => setRateKey(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    {RATE_ORDER.map((k) => (
                      <option key={k} value={k}>
                        {RATES[k].label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {RATES[rateKey].note}
                </p>
              </InputGroup>
            </div>

            {/* Registration test */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                Do You Have To Register?
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                The test looks at taxable supplies in any consecutive 12-month
                period — not your financial year, and not your profit.
              </p>

              <InputGroup
                label="Taxable Supplies (Any 12 Months)"
                icon={Store}
                helpText="The value of standard-rated and zero-rated supplies made in the course of your enterprise. Exempt supplies and the sale of capital assets do not count."
              >
                <RandInput value={supplies12m} onChange={setSupplies12m} />
              </InputGroup>

              <InputGroup
                label="Which Thresholds Apply?"
                icon={Calendar}
                helpText="The compulsory threshold rose from R1 million to R2.3 million on 1 April 2026, and the voluntary threshold from R50 000 to R120 000."
              >
                <div className="relative">
                  <select
                    value={era}
                    onChange={(e) => setEra(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    {Object.entries(THRESHOLDS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Compulsory above R {fmt(results.compulsory)} · voluntary above
                  R {fmt(results.voluntary)}.
                </p>
              </InputGroup>
            </div>

            {/* VAT201 position */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                Your VAT201 Position
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Optional. Enter a tax period&apos;s figures to see whether you
                owe SARS or SARS owes you.
              </p>

              <InputGroup
                label="Are Your Figures VAT-Inclusive?"
                icon={Receipt}
                helpText="Most accounting systems report turnover including VAT. Choose whichever matches your figures."
              >
                <div className="bg-slate-100 p-1 rounded-xl flex">
                  {(
                    [
                      ["incl", "Including VAT"],
                      ["excl", "Excluding VAT"],
                    ] as const
                  ).map(([b, label]) => (
                    <button
                      key={b}
                      onClick={() => setBasis(b)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        basis === b
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
                label="Standard-Rated Sales For The Period"
                icon={Store}
                helpText="Only supplies you charged VAT on. Zero-rated and exempt supplies carry no output tax."
              >
                <RandInput value={sales} onChange={setSales} />
              </InputGroup>

              <InputGroup
                label="Purchases & Expenses For The Period"
                icon={ShoppingCart}
                helpText="Only VAT charged by other registered vendors, on goods and services acquired for the enterprise, and only where you hold a valid tax invoice."
              >
                <RandInput value={purchases} onChange={setPurchases} />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimates only — not tax advice. Based on the SARS VAT 404 Guide
                for Vendors and the SARS Budget 2026 announcements. Apportionment
                where you make both taxable and exempt supplies, notional input
                tax on second-hand goods, the domestic reverse charge on valuable
                metal, imports and change-in-use adjustments are not modelled.
                Consult a registered tax professional for your business.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div className="rounded-2xl shadow-xl text-white p-8 bg-gradient-to-br from-[#0077BB] to-[#01527e]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="font-medium mb-1 text-sm text-blue-100">
                    VAT at {results.rate}%
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt2(results.vat)}
                  </div>
                  <p className="text-sm mt-2 text-blue-100">
                    {direction === "add"
                      ? `Added to R ${fmt2(results.excl)} excluding VAT.`
                      : `Contained in R ${fmt2(results.incl)} including VAT.`}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl">
                  <Percent className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-sm mb-1 text-blue-100">Excluding VAT</p>
                  <p className="text-xl font-semibold">R {fmt2(results.excl)}</p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">Including VAT</p>
                  <p className="text-xl font-semibold">R {fmt2(results.incl)}</p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">
                    Share Of Shelf Price
                  </p>
                  <p className="text-xl font-semibold">
                    {results.vatShareOfIncl.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 -mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Percent size={12} className="text-[#0077BB]" />
                Tax fraction {results.rate}/{100 + results.rate}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {THRESHOLDS[era].label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <FileText size={12} className="text-[#0077BB]" />
                Category {results.category}
              </span>
            </div>

            {/* Registration verdict */}
            <div
              className={`rounded-2xl border p-5 flex gap-3 ${
                results.status === "compulsory"
                  ? "bg-[#E8872E]/10 border-[#E8872E]/30"
                  : results.status === "voluntary"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              {results.status === "compulsory" ? (
                <AlertTriangle className="w-5 h-5 text-[#E8872E] flex-shrink-0 mt-0.5" />
              ) : results.status === "voluntary" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-bold text-sm mb-1 ${
                    results.status === "compulsory"
                      ? "text-[#b45f16]"
                      : results.status === "voluntary"
                      ? "text-emerald-800"
                      : "text-slate-800"
                  }`}
                >
                  {statusCopy.title}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {statusCopy.body}
                </p>
                {results.status === "compulsory" && (
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    Returns fall in{" "}
                    <span className="font-semibold">
                      Category {results.category}
                    </span>{" "}
                    —{" "}
                    {results.category === "C"
                      ? "monthly returns, because turnover exceeds R30 million in a 12-month period."
                      : "a two-monthly return, the standard allocation on registration."}
                  </p>
                )}
              </div>
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">
                  What The Customer Pays
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  The split of the VAT-inclusive price.
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
                      Enter an amount to see the split.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  {direction === "add" ? (
                    <>
                      <Row
                        label="Amount excluding VAT"
                        value={`R ${fmt2(results.excl)}`}
                      />
                      <Row
                        label={`VAT at ${results.rate}%`}
                        value={`R ${fmt2(results.vat)}`}
                        accent
                      />
                      <div className="pt-2 border-t border-dashed border-slate-200">
                        <div className="flex justify-between font-bold text-[#0077BB]">
                          <span className="pr-3">Amount including VAT</span>
                          <span className="whitespace-nowrap">
                            R {fmt2(results.incl)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Row
                        label="Amount including VAT"
                        value={`R ${fmt2(results.incl)}`}
                      />
                      <Row
                        label={`Less VAT (× ${results.rate}/${
                          100 + results.rate
                        })`}
                        value={`− R ${fmt2(results.vat)}`}
                        accent
                      />
                      <div className="pt-2 border-t border-dashed border-slate-200">
                        <div className="flex justify-between font-bold text-[#0077BB]">
                          <span className="pr-3">Amount excluding VAT</span>
                          <span className="whitespace-nowrap">
                            R {fmt2(results.excl)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex items-start gap-1.5 text-xs text-slate-400 pt-1">
                    <Info size={11} className="mt-0.5 flex-shrink-0" />
                    <span>
                      {results.rate}% of the exclusive price is only{" "}
                      {results.vatShareOfIncl.toFixed(2)}% of the price the
                      customer actually pays.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* VAT201 position */}
            {results.hasReturn && (
              <div
                className={`rounded-2xl border shadow-sm p-6 ${
                  results.net >= 0
                    ? "bg-white border-slate-200"
                    : "bg-emerald-50 border-emerald-200"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800">
                      VAT201 For The Period
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Output tax less input tax.
                    </p>
                  </div>
                  <div
                    className={`text-right ${
                      results.net >= 0 ? "text-[#b45f16]" : "text-emerald-700"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider">
                      {results.net >= 0 ? "Payable to SARS" : "Refund due"}
                    </p>
                    <p className="text-2xl font-bold">
                      R {fmt2(Math.abs(results.net))}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Row
                    label="Output tax on sales"
                    value={`R ${fmt2(results.outputTax)}`}
                  />
                  <Row
                    label="Input tax on purchases"
                    value={`− R ${fmt2(results.inputTax)}`}
                  />
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div
                      className={`flex justify-between font-bold ${
                        results.net >= 0 ? "text-[#0077BB]" : "text-emerald-600"
                      }`}
                    >
                      <span className="pr-3">
                        {results.net >= 0 ? "VAT payable" : "VAT refundable"}
                      </span>
                      <span className="whitespace-nowrap">
                        R {fmt2(Math.abs(results.net))}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-slate-400 pt-1">
                    <Info size={11} className="mt-0.5 flex-shrink-0" />
                    <span>
                      The VAT201 and the payment are both due by the 25th of the
                      month following the end of the tax period — or the last
                      business day of that month if you file and pay on eFiling.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                Four VAT Rules That Catch People Out
              </h3>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-800">
                    Never take 15% off a VAT-inclusive price.
                  </p>
                  Taking 15% off R115 gives R97.75, not R100. To strip VAT out
                  you multiply by the tax fraction 15/115 — which is why VAT is
                  13.04% of the shelf price even though the rate is 15%.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Zero-rated and exempt are not the same thing.
                  </p>
                  Zero-rated supplies — brown bread, maize meal, fresh fruit and
                  vegetables, paraffin, fuel levy goods, exports — are taxable at
                  0%, so you still claim your input tax. Exempt supplies —
                  residential rent, financial services, local passenger
                  transport, school fees — are outside the net entirely, and you
                  may not claim input tax on the costs of making them. A business
                  making only exempt supplies cannot register at all.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    The threshold more than doubled on 1 April 2026.
                  </p>
                  After 17 years at R1 million, compulsory registration now only
                  bites above R2.3 million of taxable supplies in a 12-month
                  period, and the voluntary floor moved from R50 000 to R120 000.
                  If you are already registered and now fall below the new line,
                  you may deregister — but weigh it up: you lose your input tax
                  claims and may face an exit VAT adjustment on assets on hand.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    The test is any 12 months, not your financial year.
                  </p>
                  Liability arises the moment taxable supplies exceed the
                  threshold in <em>any</em> consecutive 12-month period — and
                  also the moment you sign a contract that will take you over it.
                  You have 21 business days to apply, and SARS can hold you
                  liable for VAT you never charged.
                </div>
              </div>
            </div>

            {/* Category reference */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-[#0077BB]" />
                How Often You File
              </h3>
              <div className="space-y-3">
                <Row
                  label="Category A or B — two-monthly"
                  value="Standard allocation"
                />
                <Row
                  label="Category C — monthly"
                  value="Turnover over R 30 000 000"
                />
                <Row
                  label="Category D — six-monthly"
                  value="Farming under R 1 500 000"
                />
                <Row label="Category E — annual" value="On application" />
                <div className="flex items-start gap-1.5 text-xs text-slate-400 pt-1">
                  <Info size={11} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Category A ends in January, March, May, July, September and
                    November; Category B in February, April, June, August,
                    October and December. SARS decides which.
                  </span>
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
