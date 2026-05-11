# Letter of Engagement — Digital Signing Flow

Implementation plan for adding an optional in-app Letter of Engagement (LoE) signing flow after a client completes the Tax signup form.

---

## 1. Goals & Scope

### Functional goals
- After a client successfully submits the Tax onboarding form, present them with a choice:
  - **"Sign Letter of Engagement now"** — proceed into an in-app signing experience.
  - **"I'll do this later"** — close the flow; the LoE PDF is still attached to the existing client thank-you email (no regression).
- Signing flow must:
  1. Display the full Terms & Conditions from `TTT - Tax Services - Letter of Engagement Digital.pdf` as readable HTML in the browser (scrollable, mobile-friendly).
  2. Require the client to tick an "I have read and agree" checkbox before signing is enabled.
  3. Capture a legally meaningful signature (drawn on canvas + typed full name + timestamp + IP + user-agent).
  4. Generate a signed PDF containing the original LoE content, the signature image, signed-by metadata, and a unique document ID.
  5. Upload the signed PDF back to the Dynamics lead/contact record as an `annotation` (the same mechanism already used for intake file attachments).
  6. Email the signed PDF to the client and to the tax team for record-keeping.

### Out of scope (explicitly)
- No third-party eSign integrations for v1 (DocuSign / SignNow). A self-hosted signing flow avoids per-envelope costs and keeps the signing artifact inside Dynamics from day one. DocuSign is called out in §9 as a future upgrade path.
- No changes to the Insurance / Advisory / Accounting flows. LoE signing is tax-specific for v1 (matches the existing `SERVICE_ATTACHMENTS` mapping — only Tax has an LoE attached today).

---

## 2. Current-State Reference

Key existing touchpoints this plan integrates with:

| Concern | File | Notes |
|---|---|---|
| Tax form + post-submit thank-you UI | [app/components/SimpleOnboardingForm.tsx:83-115](app/components/SimpleOnboardingForm.tsx#L83-L115) | In-page confirmation. No dedicated route today. |
| Server action that creates Dynamics lead | [app/actions.ts](app/actions.ts) (`submitTargetData`, approx L115-L299) | Creates `new_leads` entity, uploads intake files as `annotations`, then sends emails. Returns — we'll need it to **also return the Dynamics lead ID** so the client can hand it to the signing flow. |
| Email + LoE attachment | [app/lib/email.ts](app/lib/email.ts) (`SERVICE_ATTACHMENTS` L25-L46) | Tax thank-you email already attaches the LoE PDF. We'll keep this for the "later" path; for the "now" path we'll replace it with the signed PDF. |
| Dynamics client | [app/lib/dynamics.ts](app/lib/dynamics.ts) | `createRecord` / `updateRecord` / `getRecords`. Annotation upload already pattern-established in `submitTargetData`. |
| LoE source PDF | [public/attachments/tax-letter-of-engagement.pdf](public/attachments/tax-letter-of-engagement.pdf) | 578KB. Source of truth for the T&Cs text. |
| Flow documentation | [ONBOARDING_FLOWS.md](ONBOARDING_FLOWS.md) | Update at the end to describe the new step. |

---

## 3. User Flow

```
Tax form submit (SimpleOnboardingForm)
        │
        ▼
submitTargetData(...) → Dynamics lead created, emails sent
        │  returns { leadId }
        ▼
Thank-you screen (existing) — BUT service === 'tax' now also shows:
        ┌─────────────────────────────────────────────┐
        │ Complete your Letter of Engagement          │
        │ [ Sign now ]     [ I'll do this later ]     │
        └─────────────────────────────────────────────┘
        │
        ├── "Later" → existing CTAs ("Submit another", "Homepage")
        │
        └── "Sign now" → navigate to /onboarding/loe/[leadId]?token=<hmac>
                  │
                  ▼
           LoE signing page:
             1. Client details header (prefilled from lead)
             2. Scrollable T&Cs (full HTML)
             3. "I have read and agree" checkbox (must scroll to enable)
             4. Full legal name field
             5. Signature canvas (draw with mouse/finger)
             6. Metadata shown: date, document version
             7. [ Sign & Submit ]
                  │
                  ▼
           Server action: signLoE({ leadId, token, fullName, signaturePngDataUrl, userAgent })
             - validates token (HMAC of leadId + secret, short TTL)
             - re-fetches lead from Dynamics (authoritative name/email)
             - generates signed PDF (see §6)
             - uploads PDF as `annotation` on the lead
             - writes custom fields on the lead (see §7)
             - emails signed PDF to client + tax team
             - returns success
                  │
                  ▼
           Final confirmation screen ("Your LoE is signed — a copy has been emailed to you.")
```

---

## 4. Routing & Pages

New routes under the existing App Router:

- `app/(main)/onboarding/loe/[leadId]/page.tsx` — the signing page (server component that fetches lead data, passes to a client component for the interactive signing UI).
- `app/embed/onboarding/loe/[leadId]/page.tsx` — iframe variant (matches the existing `/embed/onboarding` pattern). Shares the same client component.
- `app/components/LoeSigningForm.tsx` — client component holding the T&Cs, checkbox, canvas, and submit handler.
- `app/components/LoeTermsContent.tsx` — pure presentational component containing the T&Cs as JSX. Single source of truth for the on-screen terms; also imported by the PDF renderer (§6) so the signed PDF's narrative matches what the user read.

**Why a per-leadId route instead of storing state in the form?** It lets the client return via the email link to sign later without re-filling the form, and it makes the signing URL shareable/forwardable (with a signed token to prevent tampering).

---

## 5. Security: Signing Link Token

The signing URL is `/onboarding/loe/[leadId]?token=<hmac>`.

- `token = HMAC_SHA256(secret=LOE_SIGNING_SECRET, message=leadId + ':' + issuedAtUnix)` (base64url).
- The issued-at timestamp is embedded in the token payload (e.g. `<issuedAtUnix>.<hmac>`) so the server can reject tokens older than **72 hours**.
- Server action rejects the request if:
  - Token signature is invalid.
  - Token is expired.
  - Lead already has `riivo_loe_signed = true` (prevents double-signing — see §7).
- New env var: `LOE_SIGNING_SECRET` (32+ random bytes, added to `.env.local` and production config).

This is intentionally lighter than full auth: the lead has just come from a form submission, we're re-binding identity at sign time via the Dynamics lookup, and the signed artifact itself is the audit trail.

---

## 6. Signed PDF Generation

Use [`pdf-lib`](https://github.com/Hopding/pdf-lib) (pure-JS, works server-side in the Next.js server action without a headless browser).

**Approach A — preferred for v1:** Take the existing `public/attachments/tax-letter-of-engagement.pdf`, load it with pdf-lib, and **append a final "Signature Page"** containing:
- Client full legal name (typed)
- Signature image (PNG from canvas) embedded as `drawImage`
- Signed date (ISO 8601, SAST)
- Lead ID (Dynamics GUID)
- Document SHA-256 hash of the original LoE bytes (proves which version was signed)
- Client IP address and user-agent captured server-side
- A generated unique `LoE Reference ID` (e.g. `TTT-LOE-<leadId shortened>-<yyyyMMdd>`)

This avoids re-typesetting the legal text and guarantees the signed artifact contains the exact legal language TTT already approved. The on-screen HTML T&Cs (`LoeTermsContent.tsx`) is a faithful transcription of the same PDF — include a short note on the signature page: *"The preceding document was displayed on-screen and acknowledged by the signatory."*

**Approach B — fallback:** Build the PDF entirely in pdf-lib from a structured representation of the terms. Only worth doing if Legal wants a custom dynamic template later.

---

## 7. Dynamics CRM Persistence

Two writes per successful signing:

### 7a. Annotation (file attachment) — existing pattern
Use the same `annotations` entity upload already in `submitTargetData`. POST to `/annotations` with:
```
{
  "objectid_lead@odata.bind": "/leads(<leadId>)",
  "subject": "Signed Letter of Engagement",
  "filename": "TTT-LoE-Signed-<YYYY-MM-DD>-<shortLeadId>.pdf",
  "mimetype": "application/pdf",
  "documentbody": "<base64 signed PDF>"
}
```

### 7b. Custom lead fields — audit trail
Add (or confirm with CRM admin) these fields on `new_leads`:
- `riivo_loe_signed` (Boolean) — set to `true`.
- `riivo_loe_signed_at` (DateTime) — ISO timestamp.
- `riivo_loe_signed_name` (Text) — typed full name.
- `riivo_loe_reference` (Text) — the `TTT-LOE-...` reference ID.
- `riivo_loe_ip` (Text) — client IP.

**Action item:** confirm these field logical names with the Dynamics admin before building. If any field doesn't exist yet, either request it or collapse the audit trail into a single multiline text field (`riivo_loe_audit`) as a fallback.

Write via `updateRecord('leads', leadId, { ... })` using the existing [app/lib/dynamics.ts](app/lib/dynamics.ts) helper.

---

## 8. Email Changes

Two emails on successful signing, sent via the existing Graph API helper in [app/lib/email.ts](app/lib/email.ts):

1. **To client** — "Your signed Letter of Engagement" — short confirmation, signed PDF attached.
2. **To tax team** (same recipients as current tax team notification: sheri / taxcrew / tori) — "LoE signed by <client name>" — signed PDF attached, link to Dynamics lead.

**Change to the existing client thank-you email:** Keep the unsigned LoE attached by default (covers the "later" path). No change needed if the client picks "later". For the "now" path, the signed-confirmation email above supersedes it.

---

## 9. Future upgrade: third-party eSign

If Legal later requires independent witnessing / tamper-evident audit logs / POPIA-aligned signing certificates beyond what a self-hosted flow produces, migrate to DocuSign or SignNow:
- Keep the "Sign now / later" UI exactly as built.
- Replace the `/onboarding/loe/[leadId]` page with a server action that creates an envelope and redirects to the provider's signing UI.
- Webhook from provider → same `signLoE` completion logic (download signed PDF, store in Dynamics, email).

The abstraction boundary for an easy swap: isolate the "create signed PDF from inputs" step behind a single function so it can be replaced by "download signed PDF from provider".

---

## 10. Implementation Steps (ordered)

1. **CRM prep** — confirm / create the `riivo_loe_*` custom fields on the lead entity (blocker for §7b). Get the attachment upload endpoint confirmed with the existing annotation pattern.
2. **Return `leadId` from `submitTargetData`** — currently the function fires and returns; update it and the form caller so the thank-you screen has the lead GUID. Mint the signing token here and pass it down too.
3. **Thank-you screen branch** — in [SimpleOnboardingForm.tsx:83-115](app/components/SimpleOnboardingForm.tsx#L83-L115), when `serviceType === 'tax'` show the two-button LoE choice above the existing CTAs.
4. **Build `LoeTermsContent.tsx`** — transcribe the LoE PDF content into JSX. Manual transcription (review with Sheri / Tori before shipping).
5. **Build `LoeSigningForm.tsx`** — scrollable terms, agreement checkbox (unlocked only after scroll-to-bottom), typed full name input, canvas signature pad (use [`react-signature-canvas`](https://www.npmjs.com/package/react-signature-canvas) or a ~50-line hand-rolled version), submit button.
6. **Signing server action** — `signLoE(input)` that validates the token, re-reads the lead, generates the signed PDF with `pdf-lib`, uploads as annotation, updates lead fields, sends both emails. Idempotent on re-submit (check `riivo_loe_signed`).
7. **Success screen** — after sign, replace the form with a confirmation state (green check, "signed on <date>", link to homepage).
8. **Embed variant** — mirror the route under `/embed/` so it works inside the marketing-site iframe.
9. **Env vars** — add `LOE_SIGNING_SECRET` to `.env.local` and production, document in `ONBOARDING_FLOWS.md`.
10. **Docs** — update [ONBOARDING_FLOWS.md](ONBOARDING_FLOWS.md) with the new Tax post-signup step.

---

## 11. Testing Plan

- **Happy path:** submit tax form → click Sign now → scroll terms → tick checkbox → draw signature → submit → verify (a) annotation exists on the Dynamics lead with a valid PDF, (b) both emails arrive with the signed PDF, (c) audit fields are populated on the lead.
- **Later path:** submit tax form → click "I'll do this later" → verify existing thank-you email still arrives with the unsigned LoE attached, and no Dynamics annotation beyond intake is created.
- **Token tampering:** edit the `token` query param → server rejects with a clear error; UI shows "signing link is invalid or expired — please contact us".
- **Token expiry:** force a token >72h old → same rejection.
- **Double-signing:** submit the signing form twice (e.g. double-click) → second attempt returns the existing signed PDF or a "already signed on X" message; no duplicate annotation.
- **Mobile signature canvas:** verify touch drawing on iOS Safari and Android Chrome.
- **Iframe embed:** verify the `/embed/onboarding/loe/[leadId]` route works inside the marketing site's iframe, including that the success state renders correctly (no popup/top-level navigation that would be blocked).
- **PDF integrity:** open the generated PDF, confirm the original LoE pages are unchanged and the signature page renders legibly.

---

## 12. Open Questions for Stakeholders

- **Legal:** does a self-hosted typed-name + drawn-signature + audit metadata flow satisfy POPIA and internal compliance, or is a certificate-backed provider (DocuSign) required from day one?
- **Tax team:** should the unsigned-LoE attachment be removed from the default thank-you email once the "sign now" option exists, so clients aren't confused by two copies?
- **Dynamics admin:** approval on the new `riivo_loe_*` fields (or preferred naming).
- **Design:** wording of the choice screen — "Sign now / Later" vs. "Complete engagement / I'll do this later" — and whether to show it as a banner on the thank-you screen or as a modal.
