# Handoff — Tax Calculator Suite

**Purpose.** This is a *living* continuity doc for building out the TaxTim-style
calculator suite across multiple sessions/context windows. It records the exact
process to follow, the verified SARS data, environment gotchas, and current
status.

> ⚠️ **Standing instruction:** at the END of each phase (after the 3 calculators
> are built + verified), the working session MUST update this document — flip the
> status table, mark hub cards live, record any new SARS data/decisions, and set
> the "Next up" section to the following phase — so the next session can continue
> cleanly. Treat updating this file as part of "done", not optional.

Related docs: [PLAN-tax-calculators.md](PLAN-tax-calculators.md) (full roadmap & rationale).

---

## 1. What we're building

A suite of South African SARS tax calculators, modelled on TaxTim's lineup, each
built the same way as the original PAYE calculator already in the repo. A
`/calculators` hub (card grid) links to each calculator's own page; each
calculator also has an iframe-embeddable version for WordPress.

**Rollout rule:** 3 calculators per phase. Each phase is built, verified 100%
correct, hub cards flipped live, then the client signs off before the next phase.

---

## 2. The exact recipe (repeat this per calculator)

Every calculator is a **self-contained** file (its own copy of `TAX_DATA` and
helper components — this matches the existing pattern; do NOT prematurely
refactor into a shared lib unless a dedicated cleanup phase is agreed).

**Files to create per calculator (slug = kebab-case, e.g. `bonus-tax`):**

1. `app/(main)/<slug>/page.tsx`
   - Starts with `"use client";`
   - Default export: `export default function XxxPage({ noBg, noHeader }: { noBg?: boolean; noHeader?: boolean } = {})`
   - Layout: two-column grid (`lg:grid-cols-12`), inputs on left (`lg:col-span-5`), results on right (`lg:col-span-7`).
   - Contains, copied from an existing calc (e.g. [bonus-tax](../app/(main)/bonus-tax/page.tsx)):
     - `TAX_DATA` object (brackets/rebates/etc for tax years **2024, 2025, 2026, 2027**) — see §4.
     - Calc logic (`useMemo`), `taxAfterRebate` / `calculateAnnualTax` engine as needed.
     - `InputGroup` (label + icon + hover help tooltip).
     - `RandInput` (R-prefixed number field **with the zero-fix**, see §3).
     - `Row` breakdown line helper.
     - Page hero (hidden when `noHeader`), gradient `from-[#0077BB] to-[#0168A2]`.
     - Hero result card, tax-year badge, a Recharts chart (Pie donut or Bar), a
       "Detailed Calculation" card, and an orange disclaimer box.
2. `app/embed/<slug>/page.tsx` — thin wrapper:
   ```tsx
   import type { Metadata } from "next";
   import XxxPage from "@/app/(main)/<slug>/page";
   export const metadata: Metadata = { title: "Xxx Calculator" };
   export default function EmbedXxx() { return <XxxPage noBg noHeader />; }
   ```
3. **Hub:** in [app/(main)/calculators/page.tsx](../app/(main)/calculators/page.tsx),
   find the calculator in the `CATEGORIES` registry, set `live: true` and
   `href: "/<slug>"`. (Not-yet-built calcs render as greyed "Coming soon" cards.)

**Brand tokens (match exactly):**
- Primary blue `#0077BB`; darker blues `#0168A2`, `#01527e`; orange accent `#E8872E` (dark `#b45f16`).
- Positive/refund = emerald (`emerald-600/800`); negative/owing = orange gradient; page bg `#F8FAFC`; neutrals = slate.
- Currency: `n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })`, prefixed `R `.
- Icons: `lucide-react`. Charts: `recharts`. Styling: Tailwind v4.

**Nav:** a single `CALCULATORS` → `/calculators` item in
[app/components/TTTHeader.tsx](../app/components/TTTHeader.tsx). Don't add
per-calculator nav items — the hub is the entry point.

---

## 3. The number-input zero-fix (apply to EVERY numeric input)

Binding a numeric input directly to a number state makes `0` render as a stuck
literal "0" (you get "030" when typing). Fix used in `RandInput` and any inline
number input:

```tsx
value={value === 0 ? "" : value}
onChange={(e) => { const raw = e.target.value; onChange(raw === "" ? 0 : Number(raw)); }}
```

---

## 4. Verified SARS data (single source of truth for the copies)

**Income tax brackets** `{ limit, rate, base }` (upper limit inclusive; last = Infinity):

- **2027** (Mar 2026–Feb 2027): 245100@18% b0 · 383100@26% b44118 · 530200@31% b79998 · 695800@36% b125599 · 887000@39% b185215 · 1878600@41% b259783 · ∞@45% b666339. Rebates 17820/9765/3249.
- **2026** & **2025** (identical): 237100@18% b0 · 370500@26% b42678 · 512800@31% b77362 · 673000@36% b121475 · 857900@39% b179147 · 1817000@41% b251258 · ∞@45% b644489. Rebates 17235/9444/3145.
- **2024**: 226000@18% b0 · 353100@26% b40680 · 488700@31% b73726 · 641400@36% b115763 · 817600@39% b170739 · 1731600@41% b239451 · ∞@45% b614191. Rebates 16425/9000/2997.

**Medical scheme fees tax credits (per month):** 2027 = 376/376/254 (main/first dep/additional). 2024–2026 = 364/364/246.

**Retirement deduction cap:** 27.5% of income, capped at **R350,000/yr** for 2024–2026, **R430,000/yr** for 2027.

**UIF:** 1% employee, monthly earnings ceiling **R17,712**. **SDL:** 1% (employer).

**Capital Gains Tax (individuals):** inclusion rate **40%**; max effective rate **18%** (40%×45%). Annual exclusion **R40,000** (2024–2026) / **R50,000** (2027). Primary-residence exclusion **R2,000,000** (2024–2026) / **R3,000,000** (2027, from 1 Mar 2026). Note SARS states the individual "18%" as the *effective* max rate, not the inclusion rate.

**Retirement fund lump sum tax tables (Phase 2 — verified against SARS, unchanged across 2024–2027; both effective since 1 Mar 2023; cumulative/lifetime basis aggregating all lump sums since 1 Oct 2007):**

- *Retirement / death / severance benefits* (R550,000 tax-free): 0–550000 @ 0% · 550001–770000 @ 18% (base 0, over 550000) · 770001–1155000 @ 27% (base 39600) · 1155001+ @ 36% (base 143550).
- *Withdrawal benefits (pre-retirement)* (R27,500 tax-free): 0–27500 @ 0% · 27501–726000 @ 18% (base 0, over 27500) · 726001–1089000 @ 27% (base 125730) · 1089001+ @ 36% (base 223740).

**Two-Pot (Phase 2 — verified):** savings-component withdrawal is added to taxable income and taxed at the **marginal rate** via a PAYE directive (NOT the withdrawal lump-sum table; no tax-free portion). **Minimum withdrawal R2,000**, one per tax year. Seed at 1 Sep 2024 = 10% of vested value capped at R30,000. SARS offsets outstanding tax debt via IT88L before payout.

**TFSA contribution limits (Phase 4 — verified against SARS):** lifetime **R500,000** (all years). Annual limit **R36,000** for 2024–2026, raised to **R46,000** for **2027** (from 1 Mar 2026, Budget 25 Feb 2026). Over-contribution above the annual/lifetime limit is penalised at **40%** (levied as normal tax). Growth (interest/dividends/CGT) inside the account is tax-free; unused annual room is forfeited (not carried forward).

**Donations tax (Phase 4 — verified against SARS):** **20%** on aggregate donations up to **R30m**, **25%** above R30m; the R30m aggregate runs from **1 Mar 2018** to date. Annual exemption (natural persons) **R100,000** for 2024–2026, raised to **R150,000** for **2027** (from 1 Mar 2026). Donations to a spouse, to approved PBOs, and bona fide maintenance are exempt. Payable by the donor via form IT144 by end of the month following the donation. (Note: non-natural-person exemption rose R10,000 → R20,000 for 2027 — not modelled; calc is for individuals.)

**Rental income tax (Phase 4):** net rental profit (rent less allowable expenses — rates & taxes, levies, bond *interest* only, insurance, agent commission, repairs/maintenance, municipal/garden/security; NOT capital improvements) is added to taxable income and taxed at the **marginal rate** using the §4 brackets/rebates. No new tax table. Where only part of a property is let, expenses are apportioned; a net loss may be ring-fenced by SARS.

**Travel deduction cost scales (Phase 2 — verified per year; bands differ by year — 2024–2026 use R100k increments, 2027 uses R115k increments). Format `{ value-band: fixed R/yr, fuel c/km, maint c/km }`. Prescribed reimbursive rate: 2024 & 2025 = R4.64/km, 2026 = R4.76/km, 2027 = R4.95/km.** Full tables live in [travel-deduction/page.tsx](../app/(main)/travel-deduction/page.tsx) `TRAVEL_DATA`. Deemed-cost formula: rate/km = fixed÷total km + fuel c/km (if employee pays fuel) + maint c/km (if employee pays upkeep), then × business km. Sources: SARS eLogbooks (2023-24, 2024-25, 2025-26) + PAYE-GEN-01-G03-A01 Rate-per-Kilometre Schedule (2027, Rev 19).

**Sources:** [SARS individual rates](https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/) · [SARS CGT](https://www.sars.gov.za/tax-rates/income-tax/capital-gains-tax-cgt/) · [SARS retirement lump sum benefits](https://www.sars.gov.za/tax-rates/income-tax/retirement-lump-sum-benefits/) · [SARS two-pot directive guidance](https://www.sars.gov.za/latest-news/tax-directives-enhancements-and-tax-implications-of-the-two-pot-retirement-system/) · [TaxTim calculators](https://www.taxtim.com/za/calculators/).

**Rule:** before shipping any calculator, verify its specific SARS figures against
SARS / the relevant Budget for all four years. Flag anything you cannot confirm
rather than guessing.

---

## 5. Verification workflow (must pass before a phase is "done")

1. `npx tsc --noEmit -p tsconfig.json` → clean.
2. Start dev: `npm run dev` (background). Then fetch each new route (public +
   embed) and assert HTTP 200 + no "Failed to compile".
3. **Hand-check the math**: reproduce each calculator's default-input result by
   hand from §4, then read the live computed values off the page and compare.
4. Screenshot the embed pages + hub to confirm layout/brand.
5. Flip hub cards live; confirm the hub shows the new count.

**Environment gotchas (sandbox shell):**
- `curl`, `head`, `sed`, etc. may be **absent** (restricted PATH). Use **Node**
  for HTTP: `node -e 'fetch("http://localhost:PORT/route").then(r=>r.text())...'`.
- Dev port drifts (3000 → 3001 → 3002 …). Detect it:
  `grep -oE "localhost:[0-9]+" /tmp/ttt-dev.log | head -1`.
- If dev won't start with a lock error: `pkill -9 -f "next dev"; rm -f .next/dev/lock` then restart.
- To read computed results in-browser use the Playwright MCP `browser_evaluate`
  with `document.body.innerText` (avoid multiline regex — it can blank the page).
- Clean up after: kill the dev server, `rm -rf .playwright-mcp`, delete any
  screenshot PNGs created at repo root.

---

## 6. Status

Legend: ✅ done · 🔨 in progress · ⬜ queued

| Phase | Calculators | Slugs | Status |
|---|---|---|---|
| 0 | PAYE/Salary Tax (pre-existing) · Tax Refund | `tax-calculator`, `tax-refund` | ✅ |
| 1 | Calculators hub · Bonus Tax · Capital Gains Tax | `calculators`, `bonus-tax`, `capital-gains-tax` | ✅ |
| 2 | Retirement Lump Sum · Two-Pot · Travel Deduction | `retirement-lump-sum`, `two-pot`, `travel-deduction` | ✅ |
| 3 | Medical Aid Credits · Tax Bracket · Retrenchment Tax | `medical-aid-credits`, `tax-bracket`, `retrenchment-tax` | ✅ |
| 4 | Rental Income Tax · TFSA · Donations Tax | `rental-income-tax`, `tfsa`, `donations-tax` | ✅ |
| 5 | UIF · Crypto Tax · Company Car | `uif`, `crypto-tax`, `company-car` | ⬜ **NEXT** |
| 6 | Provisional Tax · Provisional Taxpayer Check · Home Office | — | ⬜ |
| 7 | VAT · Small Business Income Tax · Payroll Tax | — | ⬜ |
| 8 | Taxable Local Interest · Foreign Dividends · Retirement Savings | — | ⬜ |
| 9 | Wear & Tear · Net-to-Gross · Hourly-to-Salary | — | ⬜ |
| 10 | Company-specialist allowances + Tools/trackers | — | ⬜ |

**Live now (13):** `/tax-calculator`, `/tax-refund`, `/bonus-tax`, `/capital-gains-tax`, `/retirement-lump-sum`, `/two-pot`, `/travel-deduction`, `/medical-aid-credits`, `/tax-bracket`, `/retrenchment-tax`, `/rental-income-tax`, `/tfsa`, `/donations-tax` (each with an `/embed/...` twin). Hub at `/calculators` (+ `/embed/calculators`) — shows "13 of 29 calculators".

---

## 7. Next up — Phase 5

Build `uif`, `crypto-tax`, `company-car` following §2, then run §5, then update THIS doc.

**Data to verify first (do not guess):**
- **UIF Calculator** — 1% employee contribution, matched by 1% employer (2% total), on remuneration up to the monthly earnings ceiling of **R17,712** (so the max monthly employee contribution is R177.12). Confirm the ceiling is unchanged for 2027 (it was last raised 1 Jun 2021). Optionally show the UIF *benefit* side (IUF pays a sliding 38–60% replacement rate for up to 365 days) — but scope with client; the core calc is the contribution.
- **Crypto Tax** — SARS treats crypto disposals as either capital (CGT — reuse the §4 CGT engine: 40% inclusion, annual exclusion R40k/R50k, max effective 18%) or revenue (traded → marginal rate) depending on intention. Build a toggle for capital vs revenue treatment; reuse the existing `capital-gains-tax` and marginal-rate logic. No genuinely new tables — confirm the intention test framing in current SARS guidance.
- **Company Car (fringe benefit)** — right-of-use of an employer-provided vehicle is taxed as a fringe benefit at **3.5% of determined value per month** (or **3.25%** if a maintenance plan was included at purchase). PAYE is on **80%** of the fringe-benefit value (reduced to **20%** if ≥80% business use). Reductions available for business km, and for private fuel/maintenance borne by the employee (per the SARS-prescribed cost tables). Verify the 3.5%/3.25% rates, the 80%/20% inclusion, and how business-km reductions are computed on assessment.

**Open questions carried over (confirm with client if unanswered):**
1. Hub label for the existing PAYE calc — currently "PAYE / Salary Tax". Keep, or rename?
2. CGT scope — kept to individuals; capital losses carried forward and year-of-death exclusion intentionally omitted (noted in disclaimer). Add later?
3. Retirement Lump Sum / Retrenchment share the same SARS retirement benefits table — built as distinct pages (Retrenchment adds a marginal-rate leg for notice/leave/bonus pay, so it is genuinely more than a preset). Fine as-is unless client prefers consolidation.
4. Medical Aid Credits AMTC — s6B percentages (25%/33.3%, 4×/3× MTC, 7.5% threshold) are long-standing and treated as stable across 2024–2027. Re-confirm if a future Budget changes them.

---

## 8. Change log

- **Phase 0–1 (earlier session):** Established the pattern; built the hub, Tax
  Refund, Bonus Tax, Capital Gains Tax; added 2027 tax year + the zero-input fix;
  consolidated nav to a single CALCULATORS link. All verified (tsc clean, routes
  200, math hand-checked live).
- **Phase 2 (this session):** Built `retirement-lump-sum`, `two-pot`,
  `travel-deduction` (+ `/embed/` twins) following §2; flipped the 3 hub cards
  live (hub now "7 of 29"). Verified all SARS data via web research against
  official SARS sources (both lump-sum tables, two-pot marginal treatment, and
  the full travel cost scales for 2024–2027) — recorded in §4. All verified:
  tsc clean; all routes 200; math hand-checked live against SARS for every
  calc, both retirement/withdrawal tables, and the deemed-vs-actual travel
  method comparison; layout/brand screenshots reviewed. New patterns introduced
  this phase: a generic `taxFromTable()` for non-rebate lump-sum tables; a
  benefit-type toggle; a Recharts **bar chart** (vs the usual pie) for the
  travel method comparison; a `RandInput` `suffix` prop for km fields; and a
  marginal-rate `<select>` (travel calc shows tax saving = deduction × marginal
  rate rather than requiring full income input).
- **Phase 3 (this session):** Built `medical-aid-credits`, `tax-bracket`,
  `retrenchment-tax` (+ `/embed/` twins) following §2; flipped the 3 hub cards
  live (hub now "10 of 29"). All verified: tsc clean; all 6 new routes + hub
  return 200 with no compile errors; math hand-checked against §4 for each
  calc's default inputs (Medical: MTC R12,072 + AMTC R1,116 = R13,188; Tax
  Bracket: 31% marginal / 18.4% avg / R82,917 tax on R450k @ age 30; Retrench:
  R9,000 severance-table tax + R24,800 marginal on R80k = R33,800). New patterns
  this phase: a `Stepper` component (+/- counter for dependant count, not a rand
  field); a `disability` boolean toggle; a **bracket-table visual** in tax-bracket
  that highlights the active SARS bracket; a two-legged tax model in retrenchment
  (severance on the R550k `taxFromTable` table + notice/leave/bonus at a marginal
  `<select>`); and an empty-state guard on the pie when no credit/tax is due.
  Medical AMTC uses the stable s6B rules from §4 (25%/33.3%, 4x/3x MTC, 7.5%
  threshold) — no web re-verification needed.
- **Phase 4 (this session):** Built `rental-income-tax`, `tfsa`, `donations-tax`
  (+ `/embed/` twins) following §2; flipped the 3 hub cards live (hub now "13 of
  29"). **Web-verified against SARS — and caught two 2027 Budget changes the doc
  had stale:** TFSA annual limit rose **R36,000 → R46,000** for 2027 (from 1 Mar
  2026), and the donations-tax individual annual exemption rose **R100,000 →
  R150,000** for 2027. Both now recorded per-year in §4. Rental confirmed as a
  pure marginal-rate calc off the §4 brackets (no new table). All verified: tsc
  clean; all 6 new routes + hub return 200 with no compile errors; math
  hand-checked against §4 for each calc's defaults (Rental: R10,800 net profit ×
  31% marginal = R3,348 tax → R7,452 after tax; Donations: (R500k − R150k
  exemption) × 20% = R70,000, effective 14.0%; TFSA: R36k/yr @ 9% for 20yrs caps
  at the R500k lifetime limit in year 14 → TFSA R1,704,995 vs taxable R1,164,469
  = R540,526 tax saved). New patterns this phase: an itemised allowable-expense
  block that annualises via a monthly/yearly period toggle and a differential
  (with-vs-without) marginal-tax method for rental; a year-over-year compounding
  loop with a lifetime-cap guard + over-limit warning banner for TFSA; and an
  aggregate-threshold band split (20% up to R30m / 25% above, running from 1 Mar
  2018) with a spouse/PBO exempt toggle for donations. Note: no Playwright
  screenshots this session (MCP unavailable) — verified layout via SSR HTML +
  the shared, unchanged calc component pattern instead. _(Next session: append
  your phase here.)_
