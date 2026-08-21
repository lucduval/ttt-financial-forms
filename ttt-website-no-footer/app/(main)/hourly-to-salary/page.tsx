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
  Clock,
  Info,
  ChevronDown,
  Calendar,
  Wallet,
  HeartPulse,
  Landmark,
  Sun,
  Flag,
  Timer,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Minus,
  Plus,
} from "lucide-react";

// ─── SARS data ───────────────────────────────────────────────────────────────
// The pay side of this calculator is labour law, not tax; the take-home side is
// the ordinary PAYE engine, so it reuses the same brackets, rebates and medical
// scheme fees tax credits as the rest of the suite.

const TAX_DATA: Record<
  string,
  {
    label: string;
    brackets: { limit: number; rate: number; base: number }[];
    rebates: { primary: number; secondary: number; tertiary: number };
    medical: { main: number; firstDep: number; additional: number };
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
    medical: { main: 376, firstDep: 376, additional: 254 },
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
    medical: { main: 364, firstDep: 364, additional: 246 },
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
    medical: { main: 364, firstDep: 364, additional: 246 },
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
    medical: { main: 364, firstDep: 364, additional: 246 },
  },
};

const UIF_CEILING_MONTHLY = 17712;
const UIF_RATE = 0.01;

// ─── Labour law data ─────────────────────────────────────────────────────────
// The national minimum wage is gazetted annually under section 6(5) of the
// National Minimum Wage Act 9 of 2018 and takes effect on 1 March, so each
// rate lines up exactly with a year of assessment. Farm and domestic workers
// are on full parity with the general rate. The BCEA earnings threshold is
// determined separately by the Minister of Employment and Labour and does NOT
// change on 1 March — the effective date is shown next to each figure.
//
// ⚠️ Both numbers are gazetted every year. Re-check them each February/April.

const LABOUR_DATA: Record<
  string,
  {
    nmw: number;
    nmwFrom: string;
    epwp: number;
    threshold: number;
    thresholdFrom: string;
  }
> = {
  "2027": {
    nmw: 30.23,
    nmwFrom: "1 March 2026",
    epwp: 16.62,
    threshold: 269600.9,
    thresholdFrom: "1 May 2026",
  },
  "2026": {
    nmw: 28.79,
    nmwFrom: "1 March 2025",
    epwp: 15.83,
    threshold: 261748.45,
    thresholdFrom: "1 April 2025",
  },
  "2025": {
    nmw: 27.58,
    nmwFrom: "1 March 2024",
    epwp: 15.16,
    threshold: 254371.67,
    thresholdFrom: "1 April 2024",
  },
  "2024": {
    nmw: 25.42,
    nmwFrom: "1 March 2023",
    epwp: 13.97,
    threshold: 241110.59,
    thresholdFrom: "1 March 2023",
  },
};

// Section 9 of the Basic Conditions of Employment Act 75 of 1997.
const MAX_ORDINARY_HOURS_WEEK = 45;
const MAX_ORDINARY_HOURS_DAY_FIVE = 9; // five days a week or fewer
const MAX_ORDINARY_HOURS_DAY_SIX = 8; // more than five days a week

// Section 10: overtime is by agreement, capped at ten hours a week (fifteen
// under a collective agreement, for up to two months in any twelve), and paid
// at one and a half times the normal wage.
const MAX_OVERTIME_HOURS_WEEK = 10;
const MAX_OVERTIME_HOURS_WEEK_COLLECTIVE = 15;
const OVERTIME_MULTIPLIER = 1.5;

// Section 16: double pay for an employee who occasionally works a Sunday, one
// and a half times for one who ordinarily does. Section 18: work on a public
// holiday is paid at double.
const SUNDAY_OCCASIONAL_MULTIPLIER = 2;
const SUNDAY_ORDINARY_MULTIPLIER = 1.5;
const PUBLIC_HOLIDAY_MULTIPLIER = 2;

// Section 35(4): "monthly remuneration or wage is four and one-third times the
// weekly wage" — 52 weeks a year, 4⅓ weeks a month. This is the statutory
// convention, and it is why this page does not use 4,33 or 4,345.
const WEEKS_PER_YEAR = 52;
const WEEKS_PER_MONTH = WEEKS_PER_YEAR / 12; // exactly 4⅓

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

function payeOnAnnual(
  annualGross: number,
  age: number,
  medAidMembers: number,
  taxYear: string
) {
  const { rebates, medical } = TAX_DATA[taxYear];
  let rebate = rebates.primary;
  if (age >= 65) rebate += rebates.secondary;
  if (age >= 75) rebate += rebates.tertiary;
  const afterRebates = Math.max(
    0,
    normalTax(Math.max(0, annualGross), taxYear) - rebate
  );

  let monthlyCredits = 0;
  if (medAidMembers > 0) {
    monthlyCredits += medical.main;
    if (medAidMembers > 1) monthlyCredits += medical.firstDep;
    if (medAidMembers > 2) {
      monthlyCredits += (medAidMembers - 2) * medical.additional;
    }
  }
  const credits = monthlyCredits * 12;
  return { afterRebates, credits, paye: Math.max(0, afterRebates - credits) };
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
  suffix,
  step,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: number;
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
        className={`w-full ${
          suffix ? "pl-4 pr-20" : "pl-8 pr-4"
        } py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] outline-none transition-all font-semibold text-slate-800`}
        placeholder="0"
        min={0}
        step={step}
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

export default function HourlyToSalaryPage({
  noBg,
  noHeader,
}: { noBg?: boolean; noHeader?: boolean } = {}) {
  const [direction, setDirection] = useState<"toSalary" | "toHourly">(
    "toSalary"
  );
  const [taxYear, setTaxYear] = useState("2027");
  const [age, setAge] = useState(35);
  const [medAidMembers, setMedAidMembers] = useState(0);

  const [hourlyRate, setHourlyRate] = useState(65);
  const [monthlySalary, setMonthlySalary] = useState(15000);

  const [ordinaryHours, setOrdinaryHours] = useState(45);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [weeksPerYear, setWeeksPerYear] = useState(WEEKS_PER_YEAR);

  const [overtimeHours, setOvertimeHours] = useState(0);
  const [collectiveAgreement, setCollectiveAgreement] = useState(false);
  const [sundayHours, setSundayHours] = useState(0);
  const [worksSundays, setWorksSundays] = useState(false);
  const [publicHolidayHours, setPublicHolidayHours] = useState(0);

  const labour = LABOUR_DATA[taxYear];

  const results = useMemo(() => {
    // In "salary to hourly" mode the rate is derived from the salary using the
    // section 35(4) convention: monthly wage = 4⅓ × weekly wage, so the
    // ordinary hourly rate is the monthly salary divided by 4⅓ times the
    // ordinary hours worked in a week.
    const derivedRate =
      ordinaryHours > 0 ? monthlySalary / (WEEKS_PER_MONTH * ordinaryHours) : 0;
    const rate = direction === "toSalary" ? hourlyRate : derivedRate;

    const sundayMultiplier = worksSundays
      ? SUNDAY_ORDINARY_MULTIPLIER
      : SUNDAY_OCCASIONAL_MULTIPLIER;

    // In "salary to hourly" mode the salary is the whole story — the extra
    // hours inputs are hidden, so their retained state must not leak into the
    // composition of a gross that is simply the salary times twelve.
    const forward = direction === "toSalary";
    const ordinaryPay = forward
      ? rate * ordinaryHours * weeksPerYear
      : monthlySalary * 12;
    const overtimePay = forward
      ? rate * OVERTIME_MULTIPLIER * overtimeHours * weeksPerYear
      : 0;
    const sundayPay = forward ? rate * sundayMultiplier * sundayHours * 12 : 0;
    const publicHolidayPay = forward
      ? rate * PUBLIC_HOLIDAY_MULTIPLIER * publicHolidayHours
      : 0;

    const annualGross =
      ordinaryPay + overtimePay + sundayPay + publicHolidayPay;
    const monthlyGross = annualGross / 12;
    const weeklyGross = annualGross / weeksPerYear;

    const { afterRebates, credits, paye } = payeOnAnnual(
      annualGross,
      age,
      medAidMembers,
      taxYear
    );
    const uif = Math.min(monthlyGross, UIF_CEILING_MONTHLY) * UIF_RATE * 12;
    const net = annualGross - paye - uif;

    // Compliance tests
    const hoursPerDay = daysPerWeek > 0 ? ordinaryHours / daysPerWeek : 0;
    const maxHoursPerDay =
      daysPerWeek > 5 ? MAX_ORDINARY_HOURS_DAY_SIX : MAX_ORDINARY_HOURS_DAY_FIVE;
    const overtimeCap = collectiveAgreement
      ? MAX_OVERTIME_HOURS_WEEK_COLLECTIVE
      : MAX_OVERTIME_HOURS_WEEK;

    const belowNmw = rate > 0 && rate < labour.nmw;
    const aboveThreshold = annualGross > labour.threshold;
    const breachesWeeklyHours = ordinaryHours > MAX_ORDINARY_HOURS_WEEK;
    const breachesDailyHours = hoursPerDay > maxHoursPerDay + 1e-9;
    const breachesOvertime = overtimeHours > overtimeCap;
    // Section 10(2): an agreement may not require or permit an employee to
    // work more than twelve hours on any day, ordinary plus overtime.
    const totalHoursPerDay =
      daysPerWeek > 0 ? (ordinaryHours + overtimeHours) / daysPerWeek : 0;
    const breachesDailyTotal = totalHoursPerDay > 12 + 1e-9;

    return {
      rate,
      derivedRate,
      sundayMultiplier,
      ordinaryPay,
      overtimePay,
      sundayPay,
      publicHolidayPay,
      annualGross,
      monthlyGross,
      weeklyGross,
      afterRebates,
      credits,
      paye,
      uif,
      net,
      hoursPerDay,
      maxHoursPerDay,
      overtimeCap,
      belowNmw,
      aboveThreshold,
      breachesWeeklyHours,
      breachesDailyHours,
      breachesOvertime,
      breachesDailyTotal,
      overtimeRate: rate * OVERTIME_MULTIPLIER,
      sundayRate: rate * sundayMultiplier,
      publicHolidayRate: rate * PUBLIC_HOLIDAY_MULTIPLIER,
    };
  }, [
    direction,
    hourlyRate,
    monthlySalary,
    ordinaryHours,
    daysPerWeek,
    weeksPerYear,
    overtimeHours,
    collectiveAgreement,
    sundayHours,
    worksSundays,
    publicHolidayHours,
    age,
    medAidMembers,
    taxYear,
    labour,
  ]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });
  const fmt2 = (n: number) =>
    n.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const chartData = [
    { name: "Ordinary", value: results.ordinaryPay, color: "#0077BB" },
    { name: "Overtime", value: results.overtimePay, color: "#E8872E" },
    { name: "Sundays", value: results.sundayPay, color: "#a855f7" },
    {
      name: "Public hols",
      value: results.publicHolidayPay,
      color: "#10b981",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className={noBg ? "bg-white" : "bg-[#F8FAFC]"}>
      {/* Page Hero */}
      {!noHeader && (
        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                South African Pay &amp; Working Hours
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Hourly to Salary Calculator
            </h1>
            <p className="text-blue-100 max-w-2xl text-base">
              Turn an hourly rate into a monthly and annual salary — with
              overtime, Sundays and public holidays at the BCEA rates, a
              national minimum wage check, and what you actually take home
              after PAYE and UIF.
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
                What You Are Paid
              </h2>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {(
                  [
                    { key: "toSalary", label: "Hourly → Salary" },
                    { key: "toHourly", label: "Salary → Hourly" },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDirection(d.key)}
                    className={`py-3 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      direction === d.key
                        ? "bg-[#0077BB] border-[#0077BB] text-white shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {direction === "toSalary" ? (
                <InputGroup
                  label="Hourly Rate"
                  icon={Clock}
                  helpText="What you are paid for each ordinary hour worked. The national minimum wage is set per ordinary hour, so this is the figure it is tested against."
                >
                  <RandInput
                    value={hourlyRate}
                    onChange={setHourlyRate}
                    step={0.01}
                  />
                </InputGroup>
              ) : (
                <InputGroup
                  label="Monthly Salary (gross)"
                  icon={Wallet}
                  helpText="Your gross monthly salary before deductions. Divided by 4⅓ weeks and your ordinary weekly hours to give the implied hourly rate."
                >
                  <RandInput value={monthlySalary} onChange={setMonthlySalary} />
                </InputGroup>
              )}

              <InputGroup
                label="Ordinary Hours a Week"
                icon={Timer}
                helpText="Section 9 of the Basic Conditions of Employment Act caps ordinary hours at 45 a week. Overtime is anything on top of your ordinary hours and is entered separately below."
              >
                <Stepper
                  value={ordinaryHours}
                  onChange={setOrdinaryHours}
                  min={1}
                  max={60}
                  suffix="hours"
                />
              </InputGroup>

              <InputGroup
                label="Days Worked a Week"
                icon={Calendar}
                helpText="Section 9 also caps the day: nine hours if you work five days a week or fewer, eight hours if you work more than five."
              >
                <Stepper
                  value={daysPerWeek}
                  onChange={setDaysPerWeek}
                  min={1}
                  max={7}
                  suffix={daysPerWeek === 1 ? "day" : "days"}
                />
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {results.hoursPerDay.toFixed(1)} hours a day — the section 9
                  limit for {daysPerWeek} day{daysPerWeek === 1 ? "" : "s"} a
                  week is {results.maxHoursPerDay}.
                </p>
              </InputGroup>

              <InputGroup
                label="Paid Weeks a Year"
                icon={Calendar}
                helpText="52 by default, which is the section 35(4) convention — a monthly wage is four and one-third times the weekly wage. Reduce it only if you genuinely have unpaid weeks; BCEA annual leave is paid leave."
              >
                <Stepper
                  value={weeksPerYear}
                  onChange={setWeeksPerYear}
                  min={1}
                  max={52}
                  suffix="weeks"
                />
              </InputGroup>
            </div>

            {direction === "toSalary" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                  Extra Hours
                </h2>

                <InputGroup
                  label="Overtime Hours a Week"
                  icon={Timer}
                  helpText="Overtime is by agreement only, capped at ten hours a week — fifteen under a collective agreement, for up to two months in any twelve — and paid at one and a half times the normal wage."
                >
                  <Stepper
                    value={overtimeHours}
                    onChange={setOvertimeHours}
                    min={0}
                    max={20}
                    suffix="hours"
                  />
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    Paid at R{fmt2(results.overtimeRate)} an hour (1.5×).
                  </p>
                </InputGroup>

                <Toggle
                  checked={collectiveAgreement}
                  onChange={setCollectiveAgreement}
                  label="A collective agreement raises my overtime cap"
                  hint="Section 10(1)(b) allows up to 15 hours a week for a maximum of two months in any period of 12 months."
                />

                <div className="h-px bg-slate-100 my-6" />

                <InputGroup
                  label="Sunday Hours a Month"
                  icon={Sun}
                  helpText="Section 16: an employee who occasionally works a Sunday must be paid double; one who ordinarily works Sundays is paid one and a half times. Paid time off may be agreed instead."
                >
                  <Stepper
                    value={sundayHours}
                    onChange={setSundayHours}
                    min={0}
                    max={60}
                    suffix="hours"
                  />
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    Paid at R{fmt2(results.sundayRate)} an hour (
                    {results.sundayMultiplier}×).
                  </p>
                </InputGroup>

                <Toggle
                  checked={worksSundays}
                  onChange={setWorksSundays}
                  label="I ordinarily work on Sundays"
                  hint="Drops the Sunday rate from double to one and a half times — the Act treats Sunday work as normal for you."
                />

                <div className="h-px bg-slate-100 my-6" />

                <InputGroup
                  label="Public Holiday Hours a Year"
                  icon={Flag}
                  helpText="Section 18: work on a public holiday is by agreement and paid at double. South Africa has 12 public holidays a year, plus any Monday that follows one falling on a Sunday."
                >
                  <Stepper
                    value={publicHolidayHours}
                    onChange={setPublicHolidayHours}
                    min={0}
                    max={120}
                    suffix="hours"
                  />
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    Paid at R{fmt2(results.publicHolidayRate)} an hour (2×).
                  </p>
                </InputGroup>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-1 h-6 bg-[#0077BB] rounded-full mr-3" />
                Your Tax Details
              </h2>

              <InputGroup
                label="Tax Year"
                icon={Calendar}
                helpText="The year of assessment runs 1 March to 28/29 February — which is also when a new national minimum wage takes effect, so the two line up exactly."
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

              <InputGroup
                label="Age"
                icon={Calendar}
                helpText="Your age on the last day of the year of assessment — it sets which rebates you get."
              >
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
                    <span>Under 65</span>
                    <span>65–74</span>
                    <span>75+</span>
                  </div>
                  <input
                    type="range"
                    min={16}
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

              <InputGroup
                label="Medical Scheme Members"
                icon={HeartPulse}
                helpText="You plus your dependants. Each earns a medical scheme fees tax credit that reduces the PAYE withheld."
              >
                <Stepper
                  value={medAidMembers}
                  onChange={setMedAidMembers}
                  min={0}
                  max={12}
                  suffix={medAidMembers === 1 ? "member" : "members"}
                />
              </InputGroup>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#E8872E]/10 border border-[#E8872E]/30 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#E8872E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This calculator provides estimates only and is not legal or tax
                advice. The pay rules come from the Basic Conditions of
                Employment Act 75 of 1997 and the National Minimum Wage Act 9 of
                2018. A <strong>sectoral determination</strong> or bargaining
                council agreement — contract cleaning, wholesale and retail,
                security, farming, hospitality — may set a higher minimum than
                the national one, and learnership allowances are gazetted
                separately; check yours. Night work allowances (section 17),
                averaging and compressed-week arrangements (sections 11 and 12),
                the section 18(3) public holiday rules for employees who work
                fewer hours than usual, leave pay and severance are not modelled
                here. Consult a labour law practitioner or registered tax
                professional for your situation.
              </p>
            </div>
          </div>

          {/* ── Right Column: Results ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero result card */}
            <div
              className={`rounded-2xl shadow-xl text-white p-5 sm:p-8 ${
                results.belowNmw
                  ? "bg-gradient-to-br from-[#E8872E] to-[#b45f16]"
                  : "bg-gradient-to-br from-[#0077BB] to-[#01527e]"
              }`}
            >
              <div className="flex justify-between items-start gap-3 mb-6">
                <div>
                  <p className="font-medium mb-1 text-sm text-blue-100">
                    {direction === "toSalary"
                      ? "Gross Monthly Salary"
                      : "Your Ordinary Hourly Rate"}
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    {direction === "toSalary"
                      ? `R ${fmt(results.monthlyGross)}`
                      : `R ${fmt2(results.rate)}`}
                  </div>
                  <p className="text-sm mt-2 text-blue-100">
                    {results.rate <= 0
                      ? "Enter what you are paid to see the conversion."
                      : direction === "toSalary"
                        ? `R${fmt2(results.rate)} an hour × ${ordinaryHours} hours a week, on the BCEA's 4⅓ weeks a month.`
                        : `R${fmt(
                            monthlySalary
                          )} a month ÷ (4⅓ weeks × ${ordinaryHours} hours).`}
                  </p>
                </div>
                <div className="bg-white/15 p-3 rounded-xl flex-shrink-0">
                  <Clock className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-sm mb-1 text-blue-100">Annual Gross</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(results.annualGross)}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">Weekly Gross</p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(results.weeklyGross)}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1 text-blue-100">
                    Monthly Take-Home
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
                    R {fmt(results.net / 12)}
                  </p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 -mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Calendar size={12} className="text-[#0077BB]" />
                {TAX_DATA[taxYear].label}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs shadow-sm border ${
                  results.belowNmw
                    ? "bg-[#E8872E]/10 border-[#E8872E]/30 text-[#b45f16]"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                {results.belowNmw ? (
                  <AlertTriangle size={12} />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                Minimum wage R{fmt2(labour.nmw)} from {labour.nmwFrom}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 shadow-sm">
                <Scale size={12} className="text-[#0077BB]" />
                4⅓ weeks a month (section 35(4))
              </span>
            </div>

            {/* Minimum wage verdict */}
            <div
              className={`rounded-2xl border p-5 flex gap-3 ${
                results.belowNmw
                  ? "bg-[#E8872E]/10 border-[#E8872E]/30"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              {results.belowNmw ? (
                <AlertTriangle className="w-5 h-5 text-[#E8872E] flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-sm text-slate-700 leading-relaxed">
                {results.belowNmw ? (
                  <>
                    <span className="font-semibold">
                      This rate is below the national minimum wage.
                    </span>{" "}
                    R{fmt2(results.rate)} an hour is R
                    {fmt2(labour.nmw - results.rate)} short of the R
                    {fmt2(labour.nmw)} that has applied since {labour.nmwFrom}.
                    The minimum wage is payable for each ordinary hour worked
                    and cannot be waived by agreement — farm and domestic
                    workers are on full parity with it. Only workers on an
                    expanded public works programme have a lower rate, at R
                    {fmt2(labour.epwp)} an hour.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">
                      This rate meets the national minimum wage.
                    </span>{" "}
                    R{fmt2(results.rate)} an hour is R
                    {fmt2(results.rate - labour.nmw)} above the R
                    {fmt2(labour.nmw)} in force from {labour.nmwFrom}. Note that
                    a sectoral determination or bargaining council agreement for
                    your industry may set a higher floor than the national one.
                  </>
                )}
              </div>
            </div>

            {/* Chart + Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Where the Pay Comes From
                </h3>
                <div className="h-48">
                  {chartData.length > 1 ? (
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
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-sm text-slate-400 px-4">
                      {direction === "toHourly"
                        ? "Switch to Hourly → Salary to split the pay into ordinary, overtime, Sunday and public holiday hours."
                        : results.annualGross > 0
                          ? "All of your pay is ordinary hours. Add overtime, Sunday or public holiday hours to see the split."
                          : "Enter your hourly rate to see the pay split."}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">
                  Detailed Calculation
                </h3>
                <div className="space-y-3">
                  {direction === "toSalary" ? (
                    <>
                      <Row
                        label={`Ordinary pay (${ordinaryHours} h × ${weeksPerYear} wks)`}
                        value={`R ${fmt(results.ordinaryPay)}`}
                      />
                      {results.overtimePay > 0 && (
                        <Row
                          label={`Overtime at 1.5× (${overtimeHours} h/wk)`}
                          value={`R ${fmt(results.overtimePay)}`}
                          accent
                        />
                      )}
                      {results.sundayPay > 0 && (
                        <Row
                          label={`Sundays at ${results.sundayMultiplier}× (${sundayHours} h/mth)`}
                          value={`R ${fmt(results.sundayPay)}`}
                          accent
                        />
                      )}
                      {results.publicHolidayPay > 0 && (
                        <Row
                          label={`Public holidays at 2× (${publicHolidayHours} h/yr)`}
                          value={`R ${fmt(results.publicHolidayPay)}`}
                          accent
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <Row
                        label="Monthly salary"
                        value={`R ${fmt(monthlySalary)}`}
                      />
                      <Row
                        label="Weekly wage (÷ 4⅓)"
                        value={`R ${fmt(monthlySalary / WEEKS_PER_MONTH)}`}
                      />
                      <Row
                        label={`Ordinary hourly rate (÷ ${ordinaryHours} h)`}
                        value={`R ${fmt2(results.rate)}`}
                        accent
                      />
                    </>
                  )}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-800 text-sm">
                      <span>Annual gross</span>
                      <span>R {fmt(results.annualGross)}</span>
                    </div>
                  </div>
                  <Row
                    label="Tax after rebates"
                    value={`R ${fmt(results.afterRebates)}`}
                  />
                  {results.credits > 0 && (
                    <Row
                      label={`Less: medical credits (${medAidMembers} member${
                        medAidMembers === 1 ? "" : "s"
                      })`}
                      value={`− R ${fmt(results.credits)}`}
                      accent
                    />
                  )}
                  <Row label="PAYE" value={`R ${fmt(results.paye)}`} accent />
                  <Row
                    label="UIF (1%, capped)"
                    value={`R ${fmt(results.uif)}`}
                  />
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Annual take-home</span>
                      <span>R {fmt(results.net)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Wallet size={11} />
                    R {fmt(results.net / 12)} a month, R{" "}
                    {fmt(results.net / weeksPerYear)} a week
                  </div>
                </div>
              </div>
            </div>

            {/* Rate card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-slate-800">
                  What Each Hour Is Worth
                </h3>
                <span className="text-xs text-slate-400">
                  BCEA statutory multipliers
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Ordinary",
                    rate: results.rate,
                    note: "1×",
                    color: "text-[#0077BB]",
                  },
                  {
                    label: "Overtime",
                    rate: results.overtimeRate,
                    note: "1.5× · s 10",
                    color: "text-[#E8872E]",
                  },
                  {
                    label: worksSundays ? "Sunday (usual)" : "Sunday",
                    rate: results.sundayRate,
                    note: `${results.sundayMultiplier}× · s 16`,
                    color: "text-purple-600",
                  },
                  {
                    label: "Public holiday",
                    rate: results.publicHolidayRate,
                    note: "2× · s 18",
                    color: "text-emerald-600",
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-3.5"
                  >
                    <p className="text-xs text-slate-500 mb-1">{r.label}</p>
                    <p className={`text-lg font-bold ${r.color}`}>
                      R {fmt2(r.rate)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {r.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance checks */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-slate-800">
                  Working Hours Check
                </h3>
                <span className="text-xs text-slate-400">
                  BCEA sections 9, 10 and 16
                </span>
              </div>
              <div className="space-y-3">
                <CheckRow
                  ok={!results.breachesWeeklyHours}
                  label={`Ordinary hours a week — ${ordinaryHours} of a maximum ${MAX_ORDINARY_HOURS_WEEK}`}
                />
                <CheckRow
                  ok={!results.breachesDailyHours}
                  label={`Ordinary hours a day — ${results.hoursPerDay.toFixed(
                    1
                  )} of a maximum ${results.maxHoursPerDay} for ${daysPerWeek} day${
                    daysPerWeek === 1 ? "" : "s"
                  } a week`}
                />
                {direction === "toSalary" && (
                  <>
                    <CheckRow
                      ok={!results.breachesOvertime}
                      label={`Overtime a week — ${overtimeHours} of a maximum ${results.overtimeCap}${
                        collectiveAgreement
                          ? " under a collective agreement"
                          : ""
                      }`}
                    />
                    <CheckRow
                      ok={!results.breachesDailyTotal}
                      label={`Total hours a day — ${(
                        (ordinaryHours + overtimeHours) /
                        Math.max(1, daysPerWeek)
                      ).toFixed(1)} of a maximum 12 (section 10(2))`}
                    />
                  </>
                )}
                <CheckRow
                  ok={!results.aboveThreshold}
                  label={`BCEA earnings threshold — R${fmt(
                    results.annualGross
                  )} against R${fmt(labour.threshold)} from ${
                    labour.thresholdFrom
                  }`}
                  warnOnly
                />
              </div>
              {results.aboveThreshold && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                  <Scale className="w-4 h-4 text-[#0077BB] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>You earn above the threshold.</strong> Employees
                    earning more than R{fmt(labour.threshold)} a year are
                    excluded from sections 9, 10, 11, 12, 13, 14, 15, 16, 17(2)
                    and 18(3) of the BCEA — so the ordinary hours caps, the
                    statutory overtime rate and the Sunday premium do not apply
                    to you by law. Whatever your contract says on overtime is
                    what governs. The rates above are still shown so you can see
                    what the statutory position would be.
                  </p>
                </div>
              )}
            </div>

            {/* Explainer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">
                How the conversion works
              </h3>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-800">
                    Four and one-third weeks a month — because the Act says so.
                  </strong>{" "}
                  Section 35(4) of the BCEA states that a monthly wage is four
                  and one-third times the weekly wage. That is 52 weeks a year,
                  not 4,33 or 4,345 as some calculators use, and it is why the
                  same hourly rate can give slightly different answers
                  elsewhere. Where the convention matters, this page uses the
                  statutory one.
                </p>
                <p>
                  <strong className="text-slate-800">
                    The minimum wage is per ordinary hour.
                  </strong>{" "}
                  It is not a monthly figure, so someone working short hours can
                  be paid correctly and still earn very little in a month. R
                  {fmt2(labour.nmw)} an hour over a full 45-hour week comes to
                  about R{fmt(labour.nmw * 45 * WEEKS_PER_MONTH)} a month.
                </p>
                <p>
                  <strong className="text-slate-800">
                    Overtime is not automatic.
                  </strong>{" "}
                  Section 10 requires an agreement before you can be asked to
                  work it at all, caps it at ten hours a week, and prices it at
                  one and a half times. An employer may offer paid time off
                  instead of the premium, by agreement.
                </p>
                <p>
                  <strong className="text-slate-800">
                    The threshold switches the rules off.
                  </strong>{" "}
                  The earnings threshold is gazetted separately from the minimum
                  wage and on a different date. Above it, the hours and overtime
                  sections of the BCEA simply do not apply, and your contract
                  takes over.
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
      className={`flex justify-between gap-3 text-sm ${
        accent ? "text-[#0077BB] font-medium" : "text-slate-600"
      }`}
    >
      <span className="min-w-0">{label}</span>
      <span className="text-right whitespace-nowrap">{value}</span>
    </div>
  );
}

function CheckRow({
  ok,
  label,
  warnOnly,
}: {
  ok: boolean;
  label: string;
  warnOnly?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle
          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
            warnOnly ? "text-[#0077BB]" : "text-[#E8872E]"
          }`}
        />
      )}
      <span className={ok ? "text-slate-600" : "text-slate-800 font-medium"}>
        {label}
      </span>
    </div>
  );
}
