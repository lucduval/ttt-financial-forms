"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  Receipt,
  Gift,
  TrendingUp,
  PiggyBank,
  Coins,
  Car,
  HeartPulse,
  Home,
  Building2,
  Landmark,
  Wallet,
  Percent,
  FileText,
  Bitcoin,
  HandCoins,
  Briefcase,
  Users,
  BarChart3,
  Search,
  ArrowRight,
} from "lucide-react";

// ─── Calculator registry ──────────────────────────────────────────────────────
// Flip `live` + set `href` as each calculator ships (phased rollout).

type Calc = {
  name: string;
  blurb: string;
  href: string;
  icon: React.ElementType;
  live: boolean;
};

const CATEGORIES: { title: string; calcs: Calc[] }[] = [
  {
    title: "Salary & Income",
    calcs: [
      {
        name: "PAYE / Salary Tax",
        blurb: "Work out your income tax, UIF and monthly take-home pay.",
        href: "/tax-calculator",
        icon: Calculator,
        live: true,
      },
      {
        name: "Tax Refund",
        blurb: "Find out if SARS owes you money when you file your return.",
        href: "/tax-refund",
        icon: Receipt,
        live: true,
      },
      {
        name: "Bonus Tax",
        blurb: "See the PAYE on your annual bonus and what lands in your pocket.",
        href: "/bonus-tax",
        icon: Gift,
        live: true,
      },
      {
        name: "Tax Bracket",
        blurb: "See which SARS income tax bracket and marginal rate apply to you.",
        href: "/tax-bracket",
        icon: BarChart3,
        live: true,
      },
      {
        name: "Net to Gross Salary",
        blurb: "Work backwards from take-home pay to the gross salary you need.",
        href: "#",
        icon: Wallet,
        live: false,
      },
      {
        name: "Hourly to Salary",
        blurb: "Convert an hourly rate into a monthly and annual salary.",
        href: "#",
        icon: Wallet,
        live: false,
      },
      {
        name: "UIF Calculator",
        blurb: "Work out your monthly UIF contributions and the deduction cap.",
        href: "#",
        icon: Landmark,
        live: false,
      },
    ],
  },
  {
    title: "Investments & Wealth",
    calcs: [
      {
        name: "Capital Gains Tax",
        blurb: "Tax on selling shares, property or crypto after exclusions.",
        href: "/capital-gains-tax",
        icon: TrendingUp,
        live: true,
      },
      {
        name: "Retirement Lump Sum",
        blurb: "Estimate the tax on a retirement fund lump-sum withdrawal.",
        href: "/retirement-lump-sum",
        icon: PiggyBank,
        live: true,
      },
      {
        name: "Two-Pot Withdrawal",
        blurb: "Model the tax impact of a two-pot retirement withdrawal.",
        href: "/two-pot",
        icon: Coins,
        live: true,
      },
      {
        name: "TFSA Calculator",
        blurb: "See the tax you save with a Tax-Free Savings Account.",
        href: "/tfsa",
        icon: PiggyBank,
        live: true,
      },
      {
        name: "Crypto Tax",
        blurb: "Estimate the capital gains tax on your crypto disposals.",
        href: "#",
        icon: Bitcoin,
        live: false,
      },
      {
        name: "Taxable Local Interest",
        blurb: "Check the taxable portion of local interest in your return.",
        href: "#",
        icon: Percent,
        live: false,
      },
      {
        name: "Foreign Dividends",
        blurb: "Understand the tax treatment of taxable foreign dividends.",
        href: "#",
        icon: Coins,
        live: false,
      },
      {
        name: "Retirement Savings",
        blurb: "Estimate your retirement savings position and tax impact.",
        href: "#",
        icon: PiggyBank,
        live: false,
      },
    ],
  },
  {
    title: "Property & Life Events",
    calcs: [
      {
        name: "Travel Deduction",
        blurb: "Compare the methods to maximise your travel deduction.",
        href: "/travel-deduction",
        icon: Car,
        live: true,
      },
      {
        name: "Company Car Tax",
        blurb: "Fringe-benefit tax on a company car or travel allowance.",
        href: "#",
        icon: Car,
        live: false,
      },
      {
        name: "Medical Aid Credits",
        blurb: "See how medical scheme tax credits affect your return.",
        href: "/medical-aid-credits",
        icon: HeartPulse,
        live: true,
      },
      {
        name: "Rental Income Tax",
        blurb: "Tax on your rental income after allowable expenses.",
        href: "/rental-income-tax",
        icon: Home,
        live: true,
      },
      {
        name: "Retrenchment Tax",
        blurb: "Tax on a retrenchment or severance package at SARS rates.",
        href: "/retrenchment-tax",
        icon: FileText,
        live: true,
      },
      {
        name: "Donations Tax",
        blurb: "Donations tax payable and the annual exemption that applies.",
        href: "/donations-tax",
        icon: HandCoins,
        live: true,
      },
      {
        name: "Home Office",
        blurb: "Estimate home-office deductions when you work from home.",
        href: "#",
        icon: Home,
        live: false,
      },
      {
        name: "Property Transfer Cost",
        blurb: "Transfer duty, conveyancing and bond registration costs.",
        href: "#",
        icon: Building2,
        live: false,
      },
    ],
  },
  {
    title: "Business",
    calcs: [
      {
        name: "VAT Calculator",
        blurb: "Add or remove 15% VAT to work out the VAT on any amount.",
        href: "#",
        icon: Percent,
        live: false,
      },
      {
        name: "Provisional Tax",
        blurb: "Estimate your two IRP6 provisional tax payments for the year.",
        href: "#",
        icon: FileText,
        live: false,
      },
      {
        name: "Provisional Taxpayer Check",
        blurb: "Find out whether SARS treats you as a provisional taxpayer.",
        href: "#",
        icon: Users,
        live: false,
      },
      {
        name: "Small Business Income Tax",
        blurb: "Estimate small business corporation income tax.",
        href: "#",
        icon: Briefcase,
        live: false,
      },
      {
        name: "Payroll Tax",
        blurb: "Payroll obligations such as UIF, PAYE and take-home pay.",
        href: "#",
        icon: Users,
        live: false,
      },
      {
        name: "Wear & Tear",
        blurb: "Depreciation allowances on assets you use for work.",
        href: "#",
        icon: Building2,
        live: false,
      },
    ],
  },
];

// ─── Card ───────────────────────────────────────────────────────────────────

function CalcCard({ calc }: { calc: Calc }) {
  const Icon = calc.icon;
  const inner = (
    <div
      className={`group h-full bg-white rounded-2xl border border-slate-200 p-5 flex flex-col transition-all ${
        calc.live
          ? "shadow-sm hover:shadow-md hover:border-[#0077BB]/40 cursor-pointer"
          : "opacity-70"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2.5 rounded-xl ${
            calc.live ? "bg-[#0077BB]/10" : "bg-slate-100"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              calc.live ? "text-[#0077BB]" : "text-slate-400"
            }`}
          />
        </div>
        {!calc.live && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="font-bold text-slate-800 mb-1">{calc.name}</h3>
      <p className="text-sm text-slate-500 leading-relaxed flex-1">
        {calc.blurb}
      </p>
      {calc.live && (
        <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#0077BB]">
          Open calculator
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  );

  if (!calc.live) return inner;
  return (
    <a href={calc.href} className="block h-full">
      {inner}
    </a>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalculatorsHubPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((cat) => ({
      ...cat,
      calcs: cat.calcs.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.blurb.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.calcs.length > 0);
  }, [query]);

  const liveCount = CATEGORIES.flatMap((c) => c.calcs).filter(
    (c) => c.live
  ).length;
  const totalCount = CATEGORIES.flatMap((c) => c.calcs).length;

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Tax Tools
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Tax Calculators
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Free SARS-based calculators for South Africans. Check your PAYE,
              refund, capital gains and more before you file — no registration
              needed.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search */}
        <div className="max-w-md mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search calculators…"
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all text-slate-800 shadow-sm"
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {liveCount} of {totalCount} calculators available now — more added
            regularly.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-12">
          {filtered.map((cat) => (
            <div key={cat.title}>
              <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                {cat.title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {cat.calcs.map((calc) => (
                  <CalcCard key={calc.name} calc={calc} />
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-slate-400 text-center py-12">
              No calculators match &ldquo;{query}&rdquo;.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
