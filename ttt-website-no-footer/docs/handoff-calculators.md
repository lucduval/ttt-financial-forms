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

**UIF (Phase 5 — verified against SARS + the UI Act, unchanged 2024–2027):**

- **Contributions** (Unemployment Insurance Contributions Act, 2002): **1% employee + 1% employer = 2%**, on remuneration up to a ceiling of **R17,712 per month / R212,544 per year** — so the maximum is **R177.12 p/m each side, R354.24 total**. Ceiling effective **1 June 2021** (Government Gazette 44641 of 28 May 2021), confirmed unchanged for 2027. **SDL:** 1% (employer) — separate levy, not modelled here.
- **Benefit side** (Unemployment Insurance Act 63 of 2001) — the **Income Replacement Rate (IRR)** slides from an upper rate of **60%** at zero income to a lower rate of **38%** at the "benefit transition income level", which is currently the *same* R17,712. Schedule 2 formula, coded literally so it can be audited:
  `IRR = LRR + (URR − LRR) / ((2 + 5·Y/Y_LRR)·(1/2 − 1/7)) − (URR − LRR) / (7/2 − 1)`
  which reduces to `IRR = 0.292 + 0.616 / (2 + 5·Y/17712)` at the current URR/LRR. Cross-checked to 4 d.p. against the widely-published *daily* form `IRR = 29.2 + 7173.92/(232.92 + daily income)`. Max monthly benefit = 38% × R17,712 = **R6,730.56**.
- **Daily rate of remuneration** = capped monthly × 12 ÷ 365. **Daily benefit** = IRR × daily rate.
- **Credit days:** 1 day's credit per **4 days** contributed (s13(3)), capped at **365 days** in the 4 years preceding the claim (s13(3)(a)) — the cap is reached at exactly 48 months. The first **238** credit days pay at the sliding IRR; any remaining credits pay a **flat 20%** of remuneration (s12(3)(d)).
- Out of scope / noted in the disclaimer: illness, maternity (flat 66%, s12(3)(c)), parental and dependant's benefits use different rates and durations.

**Capital Gains Tax (individuals):** inclusion rate **40%**; max effective rate **18%** (40%×45%). Annual exclusion **R40,000** (2024–2026) / **R50,000** (2027). Primary-residence exclusion **R2,000,000** (2024–2026) / **R3,000,000** (2027, from 1 Mar 2026). Note SARS states the individual "18%" as the *effective* max rate, not the inclusion rate.

**Retirement fund lump sum tax tables (Phase 2 — verified against SARS, unchanged across 2024–2027; both effective since 1 Mar 2023; cumulative/lifetime basis aggregating all lump sums since 1 Oct 2007):**

- *Retirement / death / severance benefits* (R550,000 tax-free): 0–550000 @ 0% · 550001–770000 @ 18% (base 0, over 550000) · 770001–1155000 @ 27% (base 39600) · 1155001+ @ 36% (base 143550).
- *Withdrawal benefits (pre-retirement)* (R27,500 tax-free): 0–27500 @ 0% · 27501–726000 @ 18% (base 0, over 27500) · 726001–1089000 @ 27% (base 125730) · 1089001+ @ 36% (base 223740).

**Two-Pot (Phase 2 — verified):** savings-component withdrawal is added to taxable income and taxed at the **marginal rate** via a PAYE directive (NOT the withdrawal lump-sum table; no tax-free portion). **Minimum withdrawal R2,000**, one per tax year. Seed at 1 Sep 2024 = 10% of vested value capped at R30,000. SARS offsets outstanding tax debt via IT88L before payout.

**TFSA contribution limits (Phase 4 — verified against SARS):** lifetime **R500,000** (all years). Annual limit **R36,000** for 2024–2026, raised to **R46,000** for **2027** (from 1 Mar 2026, Budget 25 Feb 2026). Over-contribution above the annual/lifetime limit is penalised at **40%** (levied as normal tax). Growth (interest/dividends/CGT) inside the account is tax-free; unused annual room is forfeited (not carried forward).

**Donations tax (Phase 4 — verified against SARS):** **20%** on aggregate donations up to **R30m**, **25%** above R30m; the R30m aggregate runs from **1 Mar 2018** to date. Annual exemption (natural persons) **R100,000** for 2024–2026, raised to **R150,000** for **2027** (from 1 Mar 2026). Donations to a spouse, to approved PBOs, and bona fide maintenance are exempt. Payable by the donor via form IT144 by end of the month following the donation. (Note: non-natural-person exemption rose R10,000 → R20,000 for 2027 — not modelled; calc is for individuals.)

**Rental income tax (Phase 4):** net rental profit (rent less allowable expenses — rates & taxes, levies, bond *interest* only, insurance, agent commission, repairs/maintenance, municipal/garden/security; NOT capital improvements) is added to taxable income and taxed at the **marginal rate** using the §4 brackets/rebates. No new tax table. Where only part of a property is let, expenses are apportioned; a net loss may be ring-fenced by SARS.

**Travel deduction cost scales (Phase 2 — verified per year; bands differ by year — 2024–2026 use R100k increments, 2027 uses R115k increments). Format `{ value-band: fixed R/yr, fuel c/km, maint c/km }`. Prescribed reimbursive rate: 2024 & 2025 = R4.64/km, 2026 = R4.76/km, 2027 = R4.95/km.** Full tables live in [travel-deduction/page.tsx](../app/(main)/travel-deduction/page.tsx) `TRAVEL_DATA`. Deemed-cost formula: rate/km = fixed÷total km + fuel c/km (if employee pays fuel) + maint c/km (if employee pays upkeep), then × business km. Sources: SARS eLogbooks (2023-24, 2024-25, 2025-26) + PAYE-GEN-01-G03-A01 Rate-per-Kilometre Schedule (2027, Rev 19).

**Company car / right of use of an employer-provided vehicle (Phase 5 — verified against SARS Interpretation Note 72 + PAYE-GEN-01-G02, unchanged across 2024–2027):**

- Value of private use per month = **3.5%** of determined value, or **3.25%** where a maintenance plan was **included in the purchase price at the time of purchase** (a top-up plan added later does NOT qualify). Effective since 1 Mar 2013.
- **Determined value** = retail market value **including VAT** (from 1 Mar 2018), excluding finance charges, interest and insurance. Cash value where held under an instalment credit agreement.
- **Depreciation:** where the employer held the vehicle (or its right of use) 12 months or more before granting the employee use, the determined value is reduced **15% per completed 12 months on the reducing-balance method** (e.g. R400k → R340k → R289k).
- **PAYE:** the employer includes **80%** of the monthly cash equivalent in remuneration, reduced to **20%** where the employer is satisfied at least **80% of the year's use will be for business** (Fourth Schedule "remuneration").
- **Reductions on assessment** (logbook compulsory; applied by SARS on the ITR12, never by payroll) — per IN72:
  - business use (para 7(7)) = annual value × **business km / total km**
  - licence / insurance / maintenance (para 7(8)) = **actual cost × private km / total km**, only where the employee bore **100%** of that cost with no reimbursement. Maintenance is **not claimable** where the car is under a maintenance plan.
  - private fuel = **private km × the Gazetted deemed fuel rate (c/km)** for the vehicle's determined-value band — i.e. the *fuel column* of the same travel-allowance cost-scale table in [travel-deduction/page.tsx](../app/(main)/travel-deduction/page.tsx). Not actual fuel slips.
  - then less any **consideration** paid to the employer for the use of the car (excluding amounts paid for licence/insurance/maintenance/fuel).
  - Reductions cannot create a loss — the benefit floors at nil.
- **More than one vehicle** used primarily for business: value = the vehicle with the **highest value of private use**. **No value** for pool/emergency vehicles (available to employees generally, private use incidental, not kept at the residence). Operating-lease vehicles are valued at actual lease cost + fuel and get **no** para 7(8) reductions — all three cases out of scope, noted in the disclaimer.
- IN72 **Example 10 is reproduced to the rand** by the calculator (see change log).

**Crypto assets (Phase 5 — verified against the SARS *Draft Guide to the Taxation of Crypto Assets*, draft 2026-29, issued 1 July 2026, public comment closed 31 Aug 2026; plus the *ABC of Capital Gains Tax for Individuals*). No new tax tables — crypto reuses the §4 brackets and CGT parameters. The rules that matter:**

- A crypto asset is a **"financial instrument"** [s 1(1)] and is therefore **excluded from "personal-use asset"** [para 53(3)(e)] — there is no personal-use let-off; CGT applies to private holdings.
- Each disposal is **capital or revenue in nature** on its own facts. Capital → Eighth Schedule (40% inclusion, annual exclusion, max **18%** effective for individuals). Revenue → the whole profit falls into gross income at the **marginal rate (18%–45%)**, with the cost deductible under **s 11(a)/s 22**. (The guide quotes CGT's effective range as "18% to 36%" — that spans all taxpayer types; **18% is the individual ceiling**, 36% is trusts.)
- **The five factors** SARS weighs (para 3.2.4, none decisive alone, considered in aggregate): the taxpayer's *ipse dixit* on why it was acquired/disposed of; conduct and activities; nature of business/occupation; frequency of similar transactions; length of time held vs anticipated at acquisition. Plus "no or low return on investment" as an indicator of resale intent.
- **No three-year rule.** s 9C applies only to equity shares and CIS participatory interests — explicitly **not** to crypto. A 5-year hold can still be revenue (guide Example 4).
- **Every swap is a disposal.** Crypto-to-crypto is a barter transaction; the tax event is **at the swap, at market value**, not deferred to the fiat cash-out. Same for paying for goods/services in crypto. Own-wallet transfers depend on the facts.
- **Mining and staking rewards** are revenue in nature — market value included in **gross income when received/accrued** (when it lands in the wallet), before anything is sold. Airdrops: revenue if "designedly sought and worked for", potentially capital if genuinely fortuitous. Hard forks are **not** a disposal of the original.
- **Base cost** for identical capital holdings [para 32(2)]: **specific identification or FIFO only**. The **weighted-average method is NOT available**, because crypto exchanges are not "recognised exchanges". Trading stock goes into closing stock **at cost** (s 22(1)(a)), never written down; **LIFO prohibited** (s 22(5)); s 22(4) deems market value where acquired for no consideration.
- **Losses.** A net capital loss **must also be reduced by the annual exclusion** (confirmed verbatim in the ABC of CGT for Individuals: *"A net loss that results after adding together the capital gains and capital losses ... must also be reduced by the annual exclusion"*); any unused balance is forfeited, and the assessed capital loss is ring-fenced to future capital gains only. A **revenue** loss reduces taxable income, but **s 20A(2)(b)(ix) lists "the acquisition or disposal of any crypto asset"** as a ring-fenced trade — the s 20A gate requires the taxpayer to be at the **top marginal rate**, after which the loss shelters only future crypto trading income.
- **Para 42 wash-sale rule** applies: a capital loss on a financial instrument is denied (proceeds deemed = base cost) if an identical instrument is reacquired within **45 days** before or after the sale. Out of scope in the calculator, noted in the disclaimer.
- Also out of scope / in the disclaimer: **VAT** (the guide expressly excludes it), donations tax, crypto arbitrage, De-Fi, employment paid in crypto, and the Fourth Schedule. **CARF** reporting starts 1 Mar 2026 (context only, not a calculation input).

**Provisional tax (Phase 6 — verified against the SARS *Guide for Provisional Tax* GEN-PT-01-G01, **Revision 28, effective 29 June 2026**, which is the 2027-year edition; paragraph references are to the Fourth Schedule):**

- **Who is a provisional taxpayer (para 1):** a person other than a company earning income that is *not* remuneration/an allowance per s 8(1), or remuneration from an employer **not registered** for employees' tax; **any company**; a person **notified** by the Commissioner; a **labour broker** with a para 2(5)(a) exemption certificate.
- **Specifically excluded:** approved PBOs; approved recreational clubs; body corporates, share block companies and s 10(1)(e) associations; **any natural person who derives no income from carrying on a business** if either (A) taxable income does not exceed the **tax threshold**, or (B) taxable income from **interest, dividends, foreign dividends, rental from letting fixed property and remuneration from an unregistered employer does not exceed R30 000**; non-resident ship/aircraft owners taxed under s 33; small business funding entities; **deceased estates**. Both carve-outs are closed the moment there is *any* business income.
- **Directors of private companies and members of CCs are NOT automatically provisional taxpayers** unless they have other business income (guide §4). Older secondary sources say the opposite — do not propagate that.
- **Tax thresholds** are simply `total rebate ÷ 18%`, so the calculators derive them rather than hard-coding: 2027 = **R99 000 / R153 250 / R171 300** (under 65 / 65+ / 75+); 2025–2026 = R95 750 / R148 217 / R165 689; 2024 = R91 250 / R141 250 / R157 900. All cross-checked against the SARS rates page.
- **Due dates:** 1st period = within **6 months** of the start of the year (31 Aug for a Feb year-end); 2nd period = **last day** of the year of assessment; voluntary 3rd "top-up" = the **effective date**, which for a Feb year-end is **7 months** after year-end (30 September).
- **First period calc:** taxable income → normal tax → less s 6 rebates → less s 6A MTC → less s 6B AMTC = *Total Tax Payable*; **then halve**; **then** less employees' tax for the **first six months** and s 6quat credits. (Order matters — the halving happens before the PAYE deduction, and the *full* first-period PAYE is deducted, not half of it.)
- **Second period calc:** full-year Total Tax Payable (also less s 6C solar credit) → less employees' tax **for the year** → less the first payment actually paid → less s 6quat.
- **Basic amount (para 19):** taxable income per the **latest preceding assessment**, *less* any taxable capital gain, *less* the taxable portion of any retirement fund lump sum / withdrawal / severance benefit, *less* para (d) "gross income" amounts. The assessment must have been issued **not less than 14 calendar days** before the IRP6 is submitted, otherwise the year before it is used.
- **8% escalation:** applied where the estimate is made **more than 18 months after the end** of the latest preceding year of assessment. It is **simple, not compounded** — the guide's Example 3 computes `R195 000 + (R195 000 × 8% × 4) = R257 400`. Much secondary commentary compounds it; do not.
- **Para 20 under-estimation penalty = 20%**, switching on **actual taxable income** at the **R1 million** line:
  - **≤ R1m:** a penalty arises only where the estimate is **both** less than 90% of actual taxable income **and** less than the basic amount — so estimating at or above the basic amount is a **safe harbour**. Penalty = 20% × [ **lesser** of (tax on 90% of actual) and (tax on the basic amount), both after rebates − (employees' tax + provisional tax paid) ].
  - **> R1m:** **no basic-amount safe harbour.** Penalty = 20% × [ tax on **80%** of actual taxable income after rebates − (employees' tax + provisional tax paid) ].
  - Reduced by any **para 27** penalty already levied (para 20(2B)). Lump sums and severance benefits are excluded from the penalty base. Failing to file the 2nd IRP6 is treated as **estimating nil** unless filed within **four months** after year-end. SARS may remit where there was no intent to evade or postpone.
  - ⚠️ The guide's own worked example contains a **typo** — it computes tax on 90% as **R51 408** and then writes "R52 408 less R38 408 = R13 000". R51 408 is the correct figure; the arithmetic confirms it.
- **Para 27 late-payment penalty = 10%** on late payment of the 1st and 2nd periods. **Para 20A** (failure to submit) was **deleted** for years commencing on/after 1 Mar 2015.
- **Interest:** **s 89bis** at the prescribed rate on late payments; **s 89quat(2)** on underpayment from the day after the **effective date**, and only where taxable income exceeds **R50 000** (individuals/trusts) or **R20 000** (companies). Prescribed rate **from 1 Dec 2025 = 10.25% p.a.** (guide §13; rates change by Gazette). Interest on underpayment is **not tax-deductible**.
- Trusts are taxed at a flat **45%** (special trusts on the natural-person scale) and get **no rebates** — out of scope for the calculator, which covers individuals.

**Home office (Phase 6 — verified against SARS *Interpretation Note 28 (Issue 3)*, 4 March 2022; ss 11(a), 11(d), 23(b), 23(m)):**

- **s 23(b) is all-or-nothing.** The part of the premises must be (i) occupied for purposes of trade, (ii) **specifically equipped** for that trade, and (iii) **regularly and exclusively** used for it. IN 28 is explicit: *"There is no exclusion from 'exclusively used' in section 23(b) for incidental private use."*
- **Proviso (b) to s 23(b)** — where the trade is employment or an office, a deduction is still denied unless either: the income is **mainly commission**/variable performance pay **and** duties are mainly performed away from an employer-provided office; **or** duties are **mainly performed in the home office**. *"Mainly" is a purely quantitative standard of more than 50%* of working time in the year (Sekretaris v Lourens Erasmus). Whether the employer permits or requires home working is **not** the test.
- **Apportionment is by floor area**, and the denominator is **the entire floor area of ALL buildings on the property** — house *plus* garage, workers' quarters, outbuildings — **not the main dwelling alone**, and **not the erf**. IN 28 Example 9: `R135 000 × (16 m² / 253 m²) = R8 537`, where 253 = 210 (dwelling) + 18 (garage) + 25 (quarters), and the 600 m² erf is expressly irrelevant. Estimates of area are **never** accepted; actual measurement is required (s 102(1) TA Act).
- **No second, time-based apportionment.** After the floor-area split the full amount is claimed — an employee working from home three days out of five claims the whole apportioned amount, not three fifths. But note that expenditure must be the **actual cost for the months that qualify**, not the year's total pro-rated by months.
- **Expenses "in connection with the premises"** that qualify: bond interest (subject to the interest rule below), **rates and taxes and other municipal charges** (sewerage, refuse), **electricity**, **homeowners insurance to the extent it insures the building**, **security** (non-capital), and **cleaning**. Rent and **repairs to the premises** (s 11(d)) qualify in their own right.
- ⚠️ **THE BIG ONE — bond interest is PROHIBITED for salaried employees.** Interest on a loan to acquire the premises is deductible under **s 24J**, not s 11(a)/(d), so it fails the **s 23(m)(iv)** exclusion and s 23(m) prohibits it — **for years of assessment commencing on or after 1 March 2022**, i.e. every year this suite models (2024–2027). IN 28 Example 11 lists `Interest on bond of R4 500 (10% of R45 000)` under *"expenses prohibited from deduction under section 23(m)"*. The previous handoff §7 listed interest as claimable by salaried employees — **that was wrong and has been corrected here**. Commission earners and the self-employed keep it.
- **Also prohibited for s 23(m) taxpayers:** cell phone, fibre/internet and consumable stationery (not "in connection with the premises" — a loose or indirect connection is not enough), and repairs to a **computer** (as opposed to the premises). **Household contents insurance** and **bond (life) insurance** [s 23(r)] never qualify for anyone.
- **Wear-and-tear under s 11(e)** on non-permanent office assets (computer, desk, chair) is excluded from the prohibition by **s 23(m)(ii)** — claimable by everyone, and **not** floor-area apportioned.
- **Commission earners** — s 23(m) does not apply where remuneration is *"normally derived mainly from commission based on sales or turnover"*. IN 28 Example 10 tests this as **more than 50% of total income** (R500 000 commission / R730 000 total). They may claim bond interest, phone/stationery, and pension contributions in addition.
- **CGT consequence (para 45/49).** Trade use "taints" the residence: the **R2m-or-less-proceeds** rule falls away, and the gain is split between tainted and untainted parts. The **R2 million exclusion is not apportioned** — it stays intact and is set off against the **untainted** portion only; the tainted portion is fully brought to account (subject to the annual exclusion). IN 28 Example 12 apportions as `gain × (years used / years owned) × floor-area %`. Technically the taint applies whether or not a deduction was actually claimed. **If more than 50% of the property is used for business it ceases to be a "primary residence" at all** and the *entire* gain, private portion included, is brought to account.
- Out of scope / in the disclaimer: sectional-title levies (must be split between the owner's section and common property, and no deduction at all if the split cannot be proven), and solar/generator/inverter costs (s 12B(h), or s 11(e) only if not a work of a permanent nature — and s 23(m) prohibits the s 12B allowance for restricted taxpayers).

**VAT (Phase 7 — verified against the SARS *Value-Added Tax* pages, the *VAT 404 Guide for Vendors (Issue 15)* and the SARS *Budget 2026 FAQs*):**

- **Standard rate 15%**, in force since **1 April 2018** (previously 14%). The 2025 Budget's proposed rises to **15.5% (1 May 2025)** and **16% (1 April 2026)** were **both withdrawn** following a court order and the Minister's reversal — the rate never actually changed. Verify again before each phase; the 2026 Budget made no rate change.
- **Tax fraction = rate ÷ (100 + rate) = 15/115.** Never take 15% off a VAT-inclusive amount. VAT is **13.04%** of the inclusive price at a 15% rate.
- ⚠️ **Registration thresholds changed on 1 April 2026 — the first move in 17 years.** Compulsory **R1 000 000 → R2 300 000** of taxable supplies in any consecutive 12-month period; voluntary **R50 000 → R120 000**. The previous handoff §7 predicted R1m/R50 000 — **that is now stale for any period from 1 April 2026**, and the calculator carries both eras behind a selector. Liability also arises the moment a contract is signed that will take you over, and you have **21 business days** to apply.
- **Tax periods:** Category **A/B** two-monthly (the standard allocation; A ends Jan/Mar/May/Jul/Sep/Nov, B ends Feb/Apr/Jun/Aug/Oct/Dec) · **C** monthly, compulsory once turnover exceeds **R30m** in any 12 months · **D** six-monthly (farming under **R1.5m**, or a micro business on application) · **E** annual (on application, connected-person letting/renting/administration only). VAT201 and payment are due by the **25th** of the month after the tax period, or the **last business day** for eFiling users.
- **Zero-rated vs exempt.** Zero-rated (taxable at 0%, input tax still claimable): brown bread and brown bread flour, maize meal, samp, mealie rice, dried beans, lentils, pilchards in tins, milk/cultured milk/milk powder/dairy powder blend, eggs, rice, fresh fruit and vegetables, vegetable oil (not olive oil), edible legumes and pulses; fuel levy goods and marked illuminating paraffin; exports and international transport. **Not** zero-rated when prepared for immediate consumption or bundled with a standard-rated item. Exempt (outside the net, **no input tax**): financial services, residential accommodation in a dwelling, local road/rail passenger transport, education by approved institutions, childcare, body-corporate and HOA levy-funded services, donated goods sold by non-profits. **A business making only exempt supplies is not carrying on an "enterprise" and cannot register at all.**

**Small Business Corporation, section 12E (Phase 7 — table verified against the SARS *Companies, Trusts and Small Business Corporations (SBC)* rates page; rules against *Interpretation Note 9 (Issue 7)*, 25 June 2018):**

- **Graduated tables** `{ limit, rate, base }`. The 7% / 21% / 27% rates have not moved; only the 0% band (which tracks the individual tax threshold) does:
  - **2027** (years ending 1 Apr 2026 – 31 Mar 2027): 99000@0% · 365000@7% b0 · 550000@21% b18620 · ∞@27% b57470.
  - **2026 · 2025 · 2024** (all identical — SARS labels the 2025 table "22 February 2023 – No changes from previous year"): 95750@0% · 365000@7% b0 · 550000@21% b18848 · ∞@27% b57698.
- **Standard company rate 27%** for every year modelled (it dropped from 28% for years of assessment ending on or after 31 March 2023). Budget 2026 changed neither the rates nor the R20m limit.
- **Qualifying requirements** — re-tested **every year**; failing any one costs the whole year:
  1. **Legal entity:** private company, close corporation, co-operative, or **personal liability company** (reinstated by the TLAA 2016, deemed effective 1 May 2011). Sole proprietors, partnerships and trusts can never qualify.
  2. **All holders of shares are natural persons at all times** during the year — one day of corporate shareholding disqualifies. Shares held via a trust qualify only where the beneficiaries hold a **vested right** and are all natural persons.
  3. **No shareholder holds shares or an equity interest in any other "company"** [s 12E(4)(a)(ii)] at any time — even a dormant shell, even for one day — except the companies on IN 9's Annexure B permitted list. **This is the most common accidental disqualifier.**
  4. **Gross income ≤ R20 million** [s 12E(4)(a)(i)], reduced proportionately for a short year: `R20m × full months traded ÷ 12`. The proviso never *increases* the limit for a 13-month year.
  5. **Business activity test** [s 12E(4)(a)(iii)]: **investment income + income from rendering a personal service ≤ 20%** of the total of all receipts and accruals **excluding capital receipts, PLUS capital gains** (that is the denominator — IN 9, 4.1.4(c)). "Investment income" = dividends, foreign dividends, royalties, rental from immovable property, annuities, s 24J interest and financial-instrument proceeds.
  6. **Not a "personal service provider"** as defined in the Fourth Schedule [s 12E(4)(a)(iv)] — a distinct test from "personal service", and both must be passed.
- ⚠️ **The three-employee escape valve.** Income is only a **"personal service"** where **both** limbs hold: the service (accounting, actuarial science, architecture, auctioneering, auditing, broadcasting, consulting, draftsmanship, education, engineering, financial service broking, health, IT, journalism, law, management, real estate broking, research, sport, surveying, translation, valuation, veterinary science) is **performed personally by a holder of shares or a connected person**, **and** the entity does **not** employ **three or more full-time employees** engaged in that business who are neither shareholders nor connected persons. Employ three and the whole stream stops being tainted. Where only part of the work is done by the shareholder, a **rand-value apportionment** is required.
- **Accelerated allowances:** **s 12E(1)** — **100%** of plant or machinery used directly in a process of manufacture (or similar), in the year it is first brought into use. **s 12E(1A)** — any other asset that would qualify for s 11(e) may instead be written off **50% / 30% / 20%** over three years, at the SBC's election, and is **not** apportioned for part years.

**Turnover tax, section 48 microbusiness regime (Phase 7 — verified against the SARS *Turnover Tax* rates page and the Budget 2026 FAQs). Included on the SBC page purely as a comparison leg — it is a separate elective regime.**

- **2024 · 2025 · 2026** (qualifying turnover **≤ R1 000 000**): 335000@0% · 500000@1% b0 · 750000@2% b1650 · ∞@3% b6650.
- **2027** (qualifying turnover **≤ R2 300 000**, effective 1 April 2026 — the first change since 2009): 600000@0% · 950000@1% b0 · 1400000@2% b3500 · ∞@3% b12500.

**Payroll taxes — the EMP201 bundle (Phase 7 — verified against the SARS *Guide for Employers in respect of the UIF* (UIF-GEN-01-G01, Revision 9), the *Guide for Employers in respect of Skills Development Levy* (SDL-GEN-01-G01, Revision 5), and the SARS ETI pages):**

- **UIF: 1% employee + 1% employer**, on remuneration capped at **R17 712 p/m (R212 544 p/a)** since 1 June 2021 — max **R177.12 each side, R354.24 total** (see also the Phase 5 UIF notes above).
  - ⚠️ **Remuneration for UIF purposes EXCLUDES commission**, along with any pension/superannuation/retiring allowance and amounts in paragraphs (a), (cA), (d), (e) and (eA) of the "gross income" definition. It is **not** reduced by the employee's pension contributions.
  - The **UIC Act does not apply at all** to an employee working **less than 24 hours a month**, to Public Service Act officers/employees in national and provincial government, or to the listed holders of public office.
- **SDL: 1%** of the **leviable amount** since 1 April 2001 (0.5% from 1 April 2000).
  - ⚠️ **The leviable amount is the balance of remuneration AFTER the paragraph 2(4) allowable deductions** — pension, provident and RA fund contributions and payroll donations come off first. **UIF gets no such reduction: same payslip, two different bases.** Commission is *not* excluded for SDL.
  - **Exempt employers:** national/provincial government; any employer whose total remuneration for the coming 12 months will not exceed **R500 000**; national/provincial public entities 80%+ funded by Parliament; certain PBOs with a TEU exemption letter; municipalities holding a Minister's certificate. Remuneration excluded for SDL also covers pensions/superannuation/retiring allowances, gross-income paras (a), (d), (e), (eA), and amounts paid to a s 18(3) learner.
  - Paid on the **EMP201 within seven days** after month end.
- **PAYE deductions the employer may take (para 2(4)):** retirement fund contributions under **s 11F** — the lesser of the actual contribution, **27.5% of remuneration**, and the annual cap (**R350 000** for 2024–2026, **R430 000** for 2027) — and **s 18A payroll donations, limited to 5% of remuneration after the retirement deduction** [para 2(4)(f)]. Then s 6 rebates and the s 6A medical credits.
- **ETI (Employment Tax Incentive Act).** The **1 April 2025** amendments lifted the bands but left the maximums alone:
  - **From 1 April 2025:** R0–R2 499.99 → **60%** of remuneration (first 12 months) / **30%** (second 12) · R2 500–R5 499.99 → **R1 500 / R750** · R5 500–R7 499.99 → `1500 − 75% × (rem − 5500)` / `750 − 37.5% × (rem − 5500)` · **R7 500 and above → nil**. s 4(1)(b) minimum-wage floor where no wage regulating measure applies: **R2 500** (was R2 000).
  - **1 March 2022 – 31 March 2025:** R0–R1 999.99 → 75% / 37.5% · R2 000–R4 499.99 → R1 500 / R750 · R4 500–R6 499.99 → the same taper off R4 500 · **R6 500 and above → nil**.
  - So the **2026 year of assessment straddles both tables** — March 2025 still used the old one. The calculators key the table off the tax year (2024–2025 → old, 2026–2027 → new) and say so on the page.
  - **Qualifying employee:** aged **18–29** at month end (age limits fall away in a special economic zone), holds a **valid SA ID, asylum seeker permit or Refugee Act ID**, **first employed on or after 1 October 2013**, not a **connected person** to the employer, not a **domestic worker**, and paid at least the applicable minimum wage. **Maximum 24 months** per employee; **no limit** on the number of employees.
  - **Under 160 hours** in a month: gross remuneration **up** to 160 hours, read the table, then scale the incentive **back down** by `hours ÷ 160`.
  - ETI is a **set-off against the PAYE line** on the EMP201 (never against UIF or SDL), computed across **all** employees; any excess over the month's total PAYE rolls into the **EMP501 reconciliation** rather than being paid out monthly.

**Interest exemption — s 10(1)(i) (Phase 8 — verified against SARS *and* against the Act's own wording; unchanged 2024–2027):**

- **R23 800** (under 65) / **R34 500** (65 or older on the last day of the year of assessment). SARS's Interest and Dividends page carries the same pair for **2022–2027** and states no change was announced on 25 February 2026, so — unlike the VAT and turnover-tax thresholds Phase 7 found moving — this one really has been frozen since 2016.
- The section reads: *"in the case of any taxpayer who is a natural person, so much of the aggregate of any interest received by or accrued to him or her, **other than interest in respect of a tax free investment as defined in section 12T(1)**, **from a source in the Republic** as does not during the year of assessment exceed…"*. Three consequences, all modelled: it is **per person, not per account** (the aggregate is tested); **TFSA interest never consumes it**; and **foreign interest gets no exempt portion at all** (fully taxable, s 6quat may credit foreign tax).
- **Proviso added by Act 20 of 2022, effective 1 March 2023 — so it applies to every year this suite covers:** where a year of assessment is **less than 12 months**, the exemption is pro-rated `days ÷ 365`. Modelled as an optional part-year input.
- Taxable interest carries **no special rate** — it is added to taxable income and taxed at the marginal rate off the §4 brackets. No new table.
- **Non-residents (verified against IN 115 and the Act):** SA-source interest received by a non-resident is **wholly exempt from normal tax under s 10(1)(h)** — better than the R23 800 — **unless** the person is a natural person **physically present in SA for more than 183 days** in the 12 months preceding accrual, **or** the debt is **effectively connected to an SA permanent establishment**. Where s 10(1)(h) applies, **withholding tax on interest at 15%** (ss 50A–50H, from 1 Mar 2015) is the final tax; a treaty may reduce the rate. The two regimes are **mutually exclusive by design**: s 50D(3) exempts from WTI exactly the two cases s 10(1)(h) excludes (IN 115 §5.5 says so explicitly). ⚠️ Note s 10(1)(i) says "any taxpayer who is a natural person" and is **not** limited to residents, so on the wording the R23 800 is available in the caught-by-183-days case — the calculator applies it with an on-page caveat. The common shorthand "the exemption does not apply to a non-resident" is a *practical* statement (their interest is already wholly exempt), not the section's wording.

**Foreign dividends — s 10B (Phase 8 — verified against SARS Interpretation Note 93 (Issue 3), 17 May 2021; ratios unchanged 2024–2027):**

- **Partial exemption, s 10B(3):** exempt amount = **B × C**, where for a **natural person, deceased estate, insolvent estate or trust B = 25 to 45** (since the 2018 year of assessment; it was 26/41 for 2016–2017 and 25/40 before that) and C is the aggregate of foreign dividends not exempt under s 10B(2). So **20/45 (44,44%) stays in taxable income** at the marginal rate. IN 93's own demonstration: `R100 − R55,56 = R44,44 × 45% = R20` → **max effective rate 20%**, matching dividends tax — and **below** 20% for anyone under the top bracket (26% marginal → 11,56%). Company ratio 8/28, individual policyholder fund 10/30 — not modelled (individuals only).
- **Participation exemption, s 10B(2)(a):** fully exempt where the person (alone or with a group company) holds **at least 10% of the equity shares AND the voting rights**. The second proviso limits it to **equity shares** — preference shares fall back to the 25/45.
- **Listed shares, s 10B(2)(d):** a foreign dividend received **in cash** on a **listed share** is exempt from normal tax, but is a "dividend" under paragraph (b) of the s 64D definition and so bears **dividends tax at 20%**. "Listed" means listed on an exchange licensed under the Financial Markets Act — i.e. the JSE. IN 93 is explicit on the **dual-listed** case: *"If a foreign company has its shares listed on a South African exchange as well as on a foreign exchange, it is only the shares listed on the South African exchange that will qualify."* Where foreign tax was also withheld on such a dividend there is **no s 6quat credit**, because nothing enters taxable income — a genuine double-tax outcome the calculator shows.
- **s 6quat is modelled** (a deliberate departure from Phase 6, where provisional tax left it out — there it was a footnote, here foreign withholding tax is the whole point). Rebate = `min(foreign tax, limitation)`; **limitation formula s 6quat(1B)(a)** = `foreign taxable income ÷ total taxable income × normal tax payable on total taxable income` (tax **before** the s 6 rebates). Paragraph (ii) of the proviso to **s 6quat(1A)** means the foreign tax on the **exempt 25/45 portion still counts** towards the credit. Unused foreign tax **carries forward up to seven years** (proviso (iii) to s 6quat(1B)(a)). IN 93 Example 40 works the whole thing end to end.
- **No deductions ever:** **s 23(q)** blocks expenditure incurred in producing foreign dividend income (platform fees, interest on money borrowed to buy the shares) and **s 23(f)** blocks expenses relating to the exempt portion.
- **The R23 800 interest exemption does NOT apply to dividends** — s 10(1)(i) is interest-only. Modelled as a prominent on-page warning because it is the single most common public error.
- **Local dividends** (comparison leg): exempt from normal tax under s 10(1)(k)(i), **dividends tax 20%** withheld at source. Confirmed unchanged for 2027.
- Out of scope, noted in the disclaimer: dividends **in specie**, the **country-to-country exemption** s 10B(2)(b), CFCs, foreign collective investment schemes, and the carve-outs in ss 10B(4)–(6A) (annuities, services rendered/restricted equity instruments, identical-share expenditure) where **no** exemption is available.

**Retirement fund contributions — s 11F (Phase 8 — re-confirmed against the SARS FAQ and Budget 2026):**

- Deduction = the **lesser of** (a) the monetary cap — **R350 000** for 2024–2026, **R430 000** for **2027** (from 1 March 2026, the first increase since 2016); (b) **27,5% of the greater of remuneration or taxable income**; (c) **taxable income before this deduction and before including any taxable capital gain**. ⚠️ The SARS FAQ page still prints R350 000 and has not been refreshed for the Budget change — the R430 000 comes from Budget 2026 and matches what `payroll-tax` and `tax-refund` already use.
- The **27,5% base and limit (c) both exclude the taxable capital gain**, and the taxable-income leg is struck before retirement lump sums, severance benefits, the s 6quat credit and s 18A donations. A capital gain therefore raises the tax bill **without** raising deduction room — modelled explicitly.
- **Excess contributions are not lost:** s 11F(3) deems the disallowed amount contributed on the first day of the following year of assessment, so it queues until there is room; anything still unclaimed at retirement reduces the **taxable portion of the lump sum** first, then the annuity income. **Unused room, by contrast, is forfeited** — it does not carry forward.
- All retirement funds (pension, provident, RA) share **one** limit. An employer contribution is a **taxable fringe benefit** in the employee's hands and is then **deemed made by the employee**, so it counts towards the 27,5%.

**Wear and tear — s 11(e) (Phase 9 — verified against BGR 7 (Issue 4), 9 February 2021, read in full from the SARS PDF; confirmed as the *current* issue on the SARS Register of all Binding General Rulings):**

- ⚠️ **The write-off periods are not in the Act.** s 11(e) only grants a deduction for the amount by which an asset's value has diminished. The periods come from the **Annexure to BGR 7 (Issue 4)**, which reproduces paragraphs 4.2, 4.3 and the Annexure of **Interpretation Note 47 (Issue 5)**. It applies to any asset **brought into use on or after 24 March 2020** — every year this suite models. There is **no Issue 5 of BGR 7**; the register still shows Issue 4 dated 09/02/2021.
- **The full Annexure is 175 entries** and is shipped verbatim in [wear-and-tear/page.tsx](../app/(main)/wear-and-tear/page.tsx) as `BGR7_SCHEDULE` (the `group` field is ours, added only to make the dropdown navigable). It was extracted programmatically from the SARS PDF, not retyped. Spot values: Computers personal **3**, main frame/servers **5**, computer tablet **2**, computer software (PC) **2**, cellular telephones **2**, furniture and fittings **6**, passenger cars **5**, delivery vehicles **4**, trucks (heavy duty) **3**, office equipment electronic **3**. ⚠️ Secondary sources get these wrong — one widely-cited blog lists delivery vehicles at 5 years; the Annexure says 4.
- **Small items, para 4.3.5: full write-off where cost is *less than* R7 000 per item**, the item functions in its own right and is **not part of a set**. Applies to any qualifying asset acquired **on or after 1 March 2009** — and, checked directly against the SARS Budget 2026 FAQs, it did **not** move on 25 February 2026 (unlike the VAT and turnover-tax thresholds Phase 7 found moving). **Not available to a lessor** for an asset acquired to let (IN 47 Issue 2 onwards).
- **Two methods, elected freely and switchable without notifying SARS (para 4.3.2):** straight line (equal instalments over the useful life) or diminishing value (each year's allowance on the remaining income tax value). BGR 7 **Example 1** prices the diminishing-value rate at **1 ÷ life** (20% a year for a five-year life) and confirms a taxpayer may switch to straight line and write the remaining value off over the remaining life — which matters, because diminishing value never reaches zero.
- **Two apportionments, and they stack:** **para 4.3.7** private-vs-business use, and **para 4.3.8** part of a year of assessment (acquired, disposed of, insolvency, death). Both apply under **either** method.
- **Value = cash cost** excluding finance charges, **including** delivery and the direct cost of installation or erection. **s 23C(1)** — a registered vendor entitled to an input tax deduction must exclude the VAT. **Moving costs** (proviso (v)) are **added** to the value and written off over the **remaining** useful life; if the asset is already fully written off they are deducted in the year incurred.
- **Second-hand (para 4.3.4):** written off over its **remaining** expected useful life having regard to condition — SARS is explicit that being older than the Annexure period does **not** allow a full write-off in the year of purchase (Example 2).
- ✅ **s 23(m) does NOT block it.** **s 23(m)(ii)** expressly excludes s 11(e) from the prohibition, so a **salaried employee can claim wear and tear** on a work laptop, desk and chair. This is the resolution of the open question the Phase 9 brief raised, and it is **consistent** with `home-office`, which already takes this position (§4 above, and its "Wear & Tear on Office Equipment" field). Wear and tear is **not** floor-area apportioned — that restriction is for premises costs.
- **Deliberately out of scope**, and stated in the disclaimer: **s 12E** (SBC 100% / 50-30-20 — already fully modelled on `small-business-income-tax`, so it is cross-referenced rather than duplicated), **s 12B/12BA** renewable energy, **s 12C** manufacturing plant, **s 13** buildings, recoupments on disposal (s 8(4)(a)), assets acquired by donation or inheritance, leased assets with a residual value, s 23A lessor limitations and foreign-currency translation.

**Working hours, overtime and minimum wage (Phase 9 — this is labour law, not SARS. Verified against the official Form BCEA1A summary of the Act prescribed by Regulation 2, plus the gazetted determinations):**

- **Ordinary hours, s 9:** **45 hours a week**; **9 hours a day** where the employee works **five days a week or fewer**; **8 hours a day** where they work **more than five**.
- **Overtime, s 10:** only **by agreement**; maximum **10 hours a week** (**15** under a collective agreement, for up to **two months in any 12**); an agreement may not permit **more than 12 hours on any day** in total; paid at **1,5×** the normal wage, or paid time off by agreement.
- **Sunday work, s 16:** **2×** for an employee who **occasionally** works a Sunday, **1,5×** for one who **ordinarily** does.
- **Public holidays, s 18:** work on a public holiday is by agreement and paid at **2×**.
- **Compressed week, s 11:** up to 12 hours a day without overtime pay, still capped at 45 ordinary hours, 10 overtime hours and 5 days a week. **Averaging, s 12:** by collective agreement over up to four months, averaging 45 ordinary + 5 overtime hours a week. Neither is modelled.
- ⚠️ **The annualisation convention is statutory, not a choice. s 35(4): "monthly remuneration or wage is four and one-third times the weekly wage"** — i.e. **52 weeks a year, 4⅓ weeks a month**. This settles the 4,33-vs-4,345 question the Phase 9 brief raised: use **4⅓**, and say so on the page.
- **National minimum wage** (National Minimum Wage Act 9 of 2018, s 6(5); gazetted annually and effective **1 March**, so it lines up exactly with a year of assessment). **Farm and domestic workers are on full parity.** Per year of assessment — general / expanded public works programme:
  - **2027** (from 1 Mar 2026): **R30,23** / R16,62 — Government Gazette 54075 of 3 February 2026.
  - **2026** (from 1 Mar 2025): **R28,79** / R15,83 — gazetted 4 February 2025.
  - **2025** (from 1 Mar 2024): **R27,58** / R15,16.
  - **2024** (from 1 Mar 2023): **R25,42** / R13,97.
  - ⚠️ SAnews's own 2026 article reports the previous EPWP rate as R15,16 — that is the **2024** figure; 2025 was **R15,83**. Cross-check EPWP against the ratio (it has held at ~55% of the general rate in all four years) before trusting a secondary source.
- **BCEA earnings threshold** — determined separately by the Minister of Employment and Labour and does **not** change on 1 March, so it never lines up with the tax year. Above it, an employee is excluded from **ss 9, 10, 11, 12, 13, 14, 15, 16, 17(2) and 18(3)** — the hours caps, the statutory overtime rate and the Sunday premium simply do not apply, and the contract governs. Mapped to the year of assessment in which it applies for most of the year:
  - **2027**: **R269 600,90** p/a (R22 466,74 p/m) from **1 May 2026** — GN 7384, Government Gazette 54544, published 17 April 2026.
  - **2026**: **R261 748,45** from **1 April 2025**.
  - **2025**: **R254 371,67** from **1 April 2024** — Government Gazette 50524.
  - **2024**: **R241 110,59** from **1 March 2023**.
- ⚠️ **Both numbers are gazetted every single year.** Re-check the minimum wage each **February** and the threshold each **April** before shipping anything that depends on them. Record the effective date next to the figure, as above.
- Out of scope, noted in the disclaimer: **sectoral determinations** and bargaining council agreements (contract cleaning, wholesale and retail, security, farming, hospitality) which may set a **higher** floor than the national one; gazetted **learnership allowances**; night work (s 17); leave pay and severance.

**Property transfer costs (Phase 10 — three separate cost stacks, only one of which is a tax; each has its own effective date and NONE of them is 1 March):**

- **Transfer duty** — s 2 of the Transfer Duty Act 40 of 1949, keyed by the **date of acquisition** (the last date of signature on the agreement, *not* the date of transfer, and irrespective of any suspensive condition). Verified against the SARS *Transfer Duty* rate table (page last updated **25/02/2026 15:47**, i.e. Budget day) and the SARS *Transfer Duty Guide (Issue 6)* ch. 7. **The 25 February 2026 Budget did NOT move the bands** — the page states "2027 (With effect from 1 April 2026) – No changes from last year", so 2027 = 2026. Format `{ limit, rate, base }`, progressive, same engine shape as the income tax brackets:
  - **2026 & 2027** (acquisitions **from 1 April 2025**): 1210000@0% · 1663800@3% b0 · 2329300@6% b13614 · 2994800@8% b53544 · 13310000@11% b106784 · ∞@13% b1241456.
  - **2024 & 2025** (acquisitions **1 Mar 2023 – 31 Mar 2025**): 1100000@0% · 1512500@3% b0 · 2117500@6% b12375 · 2722500@8% b48675 · 12100000@11% b97075 · ∞@13% b1128600.
  - ⚠️ **The effective dates do not line up with the 1 March tax year.** SARS moved the bands on **1 April 2025**, so its own "2025" year runs **13 months** (1 Mar 2024 – 31 Mar 2025) and 2026/2027 start on 1 April. The calculator's selector is therefore labelled by acquisition-date range, not by year of assessment.
  - Duty is on the **greater of the consideration and the fair value** (Guide 6.2.1). In an arm's-length sale the price is normally accepted as fair value; the Commissioner may substitute a fair value where the parties are related or no consideration is payable, and may revise that determination within two years.
  - Since **23 February 2011** the graduated rates apply to **all** persons — companies, CCs and trusts included. There is no longer a flat 8% for non-natural persons.
  - **Six months / 10%:** duty is payable within **six months of the date of acquisition**; s 4(1A) then levies interest at **10% per annum for each completed month** from the day after that six-month period until payment. A s 4(3) deposit payment made inside the six months stops the interest.
- **The VAT-versus-transfer-duty switch — a hard either/or, and the single biggest error on competitor calculators.** Where the seller is a **registered vendor supplying in the course or furtherance of its enterprise**, the supply bears **VAT at 15%** and **s 9(15)** of the Transfer Duty Act exempts the acquisition from duty entirely. SARS: *"the sale of property will be subject to either..."* and *"the seller determines whether a transaction should be subject to"* duty or VAT. Notes: a vendor selling their **own private residence** is normally *not* acting in the course of its enterprise, so that sale bears **duty**, not VAT; and a **going concern** under s 11(1)(e) of the VAT Act is a **zero-rated** taxable supply, so s 9(15) still applies and no duty is due. A s 9(15) exemption receipt is still required before the Deeds Office will register. The price is deemed **VAT-inclusive**, so the VAT is `value × 15/115` — money already inside the price, not a further amount the buyer pays.
- **Conveyancing and bond registration fees — NOT law.** The **LSSA Guideline of Fees**, effective **1 July 2026** (CPI reference January 2026, 3.5%). It is a recommendation from a **voluntary professional body**: the Legal Practice Act 28 of 2014 does not delegate fee-setting to the LSSA, the Legal Practice Council does not enforce it as a floor or ceiling, and every fee is negotiable. Figures are **VAT-exclusive**; add **15%**. Both the transfer and the bond are charged off **Column B** of the same schedule — the transfer on the property value, the bond on the bond amount, at **two separate firms** (your bank appoints its own bond attorney from its panel).
  **Column B:** ≤R100 000 → **R6 875** · >R100 000–R500 000 → **R6 875 + R1 100 per R50 000** or part above R100 000 · >R500 000–R1m → **R15 675 + R2 120 per R100 000** or part above R500 000 · >R1m–R5m → **R26 275 + R2 120 per R200 000** or part above R1m · >R5m → **R68 675 + R5 340 per R1 000 000** or part above R5m.
  The schedule is **internally self-consistent** (each band's base equals the previous band's value at its ceiling: 6 875+8×1 100 = 15 675; 15 675+5×2 120 = 26 275; 26 275+20×2 120 = 68 675) and reproduces a second independent source's published table to the rand at R1m/R2m/R3m/R5m/R10m (26 275 / 36 875 / 47 475 / 68 675 / 95 375). That cross-check is what the figures rest on — the LSSA does not publish the PDF openly.
- **Deeds Office registration fees** — the **Schedule of Fees of Office** prescribed by regulation 84 of the Deeds Registries Act 47 of 1937, substituted by **GN 7180 in Government Gazette 54225 of 27 February 2026**. ⚠️ The gazette says the regulations *"come into operation one month from the date of publication"* → **27 March 2026**; secondary commentary universally says "1 April 2026". Gazetted, paid to the Registry, **no VAT**. Banded (fee is a flat amount per band, not progressive):
  - **Item 1(a) lodgement:** **R52** per deed/document lodged (excluding RDP housing) — so R52 on a cash purchase, R104 where a bond is lodged with the transfer.
  - **Item 1(b) transfer**, on the purchase price plus additional consideration / fair value, whichever is greater: ≤100k **50** · ≤200k **114** · ≤300k **727** · ≤600k **956** · ≤800k **1 346** · ≤1m **1 546** · ≤2m **1 738** · ≤4m **2 408** · ≤6m **2 922** · ≤8m **3 480** · ≤10m **4 068** · ≤15m **4 844** · ≤20m **5 818** · >20m **7 751**.
  - **Item 1(c) bond**, on the capital amount: ≤150k **561** · ≤300k **727** · ≤600k **956** · ≤800k **1 346** · ≤1m **1 546** · ≤2m **1 738** · ≤4m **2 408** · ≤6m **2 922** · ≤8m **3 480** · ≤10m **4 068** · ≤15m **4 844** · ≤20m **5 818** · ≤30m **6 781** · >30m **9 690**.
  - Also in the schedule but not modelled (seller-side or edge cases): cancellation/release of a bond **R178**, consent to an act of registration **R500**, withdrawal of a lodged deed **R270**, certified copy of a deed **R658**.
  - ⚠️ **Pages 4–6 of GG 54225 are scanned images with no text layer** — `pdftotext` returns only pages 1–3 and 7. Render those pages to PNG (`pymupdf`, `get_pixmap(dpi=220)`) and read them visually; there is no `tesseract` on this machine.
- **Only the current conveyancing and Deeds Office schedules are carried.** Both are re-issued annually, so an older acquisition would have been quoted off a lower schedule. Transfer duty *is* keyed per era, because SARS publishes it that way and periods years back are still presented for payment. This asymmetry is deliberate and stated on the page.

**Sources:** [SARS individual rates](https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/) · [SARS CGT](https://www.sars.gov.za/tax-rates/income-tax/capital-gains-tax-cgt/) · [SARS retirement lump sum benefits](https://www.sars.gov.za/tax-rates/income-tax/retirement-lump-sum-benefits/) · [SARS two-pot directive guidance](https://www.sars.gov.za/latest-news/tax-directives-enhancements-and-tax-implications-of-the-two-pot-retirement-system/) · [SARS IN72 — Right of use of motor vehicle](https://www.sars.gov.za/wp-content/uploads/Legal/Notes/LAPD-IntR-IN-2013-05-IN72-Right-of-Use-Motor-Vehicle.pdf) · [SARS Guide for Employers iro Fringe Benefits (PAYE-GEN-01-G02)](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/PAYE-GEN-01-G02-Guide-for-Employers-in-respect-of-Fringe-Benefits-External-Guide.pdf) · [SARS UIF ceiling on earnings](https://www.sars.gov.za/latest-news/unemployment-insurance-fund-ceiling-earnings/) · [SALDRU WP 276 — SA's UIF Benefit Function (quotes the Act's Schedule 2 IRR formula, ss12–13)](https://opensaldru.uct.ac.za/handle/11090/1004) · [SARS Crypto Assets & Tax](https://www.sars.gov.za/individuals/crypto-assets-tax/) · [SARS Draft Guide to the Taxation of Crypto Assets (draft 2026-29, 1 July 2026)](https://www.sars.gov.za/wp-content/uploads/Legal/Drafts/Legal-LPrep-Draft-2026-29-Draft-Guide-to-the-Taxation-of-Crypto-Assets-1-July-2026.pdf) · [SARS ABC of Capital Gains Tax for Individuals (Issue 13)](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/Legal-Pub-Guide-CGT02-ABC-Guide-on-CGT-for-Individuals.pdf) · [SARS annual exclusion table](https://www.sars.gov.za/types-of-tax/capital-gains-tax/proceeds/calculation-of-taxable-capital-gains-and-assessed-capital-losses/annual-exclusion/) · [SARS Guide for Provisional Tax (GEN-PT-01-G01, Rev 28, 29 June 2026)](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/GEN-PT-01-G01-Guide-for-Provisional-Tax-External-Guide.pdf) · [SARS FAQ — Who is not a provisional taxpayer](https://www.sars.gov.za/faq/faq-who-is-exempt-from-provisional-tax/) · [SARS Interpretation Note 28 (Issue 3) — Home office expenses](https://www.sars.gov.za/wp-content/uploads/Legal/Notes/LAPD-IntR-IN-2012-28-Home-Office-Expenses-Deductions.pdf) · [SARS Value-Added Tax](https://www.sars.gov.za/types-of-tax/value-added-tax/) · [SARS VAT 404 Guide for Vendors (Issue 15)](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/Legal-Pub-Guide-VAT404-VAT-404-Guide-for-Vendors.pdf) · [SARS Budget 2026 FAQs](https://www.sars.gov.za/about/sars-tax-and-customs-system/budget/budget-2026-frequently-asked-questions/) · [SARS FAQ — new VAT registration threshold](https://www.sars.gov.za/faq/what-is-the-new-threshold-for-vat-registration/) · [SARS Companies, Trusts & SBC rates](https://www.sars.gov.za/tax-rates/income-tax/companies-trusts-and-small-business-corporations-sbc/) · [SARS Interpretation Note 9 (Issue 7) — Small Business Corporations](https://www.sars.gov.za/wp-content/uploads/Legal/Notes/LAPD-IntR-IN-2012-09-Small-Business-Corporations.pdf) · [SARS Turnover Tax rates](https://www.sars.gov.za/tax-rates/turnover-tax/) · [SARS Skills Development Levy](https://www.sars.gov.za/types-of-tax/skills-development-levy/) · [SARS Guide for Employers iro SDL (SDL-GEN-01-G01, Rev 5)](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/SDL-GEN-01-G01-Guide-for-Employers-in-respect-of-Skills-Development-Levy-External-Guide.pdf) · [SARS Guide for Employers iro the UIF (UIF-GEN-01-G01, Rev 9)](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/UIF-GEN-01-G01-Guide-for-Employers-in-respect-of-the-Unemployment-Insurance-Fund-External-Guide.pdf) · [SARS Employment Tax Incentive](https://www.sars.gov.za/types-of-tax/pay-as-you-earn/employment-tax-incentive-eti/) · [SARS — ETI changes with effect from 1 April 2025](https://www.sars.gov.za/latest-news/employment-tax-incentive-eti-changes-with-effect-from-1-april-2025/) · [SARS Interest and Dividends rates](https://www.sars.gov.za/tax-rates/income-tax/interest-and-dividends/) · [SARS Interpretation Note 93 (Issue 3) — The taxation of foreign dividends](https://www.sars.gov.za/wp-content/uploads/Legal/Notes/LAPD-IntR-IN-2016-07-IN93-The-taxation-of-foreign-dividends.pdf) · [SARS Interpretation Note 115 — Withholding tax on interest](https://www.sars.gov.za/wp-content/uploads/Legal/Notes/IntR-IN-2021-02-IN-115-Withholding-tax-on-interest.pdf) · [SARS Withholding Tax on Interest](https://www.sars.gov.za/types-of-tax/withholding-tax-on-interest/) · [SARS FAQ — What are s11F annual allowable deductions](https://www.sars.gov.za/faq/faq-what-are-s11f-annual-allowable-deductions/) · [Income Tax Act 58 of 1962, consolidated text (used to read s 10(1)(h)/(i) verbatim)](https://lawlibrary.org.za/akn/za/act/1962/58/eng@2026-03-01) · [SARS BGR 7 (Issue 4) — Wear-and-tear or depreciation allowance](https://www.sars.gov.za/wp-content/uploads/Legal/Rulings/BGR/LAPD-IntR-R-BGR-2012-07-Wear-And-Tear-Depreciation-Allowance.pdf) · [SARS Register of all Binding General Rulings (confirms BGR 7 is still Issue 4)](https://www.sars.gov.za/wp-content/uploads/Legal/Registers/Legal-IntR-R-BGR-Register-of-all-Binding-General-Rulings.pdf) · [Form BCEA1A — official summary of the Basic Conditions of Employment Act prescribed by Regulation 2](https://www.wits.ac.za/media/wits-university/about-wits/documents/Form%20BCEA1A%20-%20Summary%20of%20the%20Act%20-%20English.pdf) · [SAnews — National Minimum Wage to rise to R30,23 from 1 March 2026](https://www.sanews.gov.za/south-africa/national-minimum-wage-rise-r3023-hour-march) · [DLA Piper Africa — BCEA earnings threshold and national minimum wage increase 2026](https://www.dlapiperafrica.com/en/south-africa/insights/2026/BCEA-earnings-threshold-and-national-minimum-wage-increase) · [SARS Transfer Duty rates](https://www.sars.gov.za/tax-rates/transfer-duty/) · [SARS Transfer Duty (types of tax)](https://www.sars.gov.za/types-of-tax/transfer-duty/) · [SARS Transfer Duty Guide (Issue 6)](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/Legal-Pub-Guide-TD01-Transfer-Duty-Guide.pdf) · [SARS FAQ — can a sale be subject to both VAT and Transfer Duty](https://www.sars.gov.za/faq/faq-can-the-sale-of-a-property-be-subject-to-both-vat-and-transfer-duty/) · [SARS FAQ — which party determines the rate](https://www.sars.gov.za/faq/faq-which-party-determines-what-rate-of-transfer-duty-should-apply/) · [Deeds Office Fees Schedule page](https://www.deeds.gov.za/fees.php) · [GG 54225 / GN 7180 of 27 Feb 2026 — Schedule of Fees of Office](https://www.deeds.gov.za/docs/GG%2054225%20GN%207180%20RE%20FEES.pdf) · [LSSA Conveyancing Fee Guideline 2026, full Column B schedule (Tech4Law transcription)](https://www.tech4law.co.za/business/conveyancing-in-south-africa/conveyancing-fees-guideline-2026/) · [LSSA tariff cross-check at five price points (MJ Kotze Inc)](https://mjkinc.co.za/property-transfers/conveyancing-fees) · [TaxTim calculators](https://www.taxtim.com/za/calculators/).

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
- **Turbopack persistence-cache panic** (seen Phase 5): dev server dies or serves
  garbage mid-verification. Fix: `rm -rf .next` then restart, and re-verify every
  route afterwards.
- **Playwright MCP may be unavailable** — either not connected, or it errors with
  `Browser is already in use ... use --isolated` when another session holds the
  profile. Deterministic fallback that needs no browser: temporarily change the
  relevant `useState` default (e.g. the mode toggle or an input), fetch the SSR
  HTML, strip tags, read the computed numbers, then restore the file from a
  backup copy and re-run `tsc` + the route checks. This verifies the *math* of
  non-default states exactly; it does not verify layout.
- **Playwright without the MCP** (worked in Phase 5 part 3, and beats the
  SSR-only fallback because it verifies real interaction): the MCP's chromium
  builds are already on disk. In the **scratchpad** dir run
  `npm init -y && npm i playwright-core`, then launch with
  `chromium.launch({ executablePath: "~/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell" })`
  (check the version dir — it drifts). You can then click toggles, `fill()`
  inputs, `innerText()` the results and screenshot at any viewport, with no
  profile-lock conflict. Keep everything in the scratchpad, never the repo.
- **Reading SARS PDFs (added Phase 6).** `WebFetch` on a SARS PDF often returns
  raw FlateDecode streams and the summarising model reports the file as
  "corrupted" — it is not. WebFetch still saves the PDF to disk and prints the
  path; run **`pdftotext -layout <that path> out.txt`** (present at
  `/opt/homebrew/bin/pdftotext`) and read the text directly. This is how the
  provisional tax guide and IN 28 were verified, and it is far more reliable than
  trusting secondary commentary. `python3` also has `pypdf` and `pymupdf`.
- **Playwright selector gotchas (Phase 6):** `getByLabel("Increase").last()` hits
  the wrong `Stepper` when a page has more than one — scope the query to the
  owning `InputGroup` first. And `getByText(...)` trips strict mode when a
  `Toggle` label is echoed in a results trail; use
  `getByRole("button", { name: ... })`. Also note that `fill()` on a
  deliberately-`disabled` input times out after 30s — that is the component
  working as designed, not a bug; skip those fields.
- **Reading computed values out of `innerText` (added Phase 7).** The en-ZA
  currency formatter emits a **non-breaking space** as the thousands separator,
  and CSS `uppercase` classes are reflected in `innerText`. A naive
  `text.includes("R 1 000 000")` therefore fails, and so does matching a label
  rendered in caps. Normalise before comparing —
  `s.replace(/\u00a0/g," ").replace(/\s+/g," ").trim()` — and match labels by
  **prefix**, not equality, because JSX interpolation (`VAT at {rate}%`) renders
  as one line, not two. Also **scope the search**: left-column live hints repeat
  the same wording as results, so slice the line array from a results anchor
  first.
- **Locating inputs by their label (added Phase 7).** The `InputGroup` wrapper
  always has `mb-6`, so this XPath is a reliable, reusable handle for any calc in
  the suite:
  `//label[normalize-space(.)="<Label>"]/ancestor::div[contains(@class,"mb-6")][1]`
  — then `.locator("input[type=number]")`, `.locator("select")`, or
  `.getByLabel("Increase"/"Decrease")` for a `Stepper`, which also solves the
  Phase 6 multi-Stepper strict-mode problem.
- ⚠️ **Numeric-like object keys silently reorder (found Phase 7).** A
  `Record<string, …>` keyed `"15"` / `"14"` iterates in **ascending numeric
  order**, so `Object.entries(...)` rendered the 14% option above the 15% one in
  the VAT rate dropdown. Non-numeric keys (`"current"` / `"previous"`) keep
  insertion order. Where dropdown order matters, drive it from an explicit
  order array.
- ⚠️ **The Turbopack panic came back in Phase 9, and `rm -rf .next` was not
  enough.** The symptom was subtler than Phase 5's: routes still returned 200
  and the SSR HTML was correct, but the dev server emitted
  `FATAL: An unexpected Turbopack error occurred` and then **reloaded the page
  in a loop** (`[HMR] connected` repeating). React never stayed hydrated, so
  every Playwright click was silently discarded and each "different" scenario
  reported **identical default numbers** — a false pass, not a visible failure.
  **The fix that worked, and the one to reach for first from now on: verify
  against a production build.** `rm -rf .next && npm run build && PORT=3005 npm
  run start`. No HMR, no recompiles mid-run, stable hydration, and it validates
  the build at the same time. Do this before blaming your selectors.
- **If two scenarios report the same numbers, assume the page is not hydrated**
  until proven otherwise. Add a cheap canary to the run — flip one input and
  assert the headline actually moved — rather than trusting a clean exit code.
- **Playwright waits (Phase 9):** `waitUntil: "networkidle"` times out against
  this app (the dev server keeps a socket open); use `"domcontentloaded"` plus
  `waitForSelector("input")` and a short settle. Note the hub has **no**
  `input[type=number]`, so a number-input wait hangs there — wait on `input`.
- **Setting a range slider from Playwright:** `fill()` does not work. Use the
  native setter and dispatch an input event:
  `el => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set.call(el,"60"); el.dispatchEvent(new Event("input",{bubbles:true})); }`.
- **A `Stepper` at its min or max renders its button `disabled`** — clicking it
  times out after 30s. Where a test walks a Stepper down and back up, assert the
  displayed value between the two runs; a disabled-button timeout usually means
  the earlier clicks never landed (see the hydration note above).
- ⚠️ **Never run `npm run build` twice concurrently.** Phase 10 wasted a cycle by
  putting a second `npm run build` inside a `<(...)` process substitution while
  `npm run start` was booting off the first one. The second build wiped `.next`,
  and every route then returned **500** with
  `Cannot find module '.next/server/middleware-manifest.json'` — which reads like
  a code fault but is not. `pkill -f "next start"; rm -rf .next; npm run build`
  and start once.
- **`Row` renders its label and value as two sibling `<span>`s**, so
  `innerText` puts them on **consecutive lines**. A check like
  `line === "Duty on the dutiable value R 33 786"` will always fail. Match the
  label by prefix and concatenate the *next* line:
  `const pair = (ls,p) => { const i = ls.findIndex(l => l.startsWith(p)); return i===-1?null:ls[i]+" "+ls[i+1]; }`
- **Normalise per line, not before splitting.** `norm(text).split("\n")` collapses
  the newlines it is about to split on and hands you one giant line — a whole
  suite of silent failures. Split on `\n` first, then `norm` each line.
- **Left-column input labels collide with results labels.** `"Attorney Fees"` is
  both an `InputGroup` label and a hero stat, and the left column comes **first**
  in the DOM, so `findIndex` finds the input. Slice the line array from a results
  anchor (`"Total Upfront Cost"`) before searching — the Phase 7 note, but it
  bites the hero card too, not just the results trail.
- **The en-ZA minus sign is U+2212, not ASCII `-`.** `"Age Rebate -R 17 820"`
  never matches; the page renders `−R 17 820`. Add `.replace(/\u2212/g,"-")` to
  the normaliser, or match on the digits only. (This sits alongside the Phase 7
  non-breaking-space note — `toLocaleString("en-ZA")` emits **U+00A0** as the
  thousands separator, which is why `.includes("R430 000")` fails on a hint that
  visibly reads `R430 000`.)
- **Scanned-image PDFs.** Some gazettes (GG 54225 pages 4–6) have **no text
  layer**, so `pdftotext` silently returns near-empty pages — check the per-page
  char count with `fitz` before trusting it. There is no `tesseract` here; render
  the page instead (`page.get_pixmap(dpi=220).save("p4.png")`) and read the PNG
  visually.
- Clean up after: kill the dev/production server, `rm -rf .playwright-mcp`,
  delete any screenshot PNGs created at repo root (keep Playwright work in the
  scratchpad).

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
| 5 | UIF · Crypto Tax · Company Car | `uif`, `crypto-tax`, `company-car` | ✅ **COMPLETE — awaiting client sign-off** |
| 6 | Provisional Tax · Provisional Taxpayer Check · Home Office | `provisional-tax`, `provisional-taxpayer-check`, `home-office` | ✅ **COMPLETE — awaiting client sign-off** |
| 7 | VAT · Small Business Income Tax · Payroll Tax | `vat`, `small-business-income-tax`, `payroll-tax` | ✅ **COMPLETE — awaiting client sign-off** |
| 8 | Taxable Local Interest · Foreign Dividends · Retirement Savings | `local-interest`, `foreign-dividends`, `retirement-savings` | ✅ **COMPLETE — awaiting client sign-off** |
| 9 | Wear & Tear · Net to Gross Salary · Hourly to Salary | `wear-and-tear`, `net-to-gross`, `hourly-to-salary` | ✅ **COMPLETE — awaiting client sign-off** |
| 10 | `tax-calculator` 2027 + per-year retirement cap fix (Q26) · Property Transfer Cost | `tax-calculator`, `property-transfer-cost` | ✅ **COMPLETE — awaiting client sign-off** |

**Live now (29 — the registry is complete):** `/tax-calculator`, `/tax-refund`, `/bonus-tax`, `/capital-gains-tax`, `/retirement-lump-sum`, `/two-pot`, `/travel-deduction`, `/medical-aid-credits`, `/tax-bracket`, `/retrenchment-tax`, `/rental-income-tax`, `/tfsa`, `/donations-tax`, `/company-car`, `/uif`, `/crypto-tax`, `/provisional-tax`, `/provisional-taxpayer-check`, `/home-office`, `/vat`, `/small-business-income-tax`, `/payroll-tax`, `/local-interest`, `/foreign-dividends`, `/retirement-savings`, `/wear-and-tear`, `/net-to-gross`, `/hourly-to-salary`, `/property-transfer-cost` (each with an `/embed/...` twin). Hub at `/calculators` (+ `/embed/calculators`) — shows **"29 of 29 calculators"** and **no "Coming soon" cards remain**.

**Not yet built: none.** Every card in the `CATEGORIES` registry is live. Anything
further is net-new scope — see §7.

---

## 7. Next up — Phase 11

**Phase 10 is complete, and with it the registry.** `property-transfer-cost` is
built, verified and live, and the Q26 defect on `tax-calculator` is fixed (2027
year added, per-year retirement cap wired in). The hub now reads **"29 of 29"**
and there are **no "Coming soon" cards left**. **Hand Phase 10 to the client for
sign-off before starting Phase 11.**

**There is no obvious next card.** Every calculator in the original TaxTim-shaped
lineup exists. Phase 11 is therefore **the first phase with no predetermined
scope**, and it must not be invented here. The real backlog is the open-questions
list below, and several items in it are **larger than a new card was**:

1. **Q9 — a company mode and the s 89quat interest calculation** for
   `provisional-tax`. The interest leg needs a date-aware prescribed-rate table,
   which is a genuine data-maintenance commitment, not an afternoon.
2. **Q14 — a multi-employee / whole-payroll mode** for `payroll-tax`. This is the
   only way the ETI display stops being misleading for the employees who actually
   qualify for it. Probably the highest-value item on the list.
3. **Q21 — an after-tax leg on the retirement projection**, which needs the
   one-third lump sum run through the SARS retirement table plus annuity-income
   assumptions. A modelling decision, not an addition.
4. **Q22 — foreign interest has no home.** Cheapest real gap to close: the s 6quat
   machinery already exists on `foreign-dividends`.
5. **Q31–Q33 (new, below) — the conveyancing guideline decision.** Whether to
   publish a non-binding tariff at all, and whether to verify it against the
   actual LSSA PDF. This needs an answer *before* the next annual maintenance
   pass, not after.
6. **A maintenance pass, not a feature.** Six calculators now carry figures that
   are re-issued on dates that are **not** 1 March — the LSSA guideline (1 July),
   the Deeds Office schedule (late March/April), transfer duty (1 April), the
   national minimum wage and BCEA threshold (1 March but separately gazetted),
   the VAT/turnover-tax thresholds (1 April). §4 records the effective date next
   to each. Worth proposing to the client as a standing annual review rather than
   waiting for a "your calculator is wrong" email.

**Get the client to rank these before anything is built.**

**The suite is now internally consistent — keep it that way.** Phase 10's own fix
(Q26) was a stale figure on the oldest page, found only because a later
calculator inverted the same engine. Before Phase 11 builds anything, it is worth
one cheap sweep: grep the whole suite for hard-coded `350000`, `36000`,
`100000`-style constants that should be per-year table entries. `tax-calculator`
was not the only page written before the 2027 year existed.

**Open questions carried over (confirm with client if unanswered):**
1. Hub label for the existing PAYE calc — currently "PAYE / Salary Tax". Keep, or rename?
2. CGT scope — kept to individuals; capital losses carried forward and year-of-death exclusion intentionally omitted (noted in disclaimer). Add later?
3. Retirement Lump Sum / Retrenchment share the same SARS retirement benefits table — built as distinct pages (Retrenchment adds a marginal-rate leg for notice/leave/bonus pay, so it is genuinely more than a preset). Fine as-is unless client prefers consolidation.
4. Medical Aid Credits AMTC — s6B percentages (25%/33.3%, 4×/3× MTC, 7.5% threshold) are long-standing and treated as stable across 2024–2027. Re-confirm if a future Budget changes them. (Phase 6 independently re-confirmed all of these against the provisional tax guide's worked examples — they are correct.)
5. **UIF benefit mode.** Built as a second mode on the UIF page on the user's instruction. Confirm the client wants it public; if not, deleting the `benefit` branch leaves a clean contributions-only calculator.
6. **The crypto page cites a SARS draft.** `crypto-tax` is built on the *Draft* Guide to the Taxation of Crypto Assets (1 July 2026), whose comment period **closed 31 Aug 2026**. Nothing in the calculator depends on the draft alone. **When SARS issues the final guide, re-check the five factors and the wording, and drop that clause.**
7. **The crypto "intention" panel.** An advisory checklist reporting a *leaning* (capital vs revenue). Confirm the client is comfortable publishing it.
8. **Home office bond interest will surprise people.** The calculator correctly disallows bond interest for salaried employees (s 23(m), from YoA commencing on/after 1 Mar 2022 — see §4). Many competitor calculators, older blog posts and even earlier versions of this handoff still allow it, so the client should expect "your calculator is wrong" queries. The page explains the rule in its explainer card and greys the field out with an inline reason. **Do not "fix" this to match competitors** — IN 28 Example 11 is unambiguous.
9. **Provisional tax scope.** Individuals and trusts only; companies are not modelled (they have no rebates and a different first-period worksheet). The s 6B additional medical credit, s 6quat foreign credits, the s 89quat interest calculation and the para 27 late-payment penalty are all noted in the disclaimer but not computed. Confirm with the client whether a company mode and an interest calculator are wanted — s 89quat in particular needs a date-aware prescribed-rate table, which is a bigger job than it looks.
10. **The provisional taxpayer check is advisory, not a filing.** It reports a status and the reasoning trail. Confirm the client is comfortable publishing a tool that tells someone they are *not* a provisional taxpayer.
11. **NEW — the VAT page carries two threshold eras.** A selector switches between the pre- and post-1 April 2026 compulsory/voluntary thresholds, because periods before that date are still open to assessment and audit. Confirm the client wants both exposed rather than only the current R2.3m / R120 000 pair. The same question applies to the **14% historic VAT rate option** in the rate dropdown.
12. **NEW — the VAT201 mini-calculator lives on the VAT page.** Output tax less input tax appears as an optional secondary card (hidden until sales or purchases are entered), rather than as its own "VAT Return" hub card. Confirm, and note that apportionment for mixed taxable/exempt supplies, notional input tax on second-hand goods, imports and the valuable-metal domestic reverse charge are all out of scope.
13. **NEW — turnover tax is a comparison leg, not its own card.** This answers the Phase 7 brief's open question: `small-business-income-tax` shows SBC rates vs the flat 27% vs turnover tax side by side, using gross income as qualifying turnover. Confirm — a standalone Turnover Tax card would need its own registration, deregistration and payment-date rules and could still be added later without touching the SBC page.
14. **NEW — Payroll Tax models one employee, and that limits the ETI display.** ETI can only be set off against the PAYE line, so for any employee under the tax threshold — which is most ETI beneficiaries — the set-off against *their own* PAYE is nil. The page therefore headlines **"ETI Earned"** (the full computed incentive) and explains in a banner that a real EMP201 sets it off against the total PAYE for all employees, with the excess rolling into the EMP501 reconciliation. Confirm the client is happy with that framing, or scope a **multi-employee / whole-payroll mode**.
15. **NEW — SDL is driven by a "total annual payroll" input** on the Payroll Tax page, because the R500 000 exemption is an employer-level test that cannot be derived from one employee's package. Confirm that input is acceptable, and that defaulting it to R1.8m (so SDL applies) is the right starting state.


16. **NEW — the local interest page carries three residency states**, not two: resident, non-resident inside the s 10(1)(h) exemption (15% WTI, final), and non-resident caught by the 183-day / permanent-establishment tests (normal tax, no WTI). Confirm the client wants the non-resident branches public at all — deleting them leaves a clean resident-only calculator.
17. **NEW — s 10(1)(i) for a caught non-resident.** The section is worded for "any taxpayer who is a natural person" and is not limited to residents, so the calculator applies the R23 800 in that case with an on-page caveat telling the user to get advice. Most public commentary says flatly that non-residents get no exemption. Confirm the client is comfortable with the wording-based position, or have the branch simply refuse to apply it.
18. **NEW — the part-year exemption input.** The proviso pro-rating the interest exemption by days ÷ 365 is real and applies to every year in the suite, but it matters to a small minority (deceased estates, people who ceased residency). It sits behind a toggle so it does not clutter the default view. Confirm.
19. **NEW — foreign dividends models s 6quat; provisional tax does not.** Phase 6 deliberately left the foreign tax credit out of `provisional-tax` and the brief asked for consistency. This phase departed from that, because on a foreign dividend the withholding tax *is* the subject — leaving it out would produce a materially wrong answer. The two pages now differ in scope; confirm, or add s 6quat to `provisional-tax` in a later phase.
20. **NEW — the JSE-listed branch shows a real double-tax outcome.** A cash foreign dividend on a JSE-listed share is exempt from normal tax but bears 20% dividends tax, and any foreign withholding tax on it earns **no** s 6quat credit because nothing enters taxable income. On a Swiss- or UK-domiciled JSE listing that can read as 35% total. It is correct, and it will generate queries. Confirm the client wants it shown rather than hidden behind a footnote.
21. **NEW — the retirement projection is shown before retirement tax.** The three-way comparison (retirement fund vs TFSA vs taxable account, all funded with the same out-of-pocket amount) ends at the retirement date, with a caption and a disclaimer saying the fund value is pre-tax. A genuine after-tax leg would need the one-third lump sum run through the SARS retirement table plus an assumption about annuity income and the retiree's other income — a real modelling decision, not a small addition. Confirm the current framing, or scope the after-tax leg.
22. **NEW — foreign interest has no home yet.** `local-interest` is deliberately local-only (it is in the name, and the exemption is source-limited), and the disclaimer says so. Foreign interest is fully taxable with a possible s 6quat credit — the machinery already exists on `foreign-dividends`. Decide whether it becomes a leg on one of those pages or its own card.

23. **NEW — the wear & tear page ships the entire BGR 7 Annexure, all 175 entries.** The alternative was a curated shortlist plus a free-text "other". The full schedule was chosen because it is the actual published SARS table, it is what an accountant will check the page against, and a shortlist would have to be defended every time something is missing. It is grouped into nine headings **that are ours, not SARS's** — the Annexure is a flat alphabetical list. Confirm the client is comfortable with our grouping, and note that if SARS issues an Issue 5 the whole array must be re-extracted (the extraction script pattern is in §4).
24. **NEW — wear & tear takes a position on s 23(m) that contradicts several competitor calculators.** s 23(m)(ii) expressly excludes s 11(e), so the page tells a **salaried employee they can claim** wear and tear on a work laptop. This is the same reading `home-office` already uses, so the two pages agree — but it sits alongside `home-office` telling the same user they **cannot** claim bond interest, which will read as inconsistent to anyone who does not know the section. Both are correct. Expect queries, and see Q8.
25. **NEW — "net" is defined on the net-to-gross page, and it is a choice.** Net means after PAYE, UIF, the employee's own retirement contribution, their medical scheme contribution and any other listed deduction. Competitors variously stop after PAYE, or after PAYE and UIF. The page states its definition in an explainer and every component is a zeroable input, so a user can reproduce any other convention. Confirm the client is happy with that default rather than a PAYE-and-UIF-only one.
26. **✅ FIXED IN PHASE 10 — `tax-calculator` had two stale figures.** Its `TAX_DATA` stopped at **2026** (no 2027 year) and it hard-coded `retirementCapFixed = 350000` for every year, missing the **R430 000** cap that applies from 1 March 2026. Found in Phase 9 while building `net-to-gross` (which inverts the same engine and had both), flagged rather than changed because `tax-calculator` is a signed-off live page. Phase 10 fixed it: 2027 added to `TAX_DATA` with the §4 brackets, rebates and medical credits, and `retirementCap` is now a per-year field on the table (R430 000 for 2027, R350 000 for 2024–2026) rather than a constant. The input hint interpolates the year's cap. Verified live — see the Phase 10 change-log entry. **The client should be told this page's numbers changed, since it was signed off long ago.**
27. **NEW — net-to-gross solves by bisection, and says so on the page.** The forward payslip is piecewise-linear and strictly increasing, but it has kinks at every bracket boundary, at the UIF ceiling, at the s 11F 27,5%/rand-cap crossover and where medical credits stop being fully used. Bisection converges to the cent without enumerating those cases. The page mentions the iteration in the UIF-ceiling explainer; confirm the client is comfortable with that being visible, or it can be dropped to a code comment.
28. **NEW — hourly-to-salary is the suite's first non-SARS calculator.** Its pay rules come from the BCEA and the National Minimum Wage Act, not the Income Tax Act, and **both its headline numbers are re-gazetted annually on dates that are not 1 March**. §4 records the effective date next to every figure for exactly this reason. Confirm the client accepts an annual maintenance commitment on this page — it will go stale faster than anything else in the suite.
29. **NEW — sectoral determinations are out of scope.** The page checks against the *national* minimum wage only. Contract cleaning, wholesale and retail, security, farming and hospitality all have gazetted sectoral minima that can be **higher**, and learnership allowances are gazetted separately. The disclaimer says so and the compliance card says "a sectoral determination may set a higher floor". Confirm, or scope a sector selector — which would be a substantial data-maintenance job of its own.
30. **NEW — the hourly page reports working-hours breaches, not just pay.** It flags ordinary hours over 45 a week, over 9 (or 8) a day, overtime over 10 a week, and a total over 12 hours a day. That is a compliance opinion on an employer, published on an accounting firm's website. Confirm the client wants it. Deleting the "Working Hours Check" card leaves a clean pay-conversion calculator.

31. **NEW ⚠️ — the property page ships a conveyancing tariff that is not law, and this is the client's call to confirm.** The Phase 10 brief asked whether to ship a guideline tariff **at all**. It was shipped, because a transfer-cost calculator that omits the attorney's fee omits the largest single line on most cost statements and would read as broken. It is mitigated four ways: the card is headed "Attorney fees (LSSA guideline)", the disclaimer calls it a **non-binding guideline** in bold, the explainer card devotes a whole section to why it is negotiable, and a **toggle switches it off entirely** — leaving only the amounts fixed by law (transfer duty and the gazetted Deeds Office fees). **Confirm the client is comfortable publishing it. If not, default the toggle off, or delete the `lssaGuidelineFee` function and the attorney stack; the rest of the page stands on its own.**
32. **NEW — the LSSA figures rest on a cross-check, not on the primary document.** The LSSA does not publish the Guideline of Fees openly (`lssa.org.za` has no downloadable copy). The Column B schedule in §4 comes from a full published transcription, and was accepted only because it is **internally self-consistent** at every band boundary *and* reproduces a second, independent firm's published table to the rand at five price points. That is strong, but it is not the same as reading the PDF. **If the client's own conveyancing contacts can supply the actual LSSA PDF, verify against it and record the issue/date in §4.**
33. **NEW — only the current conveyancing and Deeds Office schedules are carried, while transfer duty is carried per era.** Deliberate: SARS publishes duty tables per year of assessment and transactions are still presented for payment years late, whereas the other two are annual and their historic schedules are not readily available. The page says so in its "What Each Number Comes From" card. **Confirm, or scope a historic-schedule dig** — which for the Deeds Office means finding each prior year's gazette.
34. **NEW — the calculator is buyer-side only.** It deliberately excludes the seller's stack: estate agent's commission, bond cancellation attorney, rates and levy clearance figures, and the compliance certificates (electrical, gas, beetle, plumbing, electric fence — which vary by province and by municipality). Also out of scope: the s 9 exemptions for inheritance, divorce and transfers between spouses; undivided shares and limited real rights under s 2(5) (which need the Annexure A/B age and period factors); and the **s 35A withholding on a non-resident seller**. **Confirm buyer-side is the right scope, or a "seller's costs" mode is the natural companion** — and it is mostly non-tax data the client's conveyancing contacts would have to supply.
35. **NEW — the effective-date mismatch is exposed in the UI, not hidden.** Transfer duty is keyed by **date of acquisition**, so the selector reads "acquired 1 Apr 2025 to 31 Mar 2026" rather than "2026 tax year", and SARS's own 13-month 2025 period is shown as-is. This is the same problem the BCEA threshold has on `hourly-to-salary`, handled the same way. Confirm the wording reads clearly to a lay buyer — it is the one place the page asks the user for something they may have to check on the agreement of sale.
36. **NEW — the VAT branch shows the VAT inside the price, and calls it that.** Where the seller is a vendor, the calculator reports transfer duty of **R0** and shows the `15/115` VAT as money **already inside the agreed price** — explicitly not a further amount the buyer pays — and excludes it from the headline "total upfront cost". That is correct (s 64 of the VAT Act deems quoted prices VAT-inclusive) and it is the honest presentation, but it means a buyer comparing this page against a competitor that adds 15% on top will see a much smaller number. Confirm the framing.
37. **NEW — the six-month/10% interest leg is publishable but unusual.** The page carries an optional "duty paid late" toggle computing s 4(1A) interest per completed month. No competitor calculator does this. It is a small, correct feature that will mostly be used by someone who has already missed the deadline. Confirm, or drop the toggle — nothing else depends on it.

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
- **Phase 5, part 1 (this session):** Built `company-car` (+ `/embed/company-car`)
  following §2; flipped its hub card live (hub now "14 of 29"). **Web-verified
  every rule against primary SARS sources before building** — Interpretation
  Note 72 (*Right of use of motor vehicle*) and PAYE-GEN-01-G02 — and resolved
  the one genuinely ambiguous point the secondary sources disagreed on: the
  private-**fuel** reduction is `private km × the Gazetted deemed fuel c/km for
  the determined-value band`, NOT actual fuel cost apportioned by private/total
  km (licence, insurance and maintenance *are* apportioned that way). All
  recorded in §4. Verified: tsc clean; all 8 checked routes (new + existing +
  hub) return 200 with no compile errors; **the calculator reproduces IN72's
  worked Example 10 to the rand on every line** (monthly R13,000 → annual
  R156,000 → less business use R73,667, licence R343, insurance R8,550,
  maintenance n/a under plan, private fuel `19,000 km × rate`, consideration
  R12,000; with IN72's 2013 fuel rate of R1.193 the engine returns exactly its
  published R38,773); reducing-balance depreciation hand-checked (R400k → R340k
  → R289k) and the 80%→20% PAYE inclusion confirmed to flip at 83% business use;
  embed + hub screenshots reviewed for layout/brand. New patterns this phase: a
  `RandInput` `disabled` prop (maintenance field greys out under a maintenance
  plan); a min/max-bounded `Stepper` (months 1–12, depreciation years 0–10); a
  reducing-balance depreciation loop via `Math.pow`; reuse of the
  travel-deduction cost-scale **fuel column only** as a standalone `FUEL_BANDS`
  table; a "what hits your payslip" card separating the monthly PAYE inclusion
  from the annual assessed benefit; and a floor-at-nil guard with an explanatory
  banner when reductions exceed the value of private use. Note: dev server hit
  an unrelated Turbopack persistence-cache panic mid-verification (`rm -rf
  .next` + restart cleared it; all routes re-verified 200 afterwards) — worth
  adding to the §5 environment gotchas if it recurs.

- **Phase 5, part 2 (this session):** Built `uif` (+ `/embed/uif`) following §2;
  flipped its hub card live and reworded its blurb (hub now "15 of 29").
  **Web-verified before building:** the contribution ceiling against the SARS
  *UIF ceiling on earnings* notice (R17,712 p/m · R212,544 p/a · effective 1 Jun
  2021 · Gazette 44641 — confirmed unchanged for 2027), and the benefit-side
  Income Replacement Rate against the Unemployment Insurance Act's Schedule 2 via
  SALDRU WP 276, which quotes the Act's formula and the ss12–13 credit-day rules.
  All recorded in §4. **Scope decision:** the benefit (payout) side, which the
  previous handoff had flagged as "optionally show — scope with client", was
  included on the user's explicit instruction as a second mode — flagged as open
  question 5 in §7 for client sign-off, with removal instructions. Verified: tsc
  clean; `/uif`, `/embed/uif`, `/calculators`, `/embed/calculators` and two
  existing calcs all 200 with no compile errors; **both modes hand-checked to the
  cent** — contributions on R25,000/mo → base capped at R17,712, employee R177.12,
  employer R177.12, total R354.24 p/m and R4,250.88 p/a, 0.71% of gross; benefit
  at the ceiling → IRR exactly 38.00%, daily remuneration R582.31, daily benefit
  R221.28 (= the R6,730.56/month statutory maximum), 365 credit days split 238
  sliding (R52,664) + 127 flat-20% (R14,791) = **R67,455**; and below the ceiling
  (R10,000/mo, 24 months) → IRR 41.97%, R137.99/day, 182 credit days, R25,114.
  The Act's Schedule 2 formula was independently cross-checked against the
  published daily form `29.2 + 7173.92/(232.92 + daily income)` and agrees to four
  decimal places across the whole income range. New patterns this phase: a
  **two-mode calculator** (one shared salary input driving a contributions view
  and a benefit view, each with its own hero-card gradient — blue for a deduction,
  emerald for money received, mirroring `tax-refund`); a **ceiling-plateau bar
  chart** that plots the 1% against rising salary levels with the user's own
  salary highlighted in orange, making the cap visible; a `fmt2` two-decimal
  currency formatter (UIF cents matter — R177.12 is a real payslip line); and a
  `RandInput suffix` reused for a non-rand "months" field. Note: **Playwright MCP
  was unavailable** (another session held the browser profile — `Browser is
  already in use`), so non-default states were verified by temporarily changing
  the `useState` defaults, reading the computed values out of the SSR HTML, then
  restoring the file from a backup and re-running tsc + all route checks; this
  fallback is now written up in §5. Layout/brand verified via SSR HTML and the
  shared, unchanged component pattern.

- **Phase 5, part 3 — PHASE 5 COMPLETE (this session):** Built `crypto-tax` (+
  `/embed/crypto-tax`) following §2; flipped its hub card live and rewrote its
  blurb (hub now "16 of 29"). **Web-verified before building, against primary
  sources:** SARS's *Crypto Assets & Tax* page and — the big find — the **SARS
  Draft Guide to the Taxation of Crypto Assets (draft 2026-29, issued 1 July
  2026)**, which the previous handoff did not know existed; its PDF was pulled and
  read directly rather than trusted through secondary commentary. The annual
  exclusion and the loss rule were independently confirmed against the **ABC of
  Capital Gains Tax for Individuals (Issue 13)**. All recorded in §4. **Two
  secondary-source errors were caught and not propagated:** commentary widely
  reports the individual capital ceiling as "36%" (that is the *trust* rate — the
  guide's "18% to 36%" range spans all taxpayer types; **18%** is the individual
  ceiling), and several summaries omit that a **net capital loss is also reduced
  by the annual exclusion** — the ABC guide states this verbatim, so the
  calculator implements it. **No new tax tables were needed:** crypto reuses the
  §4 brackets and CGT parameters, which is exactly why the value of this page is
  in the *rules*, not the arithmetic. Verified: tsc clean; all 9 checked routes
  (new + existing + hub, public and embed) return 200 with no compile errors;
  **every default and non-default state hand-checked to the rand** — capital
  R145,000 profit → R50,000 exclusion → R95,000 net gain → R38,000 included →
  **R12,170** CGT at 8.4% effective on a R500k salary (31% marginal, straddling
  into 36%); the same facts on revenue account → **R50,690** (35.0% effective), a
  **R38,520** swing that the page's bar chart exists to show; 2025 year → R40,000
  exclusion → R14,480; mining/staking of R60,000 → R20,090 reward tax + R13,680
  CGT = R33,770 with the marginal rate correctly stepping to 36%; capital loss of
  R105,000 → R50,000 exclusion absorbed → **R55,000** assessed loss carried
  forward and nil tax; the same loss on revenue account → **R32,550** relief at
  31%, and **R47,250** (= 105,000 × 45%) once income crosses into the top bracket,
  where the s 20A ring-fencing banner correctly switches to its "this relief may
  not be available" wording. New patterns this phase: a **two-treatment
  calculator** where both legs are always computed so the *cost of choosing wrong*
  is the headline (rather than one mode hiding the other, as UIF does); an
  **advisory factor checklist** that reports a leaning from SARS's five factors
  and offers a one-click switch, with an explicit "unanswered" state so an
  untouched panel never nudges; full **loss-side modelling** (a distinct emerald
  hero, an annual-exclusion-reduced assessed capital loss, revenue loss relief,
  and a s 20A banner that keys off the marginal rate); a **scenario-derived
  footer** for the breakdown card (`Total Tax` / `Total Tax Due` / `Tax Saved`)
  because the bottom line genuinely changes meaning between gain, capital loss and
  revenue loss; and a **"Five SARS Rules That Catch People Out"** explainer card
  turning the guide's non-obvious findings (every swap is a disposal, no s 9C
  three-year rule, crypto is not a personal-use asset, rewards are income on
  receipt, FIFO-or-specific-ID base cost) into page content. Note: **the
  Playwright MCP was again unavailable** (`Browser is already in use` — another
  session holds the profile), so rather than fall back to SSR-only checks this
  session drove the MCP's **already-installed chromium build directly via
  `playwright-core` from the scratchpad** — which verified real interaction, not
  just SSR: ticking four factors flipped the leaning to revenue, clicking the
  suggestion switched the hero to R50,690, and typing a lower disposal value
  produced the R32,550 loss state. That recipe is now written up in §5 and
  supersedes the SSR-only fallback where screenshots or clicks are needed. Two
  layout defects were found by screenshot and fixed: the three-up hero stats
  wrapped their rand values at 390px (now `grid-cols-2 sm:grid-cols-3`), and the
  breakdown footnote icon squashed once its text wrapped. The recharts
  `width(-1) and height(-1)` SSR warning was confirmed **pre-existing** on every
  chart calc, not introduced here.

- **Phase 6 — PHASE 6 COMPLETE (this session):** Built `provisional-tax`,
  `provisional-taxpayer-check` and `home-office` (+ `/embed/` twins) following
  §2; flipped all three hub cards live and rewrote their blurbs (hub now "19 of
  29"). **Verified against primary sources read directly as PDFs**, not through
  commentary: the SARS *Guide for Provisional Tax* (GEN-PT-01-G01) — and
  usefully, the copy served today is **Revision 28, effective 29 June 2026**,
  i.e. the current 2027-year edition — and *Interpretation Note 28 (Issue 3)*.
  Both were pulled with WebFetch and extracted with `pdftotext -layout`; that
  recipe is now in §5 because WebFetch alone reports these files as "corrupted".
  All rules recorded in §4.

  **Four findings that would have been wrong if guessed — three of them
  contradicting this document's own Phase 5 predictions:**
  (1) **Bond interest is prohibited for salaried employees.** §7 previously
  listed interest among the costs a salaried claimant may deduct. IN 28 Example
  11 puts `Interest on bond of R4 500` squarely under *prohibited by s 23(m)* —
  because bond interest is deductible under s 24J rather than s 11(a)/(d) and so
  falls outside the s 23(m)(iv) exclusion, for years of assessment commencing on
  or after 1 March 2022. Every year this suite models is affected. Commission
  earners and the self-employed keep it, which is exactly why the page has three
  earner modes.
  (2) **The apportionment denominator is every building on the property**, not
  the dwelling — IN 28 Example 9 uses 253 m² (210 dwelling + 18 garage + 25
  workers' quarters) and expressly discards the 600 m² erf. Most public
  calculators use the house alone, which silently inflates every claim.
  (3) **The 8% basic-amount escalation is simple, not compounded** — the guide's
  Example 3 computes `R195 000 + (R195 000 × 8% × 4) = R257 400`. Much
  commentary compounds it.
  (4) **Directors of private companies are not automatically provisional
  taxpayers** (guide §4) unless they have other business income — the opposite of
  what older secondary sources say. Also caught and not propagated: the guide's
  own penalty example has a **typo** (it computes R51 408 then writes "R52 408
  less R38 408 = R13 000"); R51 408 is right and the arithmetic proves it.

  **Verified:** tsc clean (twice — before and after the layout fix); all 12
  checked routes (new + embed + hub + four existing calcs) return 200 with no
  compile errors; **every default and non-default state hand-checked to the
  rand against independently computed figures**, driven through a real browser:
  *Provisional tax* — R450 000 estimate at age 40 → normal tax R100 737, less
  R17 820 rebate → **R82 917**, split R41 459 / R41 459 (and R82 917
  independently cross-checks the Phase 3 `tax-bracket` hand-check for the same
  income, so the two engines agree); with R10k/R20k PAYE → R31 459 / R31 459;
  three medical members → credit **R12 072**, matching the guide's own Ms PAS
  example, tax down to R70 845; escalation of a R195 000 basic over 4 years →
  **R257 400**, reproducing guide Example 3 exactly. *Para 20 penalty* — estimate
  R200k / basic R300k / actual R280k → test amount R28 092 (the 90% leg, being
  the lesser), less R18 180 credits, **penalty R1 982**; raising the estimate to
  the basic amount correctly flips to the emerald "no penalty" safe-harbour card;
  and above R1m (estimate R800k, basic R700k, actual R1.5m) the penalty of
  **R32 452** still applies *despite the estimate exceeding the basic amount*,
  which is the whole point of that rule. *Home office* — the default state is
  deliberately **IN 28 Example 11's fact pattern** and reproduces it line for
  line (rates R1 250, repairs R1 000, bond interest R4 500 **disallowed**,
  phone/fibre R9 000 **disallowed**), tax saved R3 863 at a 36.0% marginal rate;
  switching to Commission mode reproduces **Example 10** (interest and phone flip
  to allowed, disallowed drops to R0, deduction R24 230); 16 m²/253 m² on
  R135 000 returns **R8 538** against Example 9's published R8 537 — the exact
  value is R8 537.55, so SARS truncated and the calculator rounds, a 1-rand
  presentation difference and not a math error; un-ticking any qualifying gate
  correctly zeroes the deduction; and a 120/200 m² office trips the
  primary-residence warning. *Taxpayer check* — all eight decision branches
  exercised (excluded entity, company, Commissioner notification, labour broker,
  business income, and the four combinations of the two carve-outs), with
  thresholds R99 000 at 40 and R153 250 at 70.

  **New patterns this phase:** a **decision-tool calculator** with no primary
  rand output — `provisional-taxpayer-check` returns a verdict plus an ordered
  "How We Got There" trail built by the same `useMemo` that decides the answer,
  so the explanation can never drift from the logic (each branch returns its own
  trail and exits early, mirroring how SARS applies the tests); a **rules-driven
  `Toggle`** checkbox card reused across two pages; an **optional secondary
  calculator** (the penalty checker) that stays hidden until its input is
  non-zero, keeping the main flow clean; **`disabled` inputs carrying an inline
  legal reason** rather than being hidden, so a salaried user can see *that*
  bond interest exists and *why* it is greyed out; a **three-way earner mode**
  (salary / commission / self-employed) driving which statutory prohibition
  applies; an **allowed-vs-disallowed bar chart** that makes the s 23(m)
  restriction the visual headline; and **derived-not-stored tax thresholds**
  (`rebate ÷ 18%`) so they can never drift from the rebate table.

  Two layout points: the breakdown `Row` needed `whitespace-nowrap` on the value
  and `pr-3` on the label — long labels such as "Rates, taxes & municipal charges
  × 10.0%" were splitting "R 1 250" across two lines (fixed, and worth applying
  to any future calc with long breakdown labels); and all three pages were
  checked for horizontal overflow at 390px and 1440px with none found. The
  Playwright-without-the-MCP recipe from Phase 5 worked again and is the
  recommended path.

- **Phase 7 — PHASE 7 COMPLETE (this session):** Built `vat`,
  `small-business-income-tax` and `payroll-tax` (+ `/embed/` twins) following §2;
  flipped all three hub cards live and rewrote their blurbs (hub now "22 of 29").
  **Verified against primary sources before building** — the SARS VAT pages, the
  **VAT 404 Guide for Vendors (Issue 15)** and **Interpretation Note 9 (Issue 7)**
  both pulled as PDFs and extracted with `pdftotext -layout` per §5, plus the
  SARS SBC / turnover tax / SDL / UIF / ETI rate pages and the **Budget 2026
  FAQs**. All rules recorded in §4.

  **Five findings that would have been wrong if guessed — three of them
  contradicting this document's own Phase 6 predictions:**
  (1) ⚠️ **The VAT registration thresholds changed on 1 April 2026.** §7
  previously instructed the next session to check "the compulsory registration
  threshold (R1m in 12 months) and the voluntary threshold (R50 000)". Both moved
  in Budget 2026, for the first time in 17 years: compulsory **R1m → R2.3m**,
  voluntary **R50 000 → R120 000**. The VAT calculator carries both eras behind a
  selector because pre-April-2026 periods are still open to assessment.
  (2) ⚠️ **Turnover tax was reformed in the same Budget** — qualifying turnover
  **R1m → R2.3m** and the tax-free band **R335 000 → R600 000**, with a whole new
  table, also the first change since 2009. The previous handoff did not know this
  and the SBC page would have shown a badly wrong comparison leg.
  (3) ⚠️ **Remuneration for UIF purposes excludes commission** (UIC Act s 1
  definition, confirmed in the employer guide's own three-step worksheet). Most
  payroll calculators — and payroll systems configured on gross pay — quietly
  over-deduct on commission-heavy packages.
  (4) ⚠️ **SDL and UIF use different bases.** SDL is 1% of the balance of
  remuneration **after** the para 2(4) deductions (pension, provident, RA,
  donations); UIF gets no such reduction. Same payslip, two bases. The SDL
  guide's four-step worksheet makes this explicit and it is easy to miss.
  (5) **The SBC "personal service" taint has a three-employee escape valve.**
  Income is only a personal service where the shareholder performs it personally
  **and** the entity does not employ three or more full-time unconnected people
  in that business. Public summaries usually state the professional-services
  exclusion as absolute. The calculator models the escape valve as a toggle that
  disables the personal-service input.
  Also confirmed and *not* wrongly propagated: the **VAT rate is still 15%** (the
  2025 Budget's 15.5% and 16% steps were withdrawn, so both the original Budget
  coverage and the "rate is rising" commentary are stale); the **SBC 0% band
  moved to R99 000 for 2027** while the 7/21/27% rates and the R20m limit did not
  (a Budget FAQ summary claiming "no changes to SBC" refers to the rates, not the
  threshold — the rates page is authoritative and internally consistent, since
  R18 620 = 7% × (365 000 − 99 000)); and the **s 11F cap rose R350 000 →
  R430 000 for 2027**, matching what §4 already recorded.

  **Verified:** tsc clean (three times — after each build and after the polish
  pass); all 11 checked routes (new + embed + hub + three existing calcs) return
  200 with no compile errors; **every default and non-default state hand-checked
  to the rand or the cent against independently computed figures, driven through
  a real browser** (37 scenarios in total):
  *VAT* — add 15% to R10 000 → R1 500,00 / R11 500,00 / **13.04%** of the shelf
  price; remove 15% from R11 500 → exactly back to R10 000,00 via the 15/115
  fraction; the 14% leg → R1 400,00, R11 400,00, **12.28%**, badge "14/114";
  R2.5m supplies → compulsory, R1.5m → voluntary today but **compulsory under the
  pre-April-2026 thresholds** (the whole point of the era selector); R80 000 →
  cannot register; R35m → Category C monthly; VAT201 on R500 000 / R230 000
  inclusive → R65 217,39 − R30 000,00 = **R35 217,39** payable, and the mirror
  case R100 000 / R300 000 → **R26 086,96 refund**; exclusive basis R500 000 /
  R200 000 → R75 000,00 − R30 000,00 = R45 000,00.
  *Small Business* — R650 000 taxable in 2027 → **R84 470** (R57 470 + 27% of
  R100 000), 13.0% effective, saving **R91 030** against the flat 27%'s
  R175 500; the same facts on the 2024 table → **R84 698**, confirming the base
  change; R300 000 taxable / R900 000 turnover → SBC **R14 070** vs turnover tax
  **R3 000** in 2027 but **R11 150** in 2026, which is exactly the reform in
  finding (2) made visible; disqualifying on the other-shareholdings test flips
  the hero orange and the tax to R175 500; investment income of R800 000 →
  **25.0%** tainted and disqualified; personal-service income of R900 000 →
  **30.0%** and disqualified, then the three-employee toggle drops it to **1.9%**
  and restores R84 470; one month traded → the limit correctly becomes
  **R1 666 667** and R3.2m fails; R200 000 of manufacturing plant written off
  100% → taxable R450 000 and tax **R36 470**; R100 000 in each of years 1/2/3 →
  R50 000 + R30 000 + R20 000 off, landing taxable income exactly on the
  R550 000 band boundary for **R57 470**; R90 000 taxable → nil tax, 0% marginal.
  *Payroll* — R28 000/month with R2 100 retirement, one medical member, age 34,
  2027 → PAYE **R3 239,00**, UIF **R177,12 each side** (capped at the R17 712
  ceiling), SDL **R259,00** on a leviable R25 900, **EMP201 R3 852,24**, cost to
  company **R28 436,12**, net pay **R22 483,88**; making R15 000 of it commission
  drops UIF to R130,00 a side, proving finding (3); under 24 hours a month →
  no UIF at all; a R400 000 payroll or an exempt employer → SDL nil; age 70 →
  rebate R27 585 and PAYE R2 425,25; three medical members → credit R1 006 p/m /
  R12 072 p/a and PAYE R2 609,00; R2 000/month of payroll donations → correctly
  **capped at R15 540** (5% of remuneration after the retirement deduction) with
  SDL falling to R246,05, proving finding (4); annual-mode input of R336 000 /
  R25 200 reproduces the monthly default to the cent; R200 000/month with
  R60 000/month of contributions → capped at **R430 000** and SDL on R164 167.
  *ETI* — R5 000 in month 1 → **R1 500,00** (flat band); R6 500 → **R750,00** on
  the taper; month 15 → **R375,00**; the same R6 500 on the pre-April-2025 table
  → **nil**, because R6 500 was the old ceiling; R8 000 → nil above R7 500;
  R3 000 for 80 hours → grossed up to R6 000, R1 125, scaled back to
  **R562,50**; R1 000 for 160 hours → the minimum-wage banner fires.
  All three pages were checked for horizontal overflow at **390px and 1440px**
  with none found, and embed screenshots reviewed for layout and brand.

  **New patterns this phase:** a **non-year-based calculator** — VAT has no year
  of assessment, so the tax-year `<select>` is replaced by a *rate* selector and a
  separate *threshold era* selector, which is the right shape for any future
  levy-style calculator; **three calculators on one page** (the VAT arithmetic, a
  registration verdict card, and an optional VAT201 position that stays hidden
  until its inputs are non-zero) held together because they share one subject;
  a **percentage-of-the-inclusive-price stat** (13.04%) turning the tax fraction
  into the page's insight rather than a footnote; a **three-regime comparison bar
  chart** (SBC vs flat company rate vs turnover tax) where the third bar
  disappears with an explanatory note when the turnover test fails; a
  **derived-not-stored qualification trail** reusing the Phase 6
  `provisional-taxpayer-check` pattern but rendering *all* tests with pass/fail
  icons rather than exiting at the first failure, because for section 12E the
  taxpayer needs to see every test; a **toggle that disables another input**
  (three employees greys out the personal-service field with an emerald "not a
  personal service" reason, inverting Phase 6's orange "prohibited" treatment);
  an **input-derived limit shown live in the left column** (`R20m × months ÷ 12`);
  a **highlighted rate table** reused from `tax-bracket` but for a company table;
  a **two-sided results block** ("What It Costs You" / "What They Take Home")
  splitting one payslip into the employer and employee views; and an
  **"earned vs claimable" split** for ETI, where the headline is the incentive
  earned and a banner explains why the set-off against a single employee's PAYE
  is smaller — the honest resolution of a genuine single-employee modelling limit
  (open question 14).

  One real bug found and fixed by reading the rendered page: a `Record` keyed
  `"15"` / `"14"` iterates in **ascending numeric order**, so `Object.entries`
  listed the 14% historic VAT rate above the current 15% one; the dropdown is now
  driven by an explicit order array (written up in §5). Two presentation fixes:
  the SBC band table read "R 550 001 – above / 27% + R 57 470" and now reads
  "R 550 001 and above / R 57 698 + 27%", matching SARS's own phrasing; and the
  ETI band bounds now render to the cent (R0 – R2 499,99) as SARS publishes them.
- **Phase 8 (this session):** Built `local-interest`, `foreign-dividends`,
  `retirement-savings` (+ `/embed/` twins) following §2; flipped the 3 hub cards
  live (hub now "25 of 29"). **Verified every rule against primary sources before
  building** — the SARS Interest and Dividends rates page, **Interpretation Note
  93 (Issue 3)** on foreign dividends, **Interpretation Note 115** on withholding
  tax on interest, the SARS s 11F FAQ, and — for the two points where secondary
  commentary is unreliable — the **consolidated text of the Act itself**, read
  with `pdftotext` per §5. All recorded in §4. Three findings worth carrying:
  (a) the interest exemption really has been frozen at R23 800 / R34 500 since
  2016, confirmed for all four years; (b) s 10(1)(i) **expressly carves out
  s 12T (TFSA) interest** and is limited to interest "from a source in the
  Republic", and its **part-year proviso** (days ÷ 365, from 1 Mar 2023) applies
  to every year this suite covers — both are modelled; (c) the section is worded
  for "any taxpayer who is a **natural person**" and is **not** limited to
  residents, which contradicts the usual shorthand — written up as open question
  17 rather than silently coded either way.

  Verified: tsc clean; all 6 new routes + hub + embed hub return 200 with no
  compile errors; **every default hand-computed independently in Node from §4
  and matched line by line against the rendered page** (Interest: R27 000 less
  the R23 800 exemption = R3 200 taxable × 31% = **R992**, keep R26 008, 3,7%
  effective. Foreign dividends: R100 000 × 25/45 exempt = R55 556, R44 444
  taxable, s 6quat limit R12 514 against R15 000 withheld → **R2 486 carried
  forward**, SA tax R4 819, total R19 819, **19,8% effective**. Retirement:
  27,5% × R600 000 = R165 000 ceiling, R84 000 claimed, tax R132 907 → R103 377
  = **R29 530 saved**, R4 684 221 at retirement). Non-default branches driven
  with Playwright (no MCP — the scratchpad `playwright-core` route in §5, which
  worked cleanly again): age 65+ → R34 500 exemption absorbs the whole amount;
  non-resident → R4 050 WTI and no normal tax; 183-day case → normal tax and no
  WTI; part-year 200 days → exemption R13 041 and tax R4 327; JSE-listed → 20%
  dividends tax with no s 6quat credit; 10% holding → participation exemption,
  no dividends tax row; **top bracket with no foreign tax returns exactly 20,0%
  effective, reproducing IN 93's own demonstration**, and a 26% taxpayer returns
  11,56% (= 26% × 20/45); s 11F cap-bound, taxable-income-bound, excess and
  capital-gain branches all checked, plus the 2026 year falling back to the
  R350 000 cap. Embed + hub screenshots reviewed at 1280px and 390px, no
  horizontal overflow on mobile.

  New patterns this phase: a **three-state residency `<select>` that swaps the
  whole tax regime** (normal tax ⇄ final withholding tax) rather than just a
  rate; an **allowance meter** — a plain progress bar showing exemption used vs
  remaining, with the copy flipping to "every extra rand is taxed at X%" once
  full; an **input that is deliberately excluded from the maths** (TFSA interest,
  with an emerald inline note explaining why it does not consume the exemption)
  and its mirror, an input that is **counted but never deductible** (foreign
  dividend expenses, orange s 23(f)/23(q) note) — the two ends of the same
  teaching device; a **statutory-formula credit with a cap and a carry-forward
  warning** (s 6quat(1B)(a)); a **"which limit binds" card** rendering all three
  s 11F ceilings with the binding one highlighted and named in a sentence above
  (the same shape as Phase 7's qualification trail, but for a min() rather than
  a pass/fail); an **equal-out-of-pocket comparison** in the projection (the RA
  is funded gross, the alternatives with the after-tax cost) so the three bars
  are actually comparable; and a **counterfactual grey bar** ("if no s 10B
  relief applied") that turns the relief itself into the visible result.

  One cosmetic bug found by reading the rendered page: the binding-limit sentence
  ran `label.toLowerCase()` and printed "capped by the **r**430 000 cap"; each
  limit now carries a separate `phrase` written for mid-sentence use. Two
  presentation fixes from the screenshots: the comparison bar chart's x-axis
  labels were being truncated with an ellipsis by a `tickFormatter`, so the
  series are now named short enough to fit ("This dividend" / "Local dividend" /
  "No 10B relief"); and three detail-row labels that wrapped their rand value
  onto a second line were shortened.

- **Phase 9 (this session):** Built `wear-and-tear`, `net-to-gross` and
  `hourly-to-salary` (+ `/embed/` twins) following §2; flipped the 3 hub cards
  live (hub now **"28 of 29"** — only `Property Transfer Cost` is left).

  **This was the first phase whose data is mostly not SARS**, and it was verified
  accordingly. **BGR 7 (Issue 4) was downloaded and read in full** via
  `pdftotext -layout` (the §5 technique), and the **entire 175-entry Annexure was
  extracted programmatically into `BGR7_SCHEDULE`** rather than retyped — the
  extraction caught that a widely-cited secondary source has *delivery vehicles*
  at 5 years when the Annexure says 4. BGR 7 was confirmed to still be **Issue 4**
  against the **SARS Register of all Binding General Rulings** (no Issue 5
  exists). The **R7 000 small-item threshold was checked directly against the
  SARS Budget 2026 FAQs and has not moved** — so the Phase 7 warning about
  17-year-old thresholds shifting does not bite here. The **s 23(m) question the
  brief raised is resolved**: s 23(m)(ii) expressly excludes s 11(e), so a
  salaried employee *can* claim wear and tear, which is exactly the position
  `home-office` already takes — the two pages agree. **s 12E was deliberately
  left on `small-business-income-tax`** and cross-referenced rather than
  duplicated.

  On the labour-law side, hours and multipliers came from the **official Form
  BCEA1A summary prescribed by Regulation 2**, which also settled the brief's
  4,33-vs-4,345 question outright: **s 35(4) makes it 4⅓ (52 weeks)**, and the
  page says so. The **national minimum wage** (R30,23 from 1 Mar 2026, GG 54075)
  and the **BCEA earnings threshold** (R269 600,90 from 1 May 2026, GN 7384 in
  GG 54544) were verified across all four years against two independent sources
  each — which caught **SAnews misreporting the previous EPWP rate as R15,16
  when 2025 was R15,83**. All recorded with effective dates in §4, because both
  are re-gazetted annually.

  **Verified:** tsc clean; production build clean; all 8 new routes + hub +
  5 existing calculators return 200 with no compile errors. **Math hand-checked
  against §4 for defaults and for 21 non-default states driven through a real
  browser** — wear & tear across straight-line vs diminishing-value (R16 889
  claimed with R7 111 residual on a 3-year asset, matching BGR 7 Example 1's
  1÷life rate), a 3-month first year (R2 000, with the write-off tail correctly
  running into a **fourth** year of assessment), 60% business use (R4 800/yr,
  R9 600 permanently non-deductible), the small-item full write-off and its
  suppression by the part-of-a-set toggle, the s 23C VAT strip
  (24 000 ÷ 1,15 → R6 957/yr), moving costs and a second-hand life override;
  net-to-gross at R36 901/month for a R30 000 target and at R41 001 with a 10%
  retirement contribution (both landing on the *same* R442 815 taxable income —
  a useful cross-check), with medical members, a below-threshold target (PAYE
  nil) and the monthly/yearly toggle; and hourly-to-salary across a below-minimum
  rate, overtime, Sundays at 2× and 1,5×, an over-cap overtime breach, an
  above-threshold salary and the reverse direction (R15 000 ÷ (4⅓ × 45) =
  R76,92). Every figure reproduced by hand first. Embed + hub screenshots
  reviewed at 1440px and 390px.

  **Two bugs found and fixed during verification**, both in code that looked
  right: net-to-gross was passing a fixed R1 000 raise through the
  monthly/yearly converter and telling the user "a raise of R83 moves your
  take-home by R58"; and hourly-to-salary retained overtime/Sunday/public-holiday
  state when switched to reverse mode, so the composition chart could show
  components that were not in the gross. One cosmetic fix from the screenshots:
  the pay-composition bar chart rendered a single enormous bar in the default
  state and now shows an empty-state line until there is more than one component.

  New patterns this phase: a **175-entry `<optgroup>` dropdown driven from a
  verbatim published schedule**, with an "Other" escape hatch that swaps in a
  user-supplied useful life; a **year-by-year write-off schedule table** whose
  selected row is driven by a Stepper and highlighted in both the table and the
  bar chart; a **schedule builder that consumes remaining value rather than
  assuming a fixed row count**, which is what makes the part-year tail fall into
  an extra year correctly; a **threshold rule that changes shape rather than
  amount** (the small-item full write-off, with two toggles that switch it off);
  a **bisection solver run against the suite's own forward PAYE engine** —
  the first calculator in the suite that inverts rather than evaluates, with the
  reason for iterating over algebra written into the code comment; a
  **cost-to-company card** adding employer UIF and SDL on top of the solved
  gross; a **rates-at-a-glance grid** showing what one hour is worth at each
  statutory multiplier; and a **compliance checklist card** (`CheckRow`) that
  reports pass/fail against statute rather than computing money — the first of
  its kind in the suite, and the reason for open question 30.

  ⚠️ **Read the new §5 note before verifying anything.** The Turbopack panic
  returned in a far more dangerous form than Phase 5's: the dev server kept
  serving 200s and correct SSR while reloading the page in a loop, so React never
  stayed hydrated and every browser-driven scenario silently reported the
  **default** numbers. It looked like a clean pass. **Verify against a production
  build** (`npm run build && PORT=3005 npm run start`), not the dev server.

  **One defect logged, not fixed:** `tax-calculator` has no 2027 tax year and
  hard-codes the R350 000 retirement cap — see open question 26. It is a
  signed-off Phase 0 page, so it was flagged rather than changed; §7 asks
  Phase 10 to fix it first.
- **Phase 10 (this session) — the registry is finished.** Two pieces of work:

  **1. Q26 fixed first, as §7 instructed.** `tax-calculator` — the suite's
  most-visited page and the only one still stuck on Phase 0's data — now has the
  **2027 year of assessment** (brackets, rebates 17820/9765/3249 and medical
  credits 376/376/254 from §4) and a **per-year `retirementCap`** field on
  `TAX_DATA`, replacing the hard-coded `retirementCapFixed = 350000`. 2027 gets
  **R430 000**, 2024–2026 keep R350 000, the default year moved 2026 → 2027, and
  the input hint now interpolates the year's cap instead of stating R350 000 for
  every year. Verified live: 2027 present and default; R35 000/month → taxable
  R420 000, tax before rebates **R91 437**, rebate **R17 820** (all hand-checked
  against §4); and on R200 000/month gross with R50 000/month RA the taxable
  income is **R1 970 000 on 2027** vs **R2 050 000 on 2026** — exactly the
  R80 000 cap difference, so the per-year cap is demonstrably live rather than
  merely present in the data.

  **2. `property-transfer-cost` built** (+ `/embed/property-transfer-cost`), hub
  card flipped live — **hub now "29 of 29", no "Coming soon" cards left.** This
  calculator is a different shape to everything before it: **three cost stacks,
  only one of which is a tax**, each from a different legal source with a
  different effective date. All three verified against primary sources and
  recorded in §4 — the SARS Transfer Duty rate table and Transfer Duty Guide
  (Issue 6), the Deeds Office Schedule of Fees of Office in GG 54225 / GN 7180 of
  27 February 2026 (read out of the gazette PDF itself, scanned pages included),
  and the LSSA Guideline of Fees Column B schedule.

  **What the research settled, and what it did not:**
  - **The Feb 2026 Budget did NOT move the transfer duty bands.** §7 warned to
    check, because Phases 7 and 9 both found "frozen" thresholds that had quietly
    moved. This time the SARS page — last updated on Budget day itself — says
    "2027 (With effect from 1 April 2026) – No changes from last year". So the
    page carries **two** tables, not four: from 1 April 2025 (nil band
    R1 210 000) and 1 Mar 2023 – 31 Mar 2025 (nil band R1 100 000).
  - **The effective-date mismatch §7 predicted is real**, and worse than expected:
    SARS's own "2025" transfer duty year runs **13 months**. The year selector is
    therefore labelled by acquisition-date range, and the page tells the user the
    date that matters is the **last signature on the agreement**, not transfer.
  - **The conveyancing tariff was shipped, clearly labelled, and behind a toggle.**
    §7 left this open as a client decision. It ships because omitting the largest
    line on a cost statement would make the page read as broken — but it is headed
    "LSSA guideline", called a non-binding guideline in bold in the disclaimer,
    given a section of the explainer on why it is negotiable, and can be switched
    off entirely, leaving only transfer duty and the gazetted Deeds Office fees.
    **This still needs the client's yes — see new Q31.**
  - **The LSSA figures rest on a cross-check, not the primary PDF** (the LSSA does
    not publish it). Accepted only because the schedule is internally consistent
    at every band boundary *and* reproduces a second independent source's table to
    the rand at five price points. Flagged as new Q32.

  **New patterns this phase:** a **three-way seller-status toggle** driving a hard
  either/or (transfer duty ⊕ VAT at 15% ⊕ zero-rated going concern) rather than a
  numeric variation; a **flat-banded fee lookup** (`bandedFee`) alongside the
  suite's usual progressive-bracket engine, because the Deeds Office charges one
  amount per band; a **"or part thereof" step tariff** via `Math.ceil` for the
  LSSA schedule; a **greater-of dutiable value** with an inline hint when fair
  value displaces the price; a **band-by-band duty trail** mirroring the Transfer
  Duty Guide's own Step 1/2/3 presentation; a **guideline on/off toggle** so a user
  can see only the amounts fixed by law; a **penalty-interest leg** (s 4(1A), 10%
  p.a. per completed month) behind a toggle plus Stepper; and a **"What Each Number
  Comes From"** card naming the statute, gazette or guideline behind each of the
  three stacks — worth reusing wherever a calculator mixes legal sources of
  different authority.

  **Verification:** `tsc` clean; production build clean; all 8 checked routes
  (new + embed + hub + `tax-calculator` + spot-checks) return **200**; **43
  assertions across 9 scenarios passed under Playwright against the production
  build**, every scenario reporting different numbers (so hydration is proven, per
  the Phase 9 note). Scenarios covered: defaults (R2m price / R1.8m bond / 2027 →
  duty **R33 786**, attorneys **R82 375**, Deeds Office **R3 580**, total
  **R122 241** = 6.11% of price, with the 3%/6% band split checked line by line);
  a nil-band cash purchase; **the same R1.2m price switched to the 2025 era, which
  correctly turns R0 of duty into R3 000** — the sharpest test that the era
  selector is wired to the right table; a VAT vendor (duty → R0, R260 870 shown as
  VAT inside the price); a going concern; three and twelve months of late-payment
  interest (**R845** and **R3 379**); guideline fees switched off; fair value
  displacing the price; and R15m in the top 13% band (duty **R1 461 156**). Every
  figure independently hand-computed from §4 in a standalone Node script first,
  then compared to the live page. Desktop, mobile (420px) and hub screenshots
  reviewed for layout/brand. Two cosmetic fixes came out of the screenshots: the
  chart's four x-axis labels collided (shortened to Duty/Attorneys/Deeds/Sundries)
  and the chart card stretched to match the much taller Detailed Calculation card
  (`self-start`).

  **No defects found outside this phase's scope.** But see §7 — the Q26 fix
  suggests a cheap sweep for other hard-coded constants that predate the 2027
  year. _(Next session: append your phase here.)_
