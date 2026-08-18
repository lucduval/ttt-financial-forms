# Plan — SARS Tax Calculator Suite (TaxTim-style)

**Goal:** Expand the site from one PAYE calculator into a suite of South African tax
calculators, each built in the exact same fashion as the existing
[`tax-calculator`](../app/(main)/tax-calculator/page.tsx) — public route + iframe
embed wrapper, SARS-accurate SA data, `R` / `en-ZA` formatting, brand colours
(`#0077BB` blue, `#E8872E` orange), Recharts + lucide + Tailwind.

**Model:** TaxTim's calculator lineup (https://www.taxtim.com/za/calculators/).

**Decisions locked in with the client (Luc):**
- Scope: **build the entire TaxTim lineup**, individuals-first ordering. Pure conversions (Net-to-Gross, Hourly-to-Salary) and company-specialist allowances come last.
- Rollout: **phases of 3 calculators at a time.** Each phase must be verified 100% correct (data + UX) before the next phase starts.
- Hub UX: **card hub → separate pages.** `/calculators` shows a card grid; each card opens that calculator's own route (e.g. `/bonus-tax`). Every calculator is individually embeddable too.
- Support tax years **2024 → 2027** everywhere, including back-fitting **2027 (Mar 2026 – Feb 2027)** to the existing PAYE calculator.

## Phased roadmap (3 at a time)

Status: ✅ done · 🔨 in progress · ⬜ queued

| Phase | Calculators | Status |
|---|---|---|
| 0 | Salary/PAYE (existing) · Tax Refund | ✅ |
| 1 | **Calculators hub** · Bonus Tax · Capital Gains Tax | 🔨 |
| 2 | Retirement Lump Sum · Two-Pot · Travel Deduction | ⬜ |
| 3 | Medical Aid Credits · Tax Bracket · Retrenchment Tax | ⬜ |
| 4 | Rental Income Tax · TFSA · Donations Tax | ⬜ |
| 5 | UIF · Crypto Tax · Company Car | ⬜ |
| 6 | Provisional Tax · Provisional Taxpayer Check · Home Office | ⬜ |
| 7 | VAT · Small Business Income Tax · Payroll Tax | ⬜ |
| 8 | Taxable Local Interest · Foreign Dividends · Retirement Savings | ⬜ |
| 9 | Wear & Tear · Net-to-Gross · Hourly-to-Salary | ⬜ |
| 10 | Company-specialist allowances (s12C, SBC, s11(f), 11(g)) + Tools/trackers | ⬜ |

Each phase: build 3 → verify (tsc, dev server, route render, hand-checked math against SARS) → flip hub cards live → client sign-off → next phase.

---

## 1. Target calculator set

Priority tiers. **Pilot** = the first 3 (chosen to stress the template across three
different shapes: reuses-PAYE-logic, novel-tax-logic, simple-utility).

| # | Calculator | Route slug | Shape / core logic | Tier |
|---|---|---|---|---|
| 1 | **Bonus / 13th-cheque tax** | `bonus-tax` | Reuses PAYE bracket engine (tax-on-annual-incl-bonus minus tax-on-annual-excl-bonus) | **Pilot** |
| 2 | **Capital Gains Tax** | `capital-gains-tax` | Proceeds − base cost → gain, less annual exclusion, × 40% inclusion, taxed at marginal rate | **Pilot** |
| 3 | **VAT (add / remove 15%)** | `vat` | Simple utility; add or extract 15% | **Pilot** |
| 4 | Retirement lump sum | `retirement-lump-sum` | SARS retirement/withdrawal lump-sum tax tables | 2 |
| 5 | Two-Pot withdrawal | `two-pot` | Savings-pot withdrawal taxed at marginal rate + illustration | 2 |
| 6 | Provisional tax (IRP6) | `provisional-tax` | Estimated taxable income → two payments | 2 |
| 7 | Travel allowance / claim | `travel-allowance` | SARS cost tables vs actual-cost method | 2 |
| 8 | Retrenchment / severance | `retrenchment-tax` | Severance lump-sum tax table (R550k tax-free) | 2 |
| 9 | Medical aid tax credits | `medical-aid-credits` | MTC + additional medical expense credit | 3 |
| 10 | TFSA benefit | `tfsa` | Tax-free vs taxable growth comparison | 3 |
| 11 | Rental income tax | `rental-income-tax` | Rental − allowable expenses → taxed at marginal | 3 |
| 12 | Company car fringe benefit | `company-car` | 3.5%/3.25% of determined value fringe benefit | 3 |
| 13 | Small Business Corp income tax | `sbc-income-tax` | SBC graduated company tax table | 3 |
| 14 | Transfer duty | `transfer-duty` | Property purchase price → SARS transfer-duty table | 3 |
| _opt_ | Net-to-Gross | `net-to-gross` | Inverse PAYE solve | opt |
| _opt_ | Hourly-to-Salary | `hourly-to-salary` | Rate conversion | opt |

Final pilot picks recommended: **Bonus tax, Capital Gains Tax, VAT.** (Easy to swap
before we start — e.g. Provisional tax instead of VAT if the business audience matters more.)

---

## 2. Architecture — build it once, reuse everywhere

The existing calculator is one self-contained file with inline data + inline helper
components. Before adding 10+ more, we extract the shared parts so every calculator
looks identical and the SARS numbers live in one place.

### 2a. Shared SARS data module — `app/lib/tax-data.ts`
Single source of truth, extracted from the inline `TAX_DATA` in the current calc and
extended:
- Income tax brackets, rebates, medical credits, UIF ceiling, SDL — for **2024–2027**.
- Retirement + withdrawal lump-sum tables; severance/retrenchment table.
- CGT: inclusion rate (individuals 40%), annual exclusion, primary-residence exclusion.
- Transfer-duty table; VAT rate; SBC company-tax table; interest exemptions.
- Typed and versioned by tax year so every calculator reads the same figures.

### 2b. Shared UI kit — `app/components/calculators/`
Extract the pieces already proven in the current calc so all calculators share one look:
- `InputGroup`, `Row`, `SlipItem` (currently inline)
- `CalcInput` (R-prefixed number field), `TaxYearSelect`, `PeriodToggle`
- `ResultHeroCard`, `DisclaimerBox`, `fmtZAR()` helper
- Optional `<CalculatorShell noBg noHeader hero={...}>` layout wrapper so each page is
  mostly logic + inputs + result, not layout boilerplate.

### 2c. Per-calculator files (matches existing pattern exactly)
For each calculator:
- `app/(main)/<slug>/page.tsx` — component exporting `({ noBg, noHeader })`, default page.
- `app/embed/<slug>/page.tsx` — thin wrapper: `<Calc noBg noHeader />` + `metadata.title`.

### 2d. Hub page
- `app/(main)/calculators/page.tsx` — card grid of all calculators (icon, name, blurb,
  link), grouped by pack, hero header. Mirror TaxTim's index.
- `app/embed/calculators/page.tsx` — embed variant.

### 2e. Retro-fit existing PAYE calc
- Point it at `app/lib/tax-data.ts`, add the **2027** year to its selector, swap its
  inline helpers for the shared UI kit. No behaviour change, just consolidation.

---

## 3. Data accuracy (must-do before shipping each calc)

Calculators are only as good as their SARS numbers, so each one gets its figures
**verified against SARS / the relevant Budget** before it ships:
- 2027 tax-year brackets & rebates (Feb 2026 Budget) — **confirm**.
- VAT rate = 15% — **confirm** (the 2025 proposed increase was reversed; keep 15% unless told otherwise).
- CGT inclusion rate, annual & primary-residence exclusions — confirm current values.
- Lump-sum / severance / transfer-duty / SBC tables — confirm current values.
- Every calculator keeps the existing **"estimate only, not tax advice"** disclaimer.

Where a figure can't be confirmed with confidence, I'll flag it for your sign-off
rather than guess.

---

## 4. Sequence of work

1. **Foundation** — extract `tax-data.ts` + `components/calculators/` kit from the
   current calc; add 2027; retro-fit the PAYE calc. (No new calc yet — proves the
   refactor is invisible.)
2. **Pilot** — build Bonus tax, CGT, VAT (route + embed each). Review with you for
   look, feel, and number accuracy.
3. **Sign-off gate** — you approve the template + accuracy.
4. **Mass-produce** — Tier 2 then Tier 3 calculators against the approved template.
5. **Hub** — build `/calculators` index + embed once the set is stable.
6. **Embed handover** — document each embed URL for the WordPress iframe embedding
   (same mechanism as the current calculator).

---

## 5. Open questions for you

1. **Pilot picks** — happy with Bonus tax + CGT + VAT, or swap one (e.g. Provisional tax)?
2. **Business calculators** — is the audience mainly individuals, or do we prioritise the
   business set (VAT, Provisional, SBC, Payroll) higher?
3. **Optional utilities** — include Net-to-Gross & Hourly-to-Salary, or leave them out?
4. **Hub navigation** — should the hub also be linked from the site's main nav, or is it
   embed-only into WordPress like the current calculator?
