"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Building2,
  Info,
  ChevronDown,
  Calendar,
  Wallet,
  Percent,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Minus,
  Plus,
  Briefcase,
} from "lucide-react";

// ─── SARS data ───────────────────────────────────────────────────────────────
// The wear-and-tear (depreciation) allowance lives in section 11(e) of the
// Income Tax Act. The Act does not contain the write-off periods — those come
// from Binding General Ruling 7 (Issue 4) dated 9 February 2021, which
// reproduces paragraphs 4.2, 4.3 and the Annexure of Interpretation Note 47
// (Issue 5). BGR 7 (Issue 4) is confirmed current on the SARS Register of all
// Binding General Rulings, and applies to any asset brought into use on or
// after 24 March 2020 — which is every year of assessment this suite models.
//
// Nothing in section 11(e) is indexed or year-dependent, so unlike the rest of
// the suite there is no per-year table here: the tax year only drives the
// marginal-rate options used to show the tax saving.

// Proviso to section 11(e), BGR 7 paragraph 4.3.5: the cost of a "small" item
// which functions in its own right and does not form part of a set may be
// written off in full in the year it is acquired and brought into use. The
// R7 000 figure applies to any qualifying asset acquired on or after
// 1 March 2009 and was not changed in the 25 February 2026 Budget.
const SMALL_ITEM_LIMIT = 7000;

// Section 23C(1): a registered vendor entitled to an input tax deduction must
// exclude the VAT from the cost. The standard rate has been 15% since
// 1 April 2018 and did not change in Budget 2026.
const VAT_RATE = 0.15;

const TAX_YEARS: { value: string; label: string }[] = [
  { value: "2027", label: "2027 (Mar '26 – Feb '27)" },
  { value: "2026", label: "2026 (Mar '25 – Feb '26)" },
  { value: "2025", label: "2025 (Mar '24 – Feb '25)" },
  { value: "2024", label: "2024 (Mar '23 – Feb '24)" },
];

// Marginal rates for an individual, plus the flat company rate. The allowance
// itself is a deduction — what it is worth in rands is the deduction times the
// rate at which the taxpayer's last rand of income is taxed.
const RATE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.18, label: "18% — up to R237 100 / R245 100" },
  { value: 0.26, label: "26%" },
  { value: 0.31, label: "31%" },
  { value: 0.36, label: "36%" },
  { value: 0.39, label: "39%" },
  { value: 0.41, label: "41%" },
  { value: 0.45, label: "45% — top bracket" },
  { value: 0.27, label: "27% — company (flat rate)" },
];

type TaxpayerType = "employee" | "commission" | "soleProp" | "company";

const TAXPAYER_OPTIONS: { value: TaxpayerType; label: string }[] = [
  { value: "employee", label: "Salaried employee" },
  { value: "commission", label: "Commission earner (mainly commission)" },
  { value: "soleProp", label: "Sole proprietor / freelancer" },
  { value: "company", label: "Company, close corporation or trust" },
];

// Annexure to BGR 7 (Issue 4), 9 February 2021 — Schedule of write-off periods
// acceptable to SARS. Reproduced verbatim (175 entries); the `group` field is ours,
// added only so the dropdown is navigable. Applies to any asset brought into use on
// or after 24 March 2020.
const BGR7_SCHEDULE: { name: string; years: number; group: string }[] = [
  { name: "Adding machines", years: 6, group: "Office, IT & communications" },
  { name: "Cash registers", years: 5, group: "Office, IT & communications" },
  { name: "Cell phone antennae", years: 6, group: "Office, IT & communications" },
  { name: "Cell phone masts", years: 10, group: "Office, IT & communications" },
  { name: "Cellular telephones", years: 2, group: "Office, IT & communications" },
  { name: "Cheque writing machines", years: 6, group: "Office, IT & communications" },
  { name: "Communication systems", years: 5, group: "Office, IT & communications" },
  { name: "Computers: Main frame / servers", years: 5, group: "Office, IT & communications" },
  { name: "Computers: Personal", years: 3, group: "Office, IT & communications" },
  { name: "Computer tablet and similar devices", years: 2, group: "Office, IT & communications" },
  { name: "Computer software (main frames): Purchased", years: 3, group: "Office, IT & communications" },
  { name: "Computer software (main frames): Self-developed", years: 5, group: "Office, IT & communications" },
  { name: "Computer software (personal computers)", years: 2, group: "Office, IT & communications" },
  { name: "Dictaphones", years: 3, group: "Office, IT & communications" },
  { name: "Electrostatic copiers", years: 6, group: "Office, IT & communications" },
  { name: "Fax machines", years: 3, group: "Office, IT & communications" },
  { name: "Law reports: Sets (Legal practitioners)", years: 5, group: "Office, IT & communications" },
  { name: "Navigation systems", years: 10, group: "Office, IT & communications" },
  { name: "Office equipment – electronic", years: 3, group: "Office, IT & communications" },
  { name: "Office equipment – mechanical", years: 5, group: "Office, IT & communications" },
  { name: "Photocopying equipment", years: 5, group: "Office, IT & communications" },
  { name: "Photographic equipment", years: 6, group: "Office, IT & communications" },
  { name: "Public address systems", years: 5, group: "Office, IT & communications" },
  { name: "Radar systems", years: 5, group: "Office, IT & communications" },
  { name: "Radio communication equipment", years: 5, group: "Office, IT & communications" },
  { name: "Staff training equipment", years: 5, group: "Office, IT & communications" },
  { name: "Tape-recorders", years: 5, group: "Office, IT & communications" },
  { name: "Telephone equipment", years: 5, group: "Office, IT & communications" },
  { name: "Television and advertising films", years: 4, group: "Office, IT & communications" },
  { name: "Television sets, video machines and decoders", years: 6, group: "Office, IT & communications" },
  { name: "Textbooks", years: 3, group: "Office, IT & communications" },
  { name: "Typewriters", years: 6, group: "Office, IT & communications" },
  { name: "Video cassettes", years: 2, group: "Office, IT & communications" },
  { name: "Aircraft: Light passenger or commercial helicopters", years: 4, group: "Vehicles, vessels & transport" },
  { name: "Bicycles", years: 4, group: "Vehicles, vessels & transport" },
  { name: "Delivery vehicles", years: 4, group: "Vehicles, vessels & transport" },
  { name: "Fishing vessels", years: 12, group: "Vehicles, vessels & transport" },
  { name: "Fork-lift trucks", years: 4, group: "Vehicles, vessels & transport" },
  { name: "Mobile caravans", years: 5, group: "Vehicles, vessels & transport" },
  { name: "Motorcycles", years: 4, group: "Vehicles, vessels & transport" },
  { name: "Passenger cars", years: 5, group: "Vehicles, vessels & transport" },
  { name: "Pleasure craft etc.", years: 12, group: "Vehicles, vessels & transport" },
  { name: "Refrigerated milk-tankers", years: 4, group: "Vehicles, vessels & transport" },
  { name: "Trailers", years: 5, group: "Vehicles, vessels & transport" },
  { name: "Trolleys", years: 3, group: "Vehicles, vessels & transport" },
  { name: "Trucks (heavy duty)", years: 3, group: "Vehicles, vessels & transport" },
  { name: "Trucks (other)", years: 4, group: "Vehicles, vessels & transport" },
  { name: "Water tankers", years: 4, group: "Vehicles, vessels & transport" },
  { name: "Arc welding equipment", years: 6, group: "Machinery, plant & tools" },
  { name: "Battery chargers", years: 5, group: "Machinery, plant & tools" },
  { name: "Bumping flaking", years: 4, group: "Machinery, plant & tools" },
  { name: "Compressors", years: 4, group: "Machinery, plant & tools" },
  { name: "Drills", years: 6, group: "Machinery, plant & tools" },
  { name: "Electric saws", years: 6, group: "Machinery, plant & tools" },
  { name: "Engraving equipment", years: 5, group: "Machinery, plant & tools" },
  { name: "Food-conveying systems", years: 4, group: "Machinery, plant & tools" },
  { name: "Gas cutting equipment", years: 6, group: "Machinery, plant & tools" },
  { name: "Gearboxes", years: 4, group: "Machinery, plant & tools" },
  { name: "Gear shapers", years: 6, group: "Machinery, plant & tools" },
  { name: "Grinding machines", years: 6, group: "Machinery, plant & tools" },
  { name: "Guillotines", years: 6, group: "Machinery, plant & tools" },
  { name: "Heat dryers", years: 6, group: "Machinery, plant & tools" },
  { name: "Knitting machines", years: 6, group: "Machinery, plant & tools" },
  { name: "Lathes", years: 6, group: "Machinery, plant & tools" },
  { name: "Milling machines", years: 6, group: "Machinery, plant & tools" },
  { name: "Motors", years: 4, group: "Machinery, plant & tools" },
  { name: "Packaging and related equipment", years: 4, group: "Machinery, plant & tools" },
  { name: "Patterns, tooling and dies", years: 3, group: "Machinery, plant & tools" },
  { name: "Perforating equipment", years: 6, group: "Machinery, plant & tools" },
  { name: "Planers", years: 6, group: "Machinery, plant & tools" },
  { name: "Power tools (hand-operated)", years: 5, group: "Machinery, plant & tools" },
  { name: "Pumps", years: 4, group: "Machinery, plant & tools" },
  { name: "Sanders", years: 6, group: "Machinery, plant & tools" },
  { name: "Shakers", years: 4, group: "Machinery, plant & tools" },
  { name: "Special patterns and tooling", years: 2, group: "Machinery, plant & tools" },
  { name: "Spot welding equipment", years: 6, group: "Machinery, plant & tools" },
  { name: "Water distillation and purification plant", years: 12, group: "Machinery, plant & tools" },
  { name: "Wire line rods", years: 1, group: "Machinery, plant & tools" },
  { name: "Workshop equipment", years: 5, group: "Machinery, plant & tools" },
  { name: "Bulldozers", years: 3, group: "Construction & earthmoving" },
  { name: "Concrete mixers (portable)", years: 4, group: "Construction & earthmoving" },
  { name: "Concrete transit mixers", years: 3, group: "Construction & earthmoving" },
  { name: "Drilling equipment (water)", years: 5, group: "Construction & earthmoving" },
  { name: "Excavators", years: 4, group: "Construction & earthmoving" },
  { name: "Front-end loaders", years: 4, group: "Construction & earthmoving" },
  { name: "Gantry cranes", years: 6, group: "Construction & earthmoving" },
  { name: "Graders", years: 4, group: "Construction & earthmoving" },
  { name: "Mobile cranes", years: 4, group: "Construction & earthmoving" },
  { name: "Motorised concrete mixers", years: 3, group: "Construction & earthmoving" },
  { name: "Runway lights", years: 5, group: "Construction & earthmoving" },
  { name: "Surveyors: Instruments", years: 10, group: "Construction & earthmoving" },
  { name: "Surveyors: Field equipment", years: 5, group: "Construction & earthmoving" },
  { name: "Traxcavators", years: 4, group: "Construction & earthmoving" },
  { name: "Truck-mounted cranes", years: 4, group: "Construction & earthmoving" },
  { name: "Weighbridges (movable parts)", years: 10, group: "Construction & earthmoving" },
  { name: "Balers", years: 6, group: "Agriculture & forestry" },
  { name: "Crop sprayers", years: 6, group: "Agriculture & forestry" },
  { name: "Debarking equipment", years: 4, group: "Agriculture & forestry" },
  { name: "Fertiliser spreaders", years: 6, group: "Agriculture & forestry" },
  { name: "Food bins", years: 4, group: "Agriculture & forestry" },
  { name: "Garden irrigation equipment (movable)", years: 5, group: "Agriculture & forestry" },
  { name: "Harvesters", years: 6, group: "Agriculture & forestry" },
  { name: "Incubators", years: 6, group: "Agriculture & forestry" },
  { name: "Motorised chainsaws", years: 4, group: "Agriculture & forestry" },
  { name: "Motor mowers", years: 5, group: "Agriculture & forestry" },
  { name: "Pellet mills", years: 4, group: "Agriculture & forestry" },
  { name: "Ploughs", years: 6, group: "Agriculture & forestry" },
  { name: "Race horses", years: 4, group: "Agriculture & forestry" },
  { name: "Seed separators", years: 6, group: "Agriculture & forestry" },
  { name: "Surge bins", years: 4, group: "Agriculture & forestry" },
  { name: "Tractors", years: 4, group: "Agriculture & forestry" },
  { name: "Dental and doctors equipment", years: 5, group: "Medical, laboratory & gym" },
  { name: "Gymnasium equipment: Cardiovascular equipment", years: 2, group: "Medical, laboratory & gym" },
  { name: "Gymnasium equipment: Health testing equipment", years: 5, group: "Medical, laboratory & gym" },
  { name: "Gymnasium equipment: Weights and strength equipment", years: 4, group: "Medical, laboratory & gym" },
  { name: "Gymnasium equipment: Spinning equipment", years: 1, group: "Medical, laboratory & gym" },
  { name: "Gymnasium equipment: Other", years: 10, group: "Medical, laboratory & gym" },
  { name: "Laboratory research equipment", years: 5, group: "Medical, laboratory & gym" },
  { name: "Magnetic Resonance Imaging Scanners", years: 5, group: "Medical, laboratory & gym" },
  { name: "Medical theatre equipment", years: 6, group: "Medical, laboratory & gym" },
  { name: "Oxygen concentrators", years: 3, group: "Medical, laboratory & gym" },
  { name: "X-ray equipment", years: 5, group: "Medical, laboratory & gym" },
  { name: "Cinema equipment", years: 5, group: "Retail, hospitality & catering" },
  { name: "Cold drink dispensers", years: 6, group: "Retail, hospitality & catering" },
  { name: "Containers (large metal type used for transporting freight)", years: 10, group: "Retail, hospitality & catering" },
  { name: "Hairdressers’ equipment", years: 5, group: "Retail, hospitality & catering" },
  { name: "Ironing and pressing equipment", years: 6, group: "Retail, hospitality & catering" },
  { name: "Kitchen equipment", years: 6, group: "Retail, hospitality & catering" },
  { name: "Laundromat equipment", years: 5, group: "Retail, hospitality & catering" },
  { name: "Mobile refrigeration units", years: 4, group: "Retail, hospitality & catering" },
  { name: "Musical instruments", years: 5, group: "Retail, hospitality & catering" },
  { name: "Neon signs and advertising boards", years: 10, group: "Retail, hospitality & catering" },
  { name: "Ovens and heating devices", years: 6, group: "Retail, hospitality & catering" },
  { name: "Ovens for heating food", years: 6, group: "Retail, hospitality & catering" },
  { name: "Pallets", years: 4, group: "Retail, hospitality & catering" },
  { name: "Refrigeration equipment", years: 6, group: "Retail, hospitality & catering" },
  { name: "Refrigerators", years: 6, group: "Retail, hospitality & catering" },
  { name: "Scales", years: 5, group: "Retail, hospitality & catering" },
  { name: "Sewing machines", years: 6, group: "Retail, hospitality & catering" },
  { name: "Shop fittings", years: 6, group: "Retail, hospitality & catering" },
  { name: "Spin dryers", years: 6, group: "Retail, hospitality & catering" },
  { name: "Vending machines (including video game machines)", years: 6, group: "Retail, hospitality & catering" },
  { name: "Warehouse racking", years: 10, group: "Retail, hospitality & catering" },
  { name: "Washing machines", years: 5, group: "Retail, hospitality & catering" },
  { name: "Air conditioners: Window type", years: 6, group: "Premises fittings & building services" },
  { name: "Air conditioners: Mobile", years: 5, group: "Premises fittings & building services" },
  { name: "Air conditioners: Room unit", years: 10, group: "Premises fittings & building services" },
  { name: "Air conditioning assets: Air handling units", years: 20, group: "Premises fittings & building services" },
  { name: "Air conditioning assets: Cooling towers", years: 15, group: "Premises fittings & building services" },
  { name: "Air conditioning assets: Condensing sets", years: 15, group: "Premises fittings & building services" },
  { name: "Chillers: Absorption type", years: 25, group: "Premises fittings & building services" },
  { name: "Chillers: Centrifugal", years: 20, group: "Premises fittings & building services" },
  { name: "Boilers", years: 4, group: "Premises fittings & building services" },
  { name: "Carports", years: 5, group: "Premises fittings & building services" },
  { name: "Curtains", years: 5, group: "Premises fittings & building services" },
  { name: "Demountable partitions", years: 6, group: "Premises fittings & building services" },
  { name: "Escalators", years: 20, group: "Premises fittings & building services" },
  { name: "Fire extinguishers (loose units)", years: 5, group: "Premises fittings & building services" },
  { name: "Fire detection systems", years: 3, group: "Premises fittings & building services" },
  { name: "Fitted carpets", years: 6, group: "Premises fittings & building services" },
  { name: "Furniture and fittings", years: 6, group: "Premises fittings & building services" },
  { name: "Gas heaters and cookers", years: 6, group: "Premises fittings & building services" },
  { name: "Generators (portable)", years: 5, group: "Premises fittings & building services" },
  { name: "Generators (standby)", years: 15, group: "Premises fittings & building services" },
  { name: "Heating equipment", years: 6, group: "Premises fittings & building services" },
  { name: "Hot water systems", years: 5, group: "Premises fittings & building services" },
  { name: "Lift installations (goods/passengers)", years: 12, group: "Premises fittings & building services" },
  { name: "Power supply", years: 5, group: "Premises fittings & building services" },
  { name: "Security systems (removable)", years: 5, group: "Premises fittings & building services" },
  { name: "Solar energy units", years: 5, group: "Premises fittings & building services" },
  { name: "Water tanks", years: 6, group: "Premises fittings & building services" },
  { name: "Artefacts", years: 25, group: "Other assets" },
  { name: "Firearms", years: 6, group: "Other assets" },
  { name: "Paintings (valuable)", years: 25, group: "Other assets" },
  { name: "Portable safes", years: 25, group: "Other assets" },
];

const SCHEDULE_GROUPS = Array.from(
  new Set(BGR7_SCHEDULE.map((a) => a.group))
);

// ─── Calculation logic ────────────────────────────────────────────────────────

type ScheduleRow = {
  year: number;
  opening: number;
  months: number;
  allowance: number;
  businessAllowance: number;
  closing: number;
};

/**
 * Builds the year-by-year write-off schedule for one asset.
 *
 * Straight line (BGR 7 para 4.3.3): the cost is written off in equal annual
 * instalments over the useful life. Diminishing value (para 4.3.2): the
 * allowance is calculated each year on the remaining income tax value, at
 * 1 / life — BGR 7 Example 1 uses 20% a year for a five-year life.
 *
 * Either way the allowance is apportioned where the asset was not used for
 * trade throughout the year (para 4.3.8) and further apportioned for private
 * use (para 4.3.7). Because a part first year pushes the tail of a
 * straight-line write-off into an extra year of assessment, the schedule is
 * built by consuming the remaining income tax value rather than by assuming
 * exactly `life` rows.
 */
function buildSchedule(
  base: number,
  life: number,
  method: "straight" | "diminishing",
  firstYearMonths: number,
  businessPct: number
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  if (base <= 0 || life <= 0) return rows;

  const businessFraction = Math.min(100, Math.max(0, businessPct)) / 100;
  const straightAnnual = base / life;
  const diminishingRate = 1 / life;

  let remaining = base;
  // A part first year adds at most one extra year of assessment to a
  // straight-line write-off; the diminishing-value method is cut off at the
  // useful life and its residue is reported separately.
  const maxRows = method === "straight" ? life + 1 : life;

  for (let year = 1; year <= maxRows && remaining > 0.005; year++) {
    const months = year === 1 ? firstYearMonths : 12;
    const full =
      method === "straight" ? straightAnnual : remaining * diminishingRate;
    const allowance = Math.min(remaining, (full * months) / 12);
    remaining -= allowance;
    rows.push({
      year,
      opening: remaining + allowance,
      months,
      allowance,
      businessAllowance: allowance * businessFraction,
      closing: remaining,
    });
  }
  return rows;
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
          suffix ? "pl-4 pr-16" : "pl-8 pr-4"
        } py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800`}
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

export default function WearAndTearPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [taxYear, setTaxYear] = useState("2027");
  const [taxpayer, setTaxpayer] = useState<TaxpayerType>("employee");
  const [marginalRate, setMarginalRate] = useState(0.31);

  const [assetName, setAssetName] = useState("Computers: Personal");
  const [customLife, setCustomLife] = useState(3);
  const [cost, setCost] = useState(24000);
  const [movingCosts, setMovingCosts] = useState(0);
  const [vatVendor, setVatVendor] = useState(false);

  const [method, setMethod] = useState<"straight" | "diminishing">("straight");
  const [firstYearMonths, setFirstYearMonths] = useState(12);
  const [businessPct, setBusinessPct] = useState(100);
  const [claimYear, setClaimYear] = useState(1);

  const [secondHand, setSecondHand] = useState(false);
  const [partOfSet, setPartOfSet] = useState(false);
  const [heldForLetting, setHeldForLetting] = useState(false);

  const isCustomAsset = assetName === "__custom__";
  const scheduleEntry = BGR7_SCHEDULE.find((a) => a.name === assetName);

  const results = useMemo(() => {
    // Section 23C(1) — a vendor who claimed the input tax may not include it
    // in the cost of the asset.
    const costExVat = vatVendor ? cost / (1 + VAT_RATE) : cost;
    // Paragraph (v) of the proviso to s 11(e) / BGR 7 para 4.2.3 — the cost of
    // moving the asset is added to its value and written off over the
    // remaining useful life.
    const base = Math.max(0, costExVat + movingCosts);

    // A second-hand asset is written off over its remaining expected useful
    // life having regard to its condition (BGR 7 para 4.3.4), not over the
    // Annexure period. So is an asset not listed in the Annexure (para 4.3.3(b)).
    const listedLife = scheduleEntry?.years ?? 0;
    const life =
      isCustomAsset || secondHand ? Math.max(1, customLife) : listedLife;

    // BGR 7 para 4.3.5 — the "small items" full write-off. Not available for a
    // set, and not available to a lessor for an asset acquired to let.
    const smallItem = base > 0 && base < SMALL_ITEM_LIMIT && !partOfSet && !heldForLetting;

    const businessFraction = Math.min(100, Math.max(0, businessPct)) / 100;

    const rows: ScheduleRow[] = smallItem
      ? [
          {
            year: 1,
            opening: base,
            months: firstYearMonths,
            allowance: base,
            businessAllowance: base * businessFraction,
            closing: 0,
          },
        ]
      : buildSchedule(base, life, method, firstYearMonths, businessPct);

    const safeClaimYear = Math.min(Math.max(1, claimYear), Math.max(1, rows.length));
    const selected = rows[safeClaimYear - 1];

    const totalClaimed = rows.reduce((s, r) => s + r.businessAllowance, 0);
    const residual = rows.length > 0 ? rows[rows.length - 1].closing : base;
    const privateShare = base - totalClaimed - residual;

    const thisYearAllowance = selected?.businessAllowance ?? 0;
    const taxSaving = thisYearAllowance * marginalRate;
    const totalTaxSaving = totalClaimed * marginalRate;

    return {
      costExVat,
      vatExcluded: cost - costExVat,
      base,
      life,
      smallItem,
      rows,
      safeClaimYear,
      selected,
      totalClaimed,
      residual,
      privateShare,
      thisYearAllowance,
      taxSaving,
      totalTaxSaving,
    };
  }, [
    cost,
    movingCosts,
    vatVendor,
    scheduleEntry,
    isCustomAsset,
    secondHand,
    customLife,
    partOfSet,
    heldForLetting,
    businessPct,
    method,
    firstYearMonths,
    claimYear,
    marginalRate,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  const chartData = results.rows.map((r) => ({
    name: `Yr ${r.year}`,
    value: Math.max(0, r.businessAllowance),
    color: r.year === results.safeClaimYear ? "#0077BB" : "#93c5fd",
  }));

  const yearLabel =
    TAX_YEARS.find((y) => y.value === taxYear)?.label ?? taxYear;

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Income Tax
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Wear &amp; Tear Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Work out the section 11(e) wear-and-tear allowance on an asset you
              use for work — using SARS&apos;s own write-off periods from
              Binding General Ruling 7, all 175 of them.
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
                The Asset
              </h2>

              <InputGroup
                label="Asset"
                icon={Package}
                helpText="The Annexure to Binding General Ruling 7 (Issue 4) lists the write-off periods SARS accepts. Pick the closest match, or choose 'Other' and enter your own expected useful life."
              >
                <div className="relative">
                  <select
                    value={assetName}
                    onChange={(e) => {
                      setAssetName(e.target.value);
                      setClaimYear(1);
                    }}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    {SCHEDULE_GROUPS.map((g) => (
                      <optgroup key={g} label={g}>
                        {BGR7_SCHEDULE.filter((a) => a.group === g).map((a) => (
                          <option key={a.name} value={a.name}>
                            {a.name} — {a.years} yr
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <optgroup label="Not on the SARS schedule">
                      <option value="__custom__">
                        Other asset — I&apos;ll enter the useful life
                      </option>
                    </optgroup>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
                {!isCustomAsset && !secondHand && scheduleEntry && (
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    BGR 7 write-off period:{" "}
                    <strong className="text-[#0077BB]">
                      {scheduleEntry.years} year
                      {scheduleEntry.years === 1 ? "" : "s"}
                    </strong>{" "}
                    — {scheduleEntry.group.toLowerCase()}.
                  </p>
                )}
              </InputGroup>

              {(isCustomAsset || secondHand) && (
                <InputGroup
                  label="Expected Useful Life"
                  icon={Calendar}
                  helpText="An asset that is not in the Annexure — or one bought second-hand — is written off over its own expected useful life, taking its condition into account. Keep the manufacturer's specification, your own past experience or the accounting write-off period on file to support it."
                >
                  <Stepper
                    value={customLife}
                    onChange={(n) => {
                      setCustomLife(n);
                      setClaimYear(1);
                    }}
                    min={1}
                    max={25}
                    suffix={customLife === 1 ? "year" : "years"}
                  />
                </InputGroup>
              )}

              <InputGroup
                label="Cost of the Asset"
                icon={Wallet}
                helpText="The cash cost of acquiring the asset, excluding finance charges, plus delivery and the direct cost of installation or erection."
              >
                <RandInput value={cost} onChange={setCost} />
              </InputGroup>

              <Toggle
                checked={vatVendor}
                onChange={setVatVendor}
                label="I am a VAT vendor and claimed the input tax"
                hint="Section 23C(1) — the VAT must then come out of the cost. The figure above is treated as VAT-inclusive."
              />

              <div className="h-px bg-slate-100 my-6" />

              <InputGroup
                label="Cost of Moving the Asset"
                icon={Truck}
                helpText="Paragraph (v) of the proviso to section 11(e): money spent moving the asset from one location to another is added to its value and written off over the remaining useful life. If the asset is already fully written off, moving costs are deducted in the year they are incurred."
              >
                <RandInput value={movingCosts} onChange={setMovingCosts} />
              </InputGroup>

              <Toggle
                checked={secondHand}
                onChange={(b) => {
                  setSecondHand(b);
                  setClaimYear(1);
                }}
                label="I bought it second-hand"
                hint="A used asset is written off over its remaining expected useful life, not the Annexure period — being older than the write-off period does not let you claim it all at once."
              />

              <div className="mt-3 space-y-3">
                <Toggle
                  checked={partOfSet}
                  onChange={setPartOfSet}
                  label="It forms part of a set"
                  hint="A table and six chairs cannot be split into individual items to get under R7 000 each."
                />
                <Toggle
                  checked={heldForLetting}
                  onChange={setHeldForLetting}
                  label="I acquired it to let it out"
                  hint="Lessors cannot use the small-items write-off — the asset must be depreciated over its useful life."
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                How You Use It
              </h2>

              <InputGroup
                label="Write-Off Method"
                icon={Layers}
                helpText="You may elect either method and you do not have to tell SARS when you change. Straight line writes the cost off in equal instalments; diminishing value calculates each year's allowance on the remaining income tax value, so it front-loads the deduction but never quite reaches zero."
              >
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: "straight", label: "Straight line" },
                      { key: "diminishing", label: "Diminishing value" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setMethod(m.key);
                        setClaimYear(1);
                      }}
                      className={`py-3 px-3 rounded-xl border text-sm font-semibold transition-all ${
                        method === m.key
                          ? "bg-[#0077BB] border-[#0077BB] text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </InputGroup>

              <InputGroup
                label="Months Used in the First Year"
                icon={Calendar}
                helpText="BGR 7 paragraph 4.3.8 — the allowance is apportioned where the asset was not used for trade throughout the year of assessment, for example because you bought it partway through the year. This applies to both methods."
              >
                <Stepper
                  value={firstYearMonths}
                  onChange={setFirstYearMonths}
                  min={1}
                  max={12}
                  suffix={firstYearMonths === 1 ? "month" : "months"}
                />
              </InputGroup>

              <InputGroup
                label="Business Use"
                icon={Percent}
                helpText="BGR 7 paragraph 4.3.7 — where an asset is used privately as well, the allowance must be apportioned, because the deduction is allowed only to the extent that the asset is used for trade. Keep a record of how you arrived at the split."
              >
                <div className="space-y-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={businessPct}
                    onChange={(e) => setBusinessPct(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#0077BB]"
                  />
                  <div className="text-center font-bold text-[#0077BB] bg-blue-50 py-1.5 rounded-lg text-sm">
                    {businessPct}% business · {100 - businessPct}% private
                  </div>
                </div>
              </InputGroup>

              <InputGroup
                label="Year of Assessment You Are Claiming"
                icon={Calendar}
                helpText="Year 1 is the year you brought the asset into use. Step through the years to see each year's allowance and what is left to write off."
              >
                <Stepper
                  value={results.safeClaimYear}
                  onChange={setClaimYear}
                  min={1}
                  max={Math.max(1, results.rows.length)}
                  suffix={`of ${Math.max(1, results.rows.length)}`}
                />
              </InputGroup>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                What It Saves You
              </h2>

              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="Section 11(e) is not indexed — the write-off periods and the R7 000 small-item limit are the same in every year this calculator covers. The tax year is here for the record and for the rate you pick below."
              >
                <div className="relative">
                  <select
                    value={taxYear}
                    onChange={(e) => setTaxYear(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    {TAX_YEARS.map((y) => (
                      <option key={y.value} value={y.value}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </InputGroup>

              <InputGroup
                label="Who Is Claiming"
                icon={Briefcase}
                helpText="Section 23(m) restricts what an employee may deduct against salary income — but it expressly leaves section 11(e) alone, so wear and tear survives for everyone."
              >
                <div className="relative">
                  <select
                    value={taxpayer}
                    onChange={(e) =>
                      setTaxpayer(e.target.value as TaxpayerType)
                    }
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    {TAXPAYER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </InputGroup>

              <InputGroup
                label="Your Marginal Tax Rate"
                icon={Percent}
                helpText="The allowance is a deduction, so what it is worth in rands is the deduction multiplied by the rate your top rand of income is taxed at. Not sure? Use the Tax Bracket calculator."
              >
                <div className="relative">
                  <select
                    value={marginalRate}
                    onChange={(e) => setMarginalRate(Number(e.target.value))}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800 appearance-none"
                  >
                    {RATE_OPTIONS.map((r) => (
                      <option key={r.label} value={r.value}>
                        {r.label}
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
                This calculator provides estimates only and does not constitute
                tax advice. It models the ordinary section 11(e) allowance.
                Faster write-offs under other sections are not applied here —
                section 12E for a Small Business Corporation (see the Small
                Business Income Tax calculator), section 12B/12BA for renewable
                energy, section 12C for manufacturing plant, and section 13
                for buildings. Recoupments on disposal (section 8(4)(a)),
                assets acquired by donation or inheritance, leased assets with
                a residual value, section 23A lessor limitations and foreign
                currency translation are all outside its scope. Consult a
                registered tax professional for your situation.
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
                    {results.smallItem
                      ? "Full Write-Off This Year"
                      : `Wear & Tear Allowance — Year ${results.safeClaimYear}`}
                  </p>
                  <div className="text-5xl font-bold tracking-tight">
                    R {fmt(results.thisYearAllowance)}
                  </div>
                  <p className="text-sm mt-2 text-blue-100">
                    {results.base <= 0
                      ? "Enter what the asset cost to see your allowance."
                      : results.smallItem
                        ? `Under R${fmt(
                            SMALL_ITEM_LIMIT
                          )} — the whole cost comes off in the year you bring it into use.`
                        : `R ${fmt(results.base)} written off over ${
                            results.life
                          } year${results.life === 1 ? "" : "s"} on the ${
                            method === "straight"
                              ? "straight-line"
                              : "diminishing-value"
                          } method.`}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-sm mb-1 text-blue-100">Tax Saved</p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.taxSaving)}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">
                    Claimed Over the Life
                  </p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.totalClaimed)}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">Total Tax Saved</p>
                  <p className="text-xl font-semibold">
                    R {fmt(results.totalTaxSaving)}
                  </p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 -mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {yearLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Package size={12} className="text-[#0077BB]" />
                {isCustomAsset || secondHand
                  ? `Own estimate — ${results.life} year${
                      results.life === 1 ? "" : "s"
                    }`
                  : `BGR 7 — ${results.life} year${
                      results.life === 1 ? "" : "s"
                    }`}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Layers size={12} className="text-[#0077BB]" />
                {method === "straight" ? "Straight line" : "Diminishing value"}
              </span>
              {businessPct < 100 && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                  <Percent size={12} className="text-[#0077BB]" />
                  {businessPct}% business use
                </span>
              )}
            </div>

            {/* Small-item banner */}
            {results.smallItem && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold">
                    This is a &quot;small&quot; item.
                  </span>{" "}
                  It costs less than R{fmt(SMALL_ITEM_LIMIT)}, functions in its
                  own right and does not form part of a set, so BGR 7 paragraph
                  4.3.5 lets you write the whole cost off in the year you
                  acquire it and bring it into use — no schedule, no
                  apportionment for the part of the year. The R{fmt(
                    SMALL_ITEM_LIMIT
                  )}{" "}
                  figure applies to any asset acquired on or after 1 March 2009
                  and did not move in the February 2026 Budget.
                </div>
              </div>
            )}

            {/* Section 23(m) card */}
            <div
              className={`rounded-2xl border p-5 flex gap-3 ${
                taxpayer === "employee"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <Briefcase className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#0077BB]" />
              <div className="text-sm text-slate-700 leading-relaxed">
                {taxpayer === "employee" && (
                  <>
                    <span className="font-semibold">
                      Yes — a salaried employee can claim this.
                    </span>{" "}
                    Section 23(m) blocks almost every deduction against salary
                    income, which is why the Home Office calculator has to
                    disallow bond interest. But section 23(m)(ii) expressly
                    carves out section 11(e), so the wear-and-tear allowance on
                    the laptop, desk and chair you use for work survives. It is
                    apportioned for private use, but it is <em>not</em>{" "}
                    apportioned by the floor area of your home office — that
                    restriction applies to premises costs, not to your assets.
                  </>
                )}
                {taxpayer === "commission" && (
                  <>
                    <span className="font-semibold">
                      Section 23(m) does not apply to you at all.
                    </span>{" "}
                    Where remuneration is normally derived mainly from
                    commission based on sales or turnover — SARS tests this as
                    more than half of total income — the whole prohibition falls
                    away. You may claim wear and tear alongside your other
                    business expenses.
                  </>
                )}
                {taxpayer === "soleProp" && (
                  <>
                    <span className="font-semibold">
                      You claim this against your business income.
                    </span>{" "}
                    Section 23(m) applies only to employment income, so it does
                    not touch you. Remember the allowance is only available to
                    the extent the asset is used in the trade — set the business
                    use slider honestly and keep the working.
                  </>
                )}
                {taxpayer === "company" && (
                  <>
                    <span className="font-semibold">
                      Check section 12E before you use this.
                    </span>{" "}
                    If the company qualifies as a Small Business Corporation it
                    can write manufacturing plant off in full in year one and
                    everything else 50 / 30 / 20 over three years, which beats
                    section 11(e) in almost every case. The Small Business
                    Income Tax calculator tests the section 12E gates and
                    computes both.
                  </>
                )}
              </div>
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Allowance by Year
                </h3>
                <div className="h-48">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
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
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-sm text-slate-400 px-4">
                      Enter what the asset cost to see the write-off schedule.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  <Row label="Cost of the asset" value={`R ${fmt(cost)}`} />
                  {vatVendor && (
                    <Row
                      label="Less: input tax (section 23C)"
                      value={`− R ${fmt(results.vatExcluded)}`}
                      accent
                    />
                  )}
                  {movingCosts > 0 && (
                    <Row
                      label="Plus: cost of moving the asset"
                      value={`+ R ${fmt(movingCosts)}`}
                      accent
                    />
                  )}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-800 text-sm">
                      <span>Value for section 11(e)</span>
                      <span>R {fmt(results.base)}</span>
                    </div>
                  </div>
                  {results.smallItem ? (
                    <Row
                      label={`Small item — written off in full`}
                      value={`R ${fmt(results.base)}`}
                      accent
                    />
                  ) : (
                    <>
                      <Row
                        label={`Write-off period`}
                        value={`${results.life} year${
                          results.life === 1 ? "" : "s"
                        }`}
                      />
                      <Row
                        label={
                          method === "straight"
                            ? "Full annual allowance (cost ÷ life)"
                            : "Annual rate on the remaining value"
                        }
                        value={
                          method === "straight"
                            ? `R ${fmt(
                                results.life > 0 ? results.base / results.life : 0
                              )}`
                            : `${(100 / Math.max(1, results.life)).toFixed(1)}%`
                        }
                      />
                      {results.selected && results.selected.months < 12 && (
                        <Row
                          label={`Apportioned for ${results.selected.months} of 12 months`}
                          value={`× ${(results.selected.months / 12).toFixed(
                            2
                          )}`}
                          accent
                        />
                      )}
                    </>
                  )}
                  {businessPct < 100 && (
                    <Row
                      label={`Business use apportionment`}
                      value={`× ${businessPct}%`}
                      accent
                    />
                  )}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-800 text-sm">
                      <span>Allowance for year {results.safeClaimYear}</span>
                      <span>R {fmt(results.thisYearAllowance)}</span>
                    </div>
                  </div>
                  <Row
                    label={`Tax saved at ${(marginalRate * 100).toFixed(0)}%`}
                    value={`R ${fmt(results.taxSaving)}`}
                    accent
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Left to write off</span>
                      <span>
                        R {fmt(results.selected?.closing ?? results.base)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Percent size={11} />
                    Effective write-off this year:{" "}
                    {results.base > 0
                      ? (
                          (results.thisYearAllowance / results.base) *
                          100
                        ).toFixed(1)
                      : "0.0"}
                    % of cost
                  </div>
                </div>
              </div>
            </div>

            {/* Write-off schedule */}
            {results.rows.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-slate-800">
                    Write-Off Schedule
                  </h3>
                  <span className="text-xs text-slate-400">
                    income tax value, year by year
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="py-2 pr-3 font-semibold">Year</th>
                        <th className="py-2 pr-3 font-semibold text-right">
                          Opening value
                        </th>
                        <th className="py-2 pr-3 font-semibold text-right">
                          Months
                        </th>
                        <th className="py-2 pr-3 font-semibold text-right">
                          Allowance
                        </th>
                        <th className="py-2 font-semibold text-right">
                          Closing value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.rows.map((r) => (
                        <tr
                          key={r.year}
                          className={`border-b border-slate-50 ${
                            r.year === results.safeClaimYear
                              ? "bg-[#0077BB]/5 font-semibold text-slate-800"
                              : "text-slate-600"
                          }`}
                        >
                          <td className="py-2.5 pr-3">Year {r.year}</td>
                          <td className="py-2.5 pr-3 text-right">
                            R {fmt(r.opening)}
                          </td>
                          <td className="py-2.5 pr-3 text-right">{r.months}</td>
                          <td className="py-2.5 pr-3 text-right text-[#0077BB]">
                            R {fmt(r.businessAllowance)}
                          </td>
                          <td className="py-2.5 text-right">
                            R {fmt(r.closing)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {method === "diminishing" && results.residual > 0.5 && (
                  <div className="mt-4 bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
                    <AlertTriangle className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                      The diminishing-value method never reaches zero — after{" "}
                      {results.life} year{results.life === 1 ? "" : "s"} there is
                      still R{fmt(results.residual)} of income tax value left.
                      BGR 7 Example 1 allows you to switch to the straight-line
                      method at any time and write the remaining value off in
                      equal instalments over the remaining useful life. You do
                      not have to notify SARS, but keep the records.
                    </p>
                  </div>
                )}
                {businessPct < 100 && results.privateShare > 0.5 && (
                  <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                    R{fmt(results.privateShare)} of the cost is never deductible
                    — that is the {100 - businessPct}% private share, which
                    section 11(e) does not allow because the asset is not used
                    for the purposes of trade to that extent.
                  </p>
                )}
              </div>
            )}

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                How the wear-and-tear allowance works
              </h3>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-800">
                    The periods are not in the Act.
                  </strong>{" "}
                  Section 11(e) only says you may deduct the amount by which an
                  asset&apos;s value has diminished through wear and tear. The
                  actual write-off periods come from the Annexure to Binding
                  General Ruling 7 (Issue 4) of 9 February 2021, and they apply
                  to any asset brought into use on or after 24 March 2020. All
                  175 of them are in the dropdown, exactly as SARS published
                  them.
                </p>
                <p>
                  <strong className="text-slate-800">
                    You may go shorter, but you have to ask.
                  </strong>{" "}
                  An application to write an asset off faster than the Annexure
                  must be fully motivated and lodged with your SARS branch
                  office <em>before</em> you submit the return that claims it.
                  The environment the asset works in and how hard it is used are
                  the factors SARS will look at.
                </p>
                <p>
                  <strong className="text-slate-800">
                    Cost means cash cost.
                  </strong>{" "}
                  Delivery and the direct cost of installation or erection go
                  in; interest and finance charges stay out; and a VAT vendor
                  who claimed the input tax must strip the VAT out under section
                  23C. Revaluing the asset changes nothing.
                </p>
                <p>
                  <strong className="text-slate-800">
                    Two apportionments, and they stack.
                  </strong>{" "}
                  Part of a year of assessment (paragraph 4.3.8) and part
                  private use (paragraph 4.3.7) are separate reductions, and
                  both apply whichever method you use. Buying a computer in
                  month 10 and using it 60% for work gives you three-twelfths of
                  60% of the annual allowance in year one.
                </p>
                <p>
                  <strong className="text-slate-800">
                    Second-hand does not mean instant.
                  </strong>{" "}
                  SARS is explicit that an asset older than its Annexure period
                  cannot simply be written off in the year you buy it — you
                  write it off over the useful life it has left in your hands.
                </p>
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
