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
  Building2,
  Info,
  ChevronDown,
  Calendar,
  Landmark,
  Scale,
  FileText,
  Percent,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Clock,
  Minus,
  Plus,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────
//
// Three separate cost stacks, only one of which is a tax. Each has its own
// legal source and — importantly — its own effective date, none of which is
// 1 March:
//
//   1. TRANSFER DUTY   — section 2 of the Transfer Duty Act 40 of 1949, keyed
//                        by the DATE OF ACQUISITION (the date the agreement was
//                        signed, not the date of transfer). SARS moved the bands
//                        on 1 April 2025, so the "2025" year of assessment runs
//                        13 months and the 2026/2027 tables start on 1 April.
//                        Verified against the SARS Transfer Duty rates page
//                        (last updated 25/02/2026 — the 2026 Budget did NOT move
//                        the bands, so 2027 = 2026) and the SARS Transfer Duty
//                        Guide (Issue 6) chapter 7.
//   2. CONVEYANCING    — the LSSA recommended Guideline of Fees, effective
//                        1 July 2026 (CPI reference January 2026, 3.5%). This is
//                        a GUIDELINE published by a voluntary professional body,
//                        NOT law and NOT gazetted. Every conveyancer may charge
//                        above or below it and the fee is negotiable under the
//                        Legal Practice Act 28 of 2014. VAT at 15% is added.
//   3. DEEDS OFFICE    — the Schedule of Fees of Office prescribed by
//                        regulation 84 of the Deeds Registries Act 47 of 1937,
//                        substituted by GG 54225 / GN 7180 of 27 February 2026,
//                        which by its own terms comes into operation one month
//                        after publication. Paid to the Registry, so no VAT.

const VAT_RATE = 0.15;

const DUTY_DATA: Record<
  string,
  {
    label: string;
    period: string;
    bands: { limit: number; rate: number; base: number }[];
  }
> = {
  "2027": {
    label: "2027 — acquired on or after 1 Apr 2026",
    period: "From 1 April 2026",
    bands: [
      { limit: 1210000, rate: 0, base: 0 },
      { limit: 1663800, rate: 0.03, base: 0 },
      { limit: 2329300, rate: 0.06, base: 13614 },
      { limit: 2994800, rate: 0.08, base: 53544 },
      { limit: 13310000, rate: 0.11, base: 106784 },
      { limit: Infinity, rate: 0.13, base: 1241456 },
    ],
  },
  "2026": {
    label: "2026 — acquired 1 Apr 2025 to 31 Mar 2026",
    period: "1 April 2025 – 31 March 2026",
    bands: [
      { limit: 1210000, rate: 0, base: 0 },
      { limit: 1663800, rate: 0.03, base: 0 },
      { limit: 2329300, rate: 0.06, base: 13614 },
      { limit: 2994800, rate: 0.08, base: 53544 },
      { limit: 13310000, rate: 0.11, base: 106784 },
      { limit: Infinity, rate: 0.13, base: 1241456 },
    ],
  },
  "2025": {
    label: "2025 — acquired 1 Mar 2024 to 31 Mar 2025",
    period: "1 March 2024 – 31 March 2025",
    bands: [
      { limit: 1100000, rate: 0, base: 0 },
      { limit: 1512500, rate: 0.03, base: 0 },
      { limit: 2117500, rate: 0.06, base: 12375 },
      { limit: 2722500, rate: 0.08, base: 48675 },
      { limit: 12100000, rate: 0.11, base: 97075 },
      { limit: Infinity, rate: 0.13, base: 1128600 },
    ],
  },
  "2024": {
    label: "2024 — acquired 1 Mar 2023 to 29 Feb 2024",
    period: "1 March 2023 – 29 February 2024",
    bands: [
      { limit: 1100000, rate: 0, base: 0 },
      { limit: 1512500, rate: 0.03, base: 0 },
      { limit: 2117500, rate: 0.06, base: 12375 },
      { limit: 2722500, rate: 0.08, base: 48675 },
      { limit: 12100000, rate: 0.11, base: 97075 },
      { limit: Infinity, rate: 0.13, base: 1128600 },
    ],
  },
};

// The order the dropdown must render in. Numeric-like object keys iterate in
// ascending numeric order, which would put 2024 first.
const DUTY_YEARS = ["2027", "2026", "2025", "2024"] as const;

// Schedule of Fees of Office, item 1(b) — registering a transfer, banded on the
// purchase price plus any additional consideration / the fair value of the
// property, whichever is the greater.
const DEEDS_TRANSFER_FEES: { limit: number; fee: number }[] = [
  { limit: 100000, fee: 50 },
  { limit: 200000, fee: 114 },
  { limit: 300000, fee: 727 },
  { limit: 600000, fee: 956 },
  { limit: 800000, fee: 1346 },
  { limit: 1000000, fee: 1546 },
  { limit: 2000000, fee: 1738 },
  { limit: 4000000, fee: 2408 },
  { limit: 6000000, fee: 2922 },
  { limit: 8000000, fee: 3480 },
  { limit: 10000000, fee: 4068 },
  { limit: 15000000, fee: 4844 },
  { limit: 20000000, fee: 5818 },
  { limit: Infinity, fee: 7751 },
];

// Item 1(c) — registering a bond, banded on the capital amount of the bond.
const DEEDS_BOND_FEES: { limit: number; fee: number }[] = [
  { limit: 150000, fee: 561 },
  { limit: 300000, fee: 727 },
  { limit: 600000, fee: 956 },
  { limit: 800000, fee: 1346 },
  { limit: 1000000, fee: 1546 },
  { limit: 2000000, fee: 1738 },
  { limit: 4000000, fee: 2408 },
  { limit: 6000000, fee: 2922 },
  { limit: 8000000, fee: 3480 },
  { limit: 10000000, fee: 4068 },
  { limit: 15000000, fee: 4844 },
  { limit: 20000000, fee: 5818 },
  { limit: 30000000, fee: 6781 },
  { limit: Infinity, fee: 9690 },
];

// Item 1(a) — lodgement fee, charged per deed or document lodged.
const LODGEMENT_FEE = 52;

// ─── Calculation Logic ────────────────────────────────────────────────────────

type SellerStatus = "duty" | "vat" | "goingConcern";

// The three-step approach in the SARS Transfer Duty Guide (Issue 6), 7.3.1:
// split the value between the bands, apply each band's rate, aggregate.
function dutyBreakdown(value: number, year: string) {
  const { bands } = DUTY_DATA[year];
  const rows: { from: number; to: number; rate: number; duty: number }[] = [];
  let total = 0;
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    const from = i === 0 ? 0 : bands[i - 1].limit;
    if (value <= from) break;
    const to = Math.min(value, band.limit);
    const duty = (to - from) * band.rate;
    rows.push({ from, to, rate: band.rate, duty });
    total += duty;
    if (value <= band.limit) break;
  }
  return { rows, total };
}

function bandedFee(value: number, table: { limit: number; fee: number }[]) {
  if (value <= 0) return 0;
  for (const band of table) {
    if (value <= band.limit) return band.fee;
  }
  return table[table.length - 1].fee;
}

// LSSA Guideline of Fees, Column B of the Schedule — used for both the transfer
// and the bond. Every step is "or part thereof", hence the ceiling.
function lssaGuidelineFee(value: number) {
  if (value <= 0) return 0;
  if (value <= 100000) return 6875;
  if (value <= 500000) return 6875 + 1100 * Math.ceil((value - 100000) / 50000);
  if (value <= 1000000)
    return 15675 + 2120 * Math.ceil((value - 500000) / 100000);
  if (value <= 5000000)
    return 26275 + 2120 * Math.ceil((value - 1000000) / 200000);
  return 68675 + 5340 * Math.ceil((value - 5000000) / 1000000);
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
  max = 24,
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

export default function PropertyTransferCostPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [dutyYear, setDutyYear] = useState("2027");
  const [price, setPrice] = useState(2000000);
  const [fairValue, setFairValue] = useState(0);
  const [seller, setSeller] = useState<SellerStatus>("duty");
  const [bond, setBond] = useState(1800000);
  const [sundries, setSundries] = useState(2500);
  const [includeGuideline, setIncludeGuideline] = useState(true);
  const [latePayment, setLatePayment] = useState(false);
  const [monthsLate, setMonthsLate] = useState(3);

  const results = useMemo(() => {
    // Duty is calculated on the greater of the consideration and the fair value
    // (SARS Transfer Duty Guide 6.2.1). A blank fair value means "not stated",
    // so the price stands.
    const dutiableValue = Math.max(price, fairValue);
    const fairValueApplies = fairValue > price;

    // Either/or, never both: section 9(15) exempts the acquisition from transfer
    // duty where the same supply is a taxable supply for VAT purposes.
    const dutiable = seller === "duty";
    const breakdown = dutiable
      ? dutyBreakdown(dutiableValue, dutyYear)
      : { rows: [], total: 0 };
    const transferDuty = breakdown.total;

    // Where the seller is a vendor supplying in the course of its enterprise the
    // price is deemed to include VAT (section 64 of the VAT Act), so this is the
    // VAT already inside the price — not a further amount the buyer pays.
    const vatInPrice =
      seller === "vat" ? dutiableValue * (VAT_RATE / (1 + VAT_RATE)) : 0;

    // Section 4(1A): interest at 10% per annum for each completed month, running
    // from the day after the six months allowed from the date of acquisition.
    const penaltyInterest =
      latePayment && dutiable
        ? transferDuty * 0.1 * (monthsLate / 12)
        : 0;

    // LSSA guideline — the transfer and the bond are two separate mandates at
    // two separate firms, each on Column B of the same schedule.
    const transferFeeExVat = includeGuideline
      ? lssaGuidelineFee(dutiableValue)
      : 0;
    const bondFeeExVat = includeGuideline ? lssaGuidelineFee(bond) : 0;
    const transferFeeVat = transferFeeExVat * VAT_RATE;
    const bondFeeVat = bondFeeExVat * VAT_RATE;
    const attorneyTotal =
      transferFeeExVat + transferFeeVat + bondFeeExVat + bondFeeVat;

    // Deeds Office. Gazetted, paid to the Registry, no VAT. One lodgement fee
    // per deed lodged — the deed of transfer, plus the bond if there is one.
    const deedsTransferFee = bandedFee(dutiableValue, DEEDS_TRANSFER_FEES);
    const deedsBondFee = bond > 0 ? bandedFee(bond, DEEDS_BOND_FEES) : 0;
    const deedsCount = 1 + (bond > 0 ? 1 : 0);
    const lodgement = LODGEMENT_FEE * deedsCount;
    const deedsTotal = deedsTransferFee + deedsBondFee + lodgement;

    const total =
      transferDuty + penaltyInterest + attorneyTotal + deedsTotal + sundries;
    const pctOfPrice = price > 0 ? (total / price) * 100 : 0;

    // Where the value falls in the nil band there is still a return to file, but
    // nothing to pay.
    const nilBand = dutiable && transferDuty === 0 && dutiableValue > 0;

    return {
      dutiableValue,
      fairValueApplies,
      dutiable,
      breakdown,
      transferDuty,
      vatInPrice,
      penaltyInterest,
      transferFeeExVat,
      transferFeeVat,
      bondFeeExVat,
      bondFeeVat,
      attorneyTotal,
      deedsTransferFee,
      deedsBondFee,
      deedsCount,
      lodgement,
      deedsTotal,
      total,
      pctOfPrice,
      nilBand,
    };
  }, [
    price,
    fairValue,
    seller,
    dutyYear,
    bond,
    sundries,
    includeGuideline,
    latePayment,
    monthsLate,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  // Short axis labels — four full names collide in the card's width.
  const visibleChartData = [
    {
      name: "Duty",
      value: results.transferDuty + results.penaltyInterest,
      color: "#0077BB",
    },
    { name: "Attorneys", value: results.attorneyTotal, color: "#E8872E" },
    { name: "Deeds", value: results.deedsTotal, color: "#64748b" },
    { name: "Sundries", value: sundries, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  const sellerLabels: Record<SellerStatus, string> = {
    duty: "Transfer duty",
    vat: "VAT at 15%",
    goingConcern: "Zero-rated going concern",
  };

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Property Transfer
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Property Transfer Cost Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              What a property purchase actually costs you over and above the
              price — SARS transfer duty, the conveyancer, the bond attorney and
              the Deeds Office, each from its own published schedule.
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
                The Purchase
              </h2>

              {/* Date of acquisition / rate table */}
              <InputGroup
                label="When Was the Offer Signed?"
                icon={Calendar}
                helpText="Transfer duty is charged at the rates in force on the date of acquisition — the last date of signature on the agreement, not the date of registration. SARS moved the bands on 1 April 2025, so these periods do not line up with the 1 March tax year."
              >
                <div className="relative">
                  <select
                    value={dutyYear}
                    onChange={(e) => setDutyYear(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    {DUTY_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {DUTY_DATA[y].label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </InputGroup>

              {/* Purchase price */}
              <InputGroup
                label="Purchase Price"
                icon={Wallet}
                helpText="The consideration payable under the agreement of sale."
              >
                <RandInput value={price} onChange={setPrice} />
              </InputGroup>

              {/* Fair value */}
              <InputGroup
                label="Fair Value (Optional)"
                icon={Scale}
                helpText="Duty is charged on the greater of the consideration and the fair value. Leave blank in an ordinary arm's-length sale — the price is normally accepted as fair value. Fill it in where the parties are related, where no price is payable, or where SARS has determined a value."
              >
                <RandInput value={fairValue} onChange={setFairValue} />
                {results.fairValueApplies ? (
                  <p className="mt-2 text-xs text-[#b45f16]">
                    Fair value exceeds the price, so duty is charged on R{" "}
                    {fmt(results.dutiableValue)}.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Blank means the purchase price is used.
                  </p>
                )}
              </InputGroup>

              {/* Seller VAT status — the hard either/or */}
              <InputGroup
                label="Is the Seller a VAT Vendor?"
                icon={Receipt}
                helpText="A sale of property bears either VAT or transfer duty — never both. Section 9(15) of the Transfer Duty Act exempts the acquisition from duty where the seller is a registered vendor supplying in the course of its enterprise. The seller determines which applies."
              >
                <div className="bg-slate-100 p-1 rounded-xl flex">
                  {(
                    [
                      ["duty", "No"],
                      ["vat", "Yes — VAT"],
                      ["goingConcern", "Going concern"],
                    ] as const
                  ).map(([s, label]) => (
                    <button
                      key={s}
                      onClick={() => setSeller(s)}
                      className={`flex-1 py-3 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                        seller === s
                          ? "bg-white text-[#0077BB] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {seller === "duty" &&
                    "A private seller, or a vendor selling their own home rather than enterprise stock. Transfer duty applies."}
                  {seller === "vat" &&
                    "A developer or other vendor selling in the course of its enterprise. VAT at 15% applies and no transfer duty is payable."}
                  {seller === "goingConcern" &&
                    "The whole enterprise, property included, sold as a going concern under section 11(1)(e) of the VAT Act. Zero-rated, and still no transfer duty."}
                </p>
              </InputGroup>

              {/* Bond */}
              <InputGroup
                label="Bond Amount"
                icon={Landmark}
                helpText="The capital amount of the mortgage bond being registered. Leave blank for a cash purchase — the bond attorney's fee and the Deeds Office bond fee both fall away."
              >
                <RandInput value={bond} onChange={setBond} />
                <p className="mt-2 text-xs text-slate-500">
                  {bond > 0
                    ? "Your bank appoints its own bond attorney — a second firm, a second fee."
                    : "Cash purchase — no bond registration costs."}
                </p>
              </InputGroup>

              {/* Sundries */}
              <InputGroup
                label="Sundries & Petties"
                icon={FileText}
                helpText="FICA verification, Deeds Office searches, couriers, printing and bank transfer charges. Small but real, and itemised on the cost statement. Ask your conveyancer for their figure."
              >
                <RandInput value={sundries} onChange={setSundries} />
              </InputGroup>
            </div>

            {/* Guideline + late payment options */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                Options
              </h2>

              <InputGroup
                label="Attorney Fees"
                icon={Scale}
                helpText="Switch this off to see only the amounts fixed by law — transfer duty and the gazetted Deeds Office fees — and add your conveyancer's actual quote yourself."
              >
                <Toggle
                  checked={includeGuideline}
                  onChange={setIncludeGuideline}
                  label="Include the LSSA guideline fees"
                  hint="A recommendation, not a tariff. Your quote may differ."
                />
              </InputGroup>

              <InputGroup
                label="Paying the Duty Late?"
                icon={Clock}
                helpText="Duty is payable within six months of the date of acquisition. After that, section 4(1A) levies interest at 10% per annum for each completed month until payment."
              >
                <Toggle
                  checked={latePayment}
                  onChange={setLatePayment}
                  label="Duty paid after the six-month deadline"
                  hint="Adds the section 4(1A) interest for each completed month."
                />
                {latePayment && (
                  <div className="mt-3">
                    <Stepper
                      value={monthsLate}
                      onChange={setMonthsLate}
                      min={1}
                      max={24}
                      suffix={monthsLate === 1 ? "month late" : "months late"}
                    />
                    {!results.dutiable && (
                      <p className="mt-2 text-xs text-[#b45f16]">
                        No duty is payable on this transaction, so no interest
                        arises.
                      </p>
                    )}
                  </div>
                )}
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimates only — not legal or tax advice. Transfer duty is from
                the SARS rate tables; the Deeds Office fees are the gazetted
                schedule; the attorney fees are a{" "}
                <span className="font-semibold text-[#b45f16]">
                  non-binding guideline
                </span>{" "}
                and your quote may be higher or lower. This is the buyer&apos;s
                side of a standard freehold or sectional-title purchase. It does
                not model the seller&apos;s costs (agent&apos;s commission, bond
                cancellation, rates and levy clearance figures, compliance
                certificates), the section 9 exemptions for inheritance, divorce
                and transfers between spouses, undivided shares and limited real
                rights under section 2(5), or the section 35A withholding on a
                non-resident seller. Get a written cost statement from a
                conveyancer before you commit.
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
                    Total Upfront Cost
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    R {fmt(results.total)}
                  </div>
                  <p className="text-sm mt-2 text-blue-100">
                    On top of the R {fmt(price)} purchase price —{" "}
                    {results.pctOfPrice.toFixed(2)}% of it.
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl flex-shrink-0">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-sm mb-1 text-blue-100">Transfer Duty</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(results.transferDuty + results.penaltyInterest)}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">Attorney Fees</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(results.attorneyTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">Deeds Office</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(results.deedsTotal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 -mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {DUTY_DATA[dutyYear].period}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Receipt size={12} className="text-[#0077BB]" />
                {sellerLabels[seller]}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Landmark size={12} className="text-[#0077BB]" />
                {bond > 0 ? "Bonded purchase" : "Cash purchase"}
              </span>
            </div>

            {/* VAT instead of duty */}
            {seller !== "duty" && (
              <div className="bg-[#0077BB]/5 border border-[#0077BB]/30 rounded-xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-[#0077BB] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-[#0077BB]">
                    No transfer duty is payable.
                  </span>{" "}
                  {seller === "vat" ? (
                    <>
                      This is a taxable supply, so section 9(15) exempts it from
                      duty and VAT takes precedence instead. The price you agreed
                      is deemed to include VAT, so the{" "}
                      <span className="font-semibold">
                        R {fmt(results.vatInPrice)}
                      </span>{" "}
                      of VAT inside it is the seller&apos;s liability to declare —
                      it is not a further amount you pay. SARS still issues a
                      section 9(15) exemption receipt, without which the Deeds
                      Office will not register.
                    </>
                  ) : (
                    <>
                      A supply of an enterprise as a going concern under section
                      11(1)(e) of the VAT Act is zero-rated. It is still a taxable
                      supply, so section 9(15) applies and no duty is due — but
                      every condition in section 11(1)(e) has to be met, in
                      writing, or the sale reverts to a 15% standard-rated supply.
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Nil band */}
            {results.nilBand && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-emerald-700">
                    No transfer duty on this price.
                  </span>{" "}
                  The value falls inside the nil-rate band, which starts at R{" "}
                  {fmt(DUTY_DATA[dutyYear].bands[0].limit)} for this period. A
                  declaration must still be filed on eFiling — the Deeds Office
                  will not register the transfer without the receipt.
                </p>
              </div>
            )}

            {/* Late payment */}
            {results.penaltyInterest > 0 && (
              <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-[#b45f16]">
                    R {fmt(results.penaltyInterest)} of interest.
                  </span>{" "}
                  Section 4(1A) charges 10% a year on the unpaid duty for each
                  completed month after the six months allowed from the date of
                  acquisition. The clock starts when the last party signs, not
                  when a suspensive condition is fulfilled — so a bond approval
                  that drags on does not buy you time.
                </p>
              </div>
            )}

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 self-start">
                <h3 className="font-bold text-slate-800 mb-1">
                  Where the Money Goes
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Three separate payees, three separate schedules.
                </p>
                <div className="h-48">
                  {visibleChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={visibleChartData}
                        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
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
                          {visibleChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-sm text-slate-400 px-4">
                      Enter a purchase price to see the cost breakdown.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  {/* Stack 1 — the tax */}
                  <p className="text-xs font-semibold text-[#0077BB]">
                    {results.dutiable ? "Transfer duty" : "Value-added tax"}
                  </p>
                  {results.dutiable ? (
                    <>
                      {results.breakdown.rows.map((r, i) => (
                        <Row
                          key={i}
                          label={`${(r.rate * 100).toFixed(0)}% on R ${fmt(
                            r.to - r.from
                          )}`}
                          value={`R ${fmt(r.duty)}`}
                        />
                      ))}
                      {results.breakdown.rows.length === 0 && (
                        <Row label="No value entered" value="R 0" />
                      )}
                      <Row
                        label="Duty on the dutiable value"
                        value={`R ${fmt(results.transferDuty)}`}
                        accent
                      />
                      {results.penaltyInterest > 0 && (
                        <Row
                          label={`Section 4(1A) interest — ${monthsLate} month${
                            monthsLate === 1 ? "" : "s"
                          }`}
                          value={`R ${fmt(results.penaltyInterest)}`}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <Row
                        label="Transfer duty — section 9(15) exemption"
                        value="R 0"
                      />
                      <Row
                        label={
                          seller === "vat"
                            ? "VAT inside the price (15/115)"
                            : "VAT — zero-rated going concern"
                        }
                        value={`R ${fmt(results.vatInPrice)}`}
                      />
                    </>
                  )}

                  {/* Stack 2 — the attorneys */}
                  <div className="h-px bg-slate-100" />
                  <p className="text-xs font-semibold text-[#b45f16] pt-1">
                    Attorney fees (LSSA guideline)
                  </p>
                  {includeGuideline ? (
                    <>
                      <Row
                        label="Transferring attorney"
                        value={`R ${fmt(results.transferFeeExVat)}`}
                      />
                      <Row
                        label="VAT at 15%"
                        value={`R ${fmt(results.transferFeeVat)}`}
                      />
                      {bond > 0 && (
                        <>
                          <Row
                            label="Bond registration attorney"
                            value={`R ${fmt(results.bondFeeExVat)}`}
                          />
                          <Row
                            label="VAT at 15%"
                            value={`R ${fmt(results.bondFeeVat)}`}
                          />
                        </>
                      )}
                      <Row
                        label="Attorney fees incl. VAT"
                        value={`R ${fmt(results.attorneyTotal)}`}
                        accent
                      />
                    </>
                  ) : (
                    <Row label="Excluded — add your own quote" value="R 0" />
                  )}

                  {/* Stack 3 — the Deeds Office */}
                  <div className="h-px bg-slate-100" />
                  <p className="text-xs font-semibold text-slate-500 pt-1">
                    Deeds Office (gazetted, no VAT)
                  </p>
                  <Row
                    label="Registering the transfer"
                    value={`R ${fmt(results.deedsTransferFee)}`}
                  />
                  {results.deedsBondFee > 0 && (
                    <Row
                      label="Registering the bond"
                      value={`R ${fmt(results.deedsBondFee)}`}
                    />
                  )}
                  <Row
                    label={`Lodgement — ${results.deedsCount} deed${
                      results.deedsCount === 1 ? "" : "s"
                    } × R ${LODGEMENT_FEE}`}
                    value={`R ${fmt(results.lodgement)}`}
                  />
                  <Row
                    label="Deeds Office total"
                    value={`R ${fmt(results.deedsTotal)}`}
                    accent
                  />

                  {sundries > 0 && (
                    <>
                      <div className="h-px bg-slate-100" />
                      <Row
                        label="Sundries & petties"
                        value={`R ${fmt(sundries)}`}
                      />
                    </>
                  )}

                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-[#0077BB]">
                      <span>Total Upfront Cost</span>
                      <span>R {fmt(results.total)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    {results.pctOfPrice.toFixed(2)}% of the purchase price.
                  </div>
                </div>
              </div>
            </div>

            {/* Rate table visual */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-1">
                Transfer Duty Bands
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Section 2 of the Transfer Duty Act 40 of 1949 —{" "}
                {DUTY_DATA[dutyYear].period}.
              </p>
              <div className="space-y-1.5">
                {DUTY_DATA[dutyYear].bands.map((band, i) => {
                  const from =
                    i === 0 ? 0 : DUTY_DATA[dutyYear].bands[i - 1].limit;
                  const active =
                    results.dutiable &&
                    results.dutiableValue > from &&
                    results.dutiableValue <= band.limit;
                  return (
                    <div
                      key={i}
                      className={`flex justify-between items-center px-3 py-2 rounded-lg text-xs ${
                        active
                          ? "bg-[#0077BB]/10 border border-[#0077BB]/40 font-semibold text-[#0077BB]"
                          : "bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span>
                        {band.limit === Infinity
                          ? `Above R ${fmt(from)}`
                          : `R ${fmt(from + 1)} – R ${fmt(band.limit)}`}
                      </span>
                      <span className="whitespace-nowrap">
                        {band.rate === 0
                          ? "No duty"
                          : `${(band.rate * 100).toFixed(0)}% of the value above R ${fmt(
                              from
                            )}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                Four Things Buyers Get Wrong
              </h3>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-800">
                    VAT or transfer duty — never both.
                  </p>
                  If the seller is a registered vendor selling in the course of
                  its enterprise, the sale bears VAT at 15% and section 9(15)
                  exempts it from duty entirely. Buy a new unit from a developer
                  and your transfer duty is nil; buy the identical unit from the
                  family next door and it is not. The seller determines which
                  applies, and it is the single biggest error on competitor
                  calculators.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    The attorney&apos;s fee is not a tariff.
                  </p>
                  The LSSA Guideline of Fees is a recommendation from a voluntary
                  professional body. The Legal Practice Act 28 of 2014 does not
                  delegate fee-setting to it, the Legal Practice Council does not
                  enforce it as a floor or a ceiling, and every conveyancer is
                  free to quote above or below. Ask for a written quote, and ask
                  for the professional fee and the pass-through disbursements on
                  separate lines.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Two bonds means two firms.
                  </p>
                  The transferring attorney is instructed on the transfer; your
                  bank separately appoints a bond registration attorney from its
                  own panel. They lodge simultaneously and coordinate closely, but
                  they charge two fees on the same schedule — one on the price,
                  one on the bond. A cash purchase drops the second fee and the
                  Deeds Office bond fee with it.
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Six months, from signature.
                  </p>
                  Duty is payable within six months of the date of acquisition,
                  which is the date the last party signed the agreement —
                  irrespective of any suspensive condition. Interest then runs at
                  10% a year for each completed month. Registration is
                  irrelevant: the Deeds Office will not register until the receipt
                  is in hand.
                </div>
              </div>
            </div>

            {/* Sources */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-3">
                What Each Number Comes From
              </h3>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div>
                  <span className="font-semibold text-slate-800">
                    Transfer duty.
                  </span>{" "}
                  SARS Transfer Duty rate tables and the Transfer Duty Guide
                  (Issue 6). The bands moved on 1 April 2025 and the 25 February
                  2026 Budget left them unchanged, so the same table applies to
                  every acquisition from 1 April 2025 onwards.
                </div>
                <div>
                  <span className="font-semibold text-slate-800">
                    Attorney fees.
                  </span>{" "}
                  LSSA Guideline of Fees, Column B of the Schedule, effective
                  1 July 2026 (CPI reference January 2026, 3.5%), plus VAT at 15%.
                  A guideline, not law — and this calculator carries only the
                  current one, so an older acquisition would have been quoted off
                  a lower schedule.
                </div>
                <div>
                  <span className="font-semibold text-slate-800">
                    Deeds Office fees.
                  </span>{" "}
                  Schedule of Fees of Office prescribed by regulation 84 of the
                  Deeds Registries Act 47 of 1937, as substituted by Government
                  Notice 7180 in Government Gazette 54225 of 27 February 2026,
                  which comes into operation one month after publication. These
                  are re-gazetted annually, and again only the current schedule is
                  carried here.
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
