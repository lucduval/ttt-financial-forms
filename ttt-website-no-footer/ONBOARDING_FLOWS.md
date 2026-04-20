# Onboarding Form Flows

How the four onboarding services (Tax, Insurance, Financial Advisory, Accounting) collect, route, and notify. Use this as the source of truth for what each form does in production.

---

## Shared entry point

1. User lands on [app/(main)/onboarding/page.tsx](app/(main)/onboarding/page.tsx) (or the iframe-embedded variant [app/embed/onboarding/page.tsx](app/embed/onboarding/page.tsx)).
2. [ServiceSelection.tsx](app/components/ServiceSelection.tsx) shows four buttons: **Tax / Insurance / Accounting / Financial Advisory**.
3. Selection routes to the right form component:
   - Tax / Insurance / Advisory → [SimpleOnboardingForm.tsx](app/components/SimpleOnboardingForm.tsx)
   - Accounting → [ClientOnboardingForm.tsx](app/components/ClientOnboardingForm.tsx)
4. On submit, the form calls `submitTargetData(data, serviceType)` in [app/actions.ts](app/actions.ts).
5. `submitTargetData`:
   - Maps `serviceType` → Dynamics `riivo_leadtype` code
   - Assigns the owner (systemuser for tax/insurance/advisory, team for accounting)
   - Creates (or updates) the lead in Dynamics CRM
   - Uploads any file attachments as annotations
   - Fires two emails in parallel: **team notification** + **client thank-you**

---

## Tax

### What is collected
Single-page form — [SimpleOnboardingForm.tsx](app/components/SimpleOnboardingForm.tsx).

| Field | Required | Notes |
|---|---|---|
| Client Type | Yes | Individual / Business / Private Co. / CC / Trust / Sole Prop |
| Full Name | Yes | |
| Email | Yes | |
| Phone | Yes | |
| **Industry** | Yes | Tax-only field, dropdown sourced from Dynamics `riivo_industries` |
| Message | Yes | Free text |

### Dynamics lead
- `riivo_leadtype = 100000000`
- Owner: `/systemusers(873db3ff-d563-f011-bec3-000d3ab7e7df)` → **From TTT Tax Crew** (taxcrew@ttt-tax.co.za)
- `riivo_Industry_lookup@odata.bind` populated from selection

### Emails

**Team notification** (sent to):
- sheri@ttt-tax.co.za (Sheri-Lee Parasaraman)
- taxcrew@ttt-tax.co.za
- tori@ttt-tax.co.za (Tori Estment)

Subject: `New Tax Lead — {client name}`
Shows: Name, Email, Phone, Client Type, **Industry**, Notes, link to lead in CRM.
Reply-To: the client's email.

**Client thank-you:**
Subject: `TTT Tax Services — Thank You for Your Submission`
Branded as **TTT Tax Services**. Body references "our tax services". Contact line: `Tel: 010 442 9222 | Email: admin@ttt-tax.co.za`. Reply-To: admin@ttt-tax.co.za.
**Attachment:** `TTT - Tax Services - Letter of Engagement.pdf` (sourced from [public/attachments/tax-letter-of-engagement.pdf](public/attachments/tax-letter-of-engagement.pdf); additional service attachments can be added via `SERVICE_ATTACHMENTS` in [app/lib/email.ts](app/lib/email.ts)).

---

## Insurance

### What is collected
Single-page form — [SimpleOnboardingForm.tsx](app/components/SimpleOnboardingForm.tsx).

| Field | Required |
|---|---|
| Client Type | Yes |
| Full Name | Yes |
| Email | Yes |
| Phone | Yes |
| Message | Yes |

No ID/Tax/Industry fields.

### Dynamics lead
- `riivo_leadtype = 463630002`
- Owner: `/systemusers(c1c0e06f-4292-f011-b4cc-002248a3b06f)` → **Netasha Botha** (netasha@ttt-insurance.co.za)

### Emails

**Team notification** (sent to):
- netasha@ttt-insurance.co.za
- brandon@ttt-group.co.za (Brandon Wanless)

Subject: `New Insurance Lead — {client name}`
Shows: Name, Email, Phone, Client Type, Notes, link to lead in CRM.
Reply-To: the client's email.

**Client thank-you:**
Subject: `TTT Financial Group — Thank You for Your Submission`
Branded as **TTT Financial Group**. Body references "our insurance services". Contact line: `Tel: 010 442 9222 | Email: admin@ttt-insurance.co.za`. Role term: "Insurance Advisor". Reply-To: admin@ttt-insurance.co.za.

---

## Financial Advisory

### What is collected
Single-page form — [SimpleOnboardingForm.tsx](app/components/SimpleOnboardingForm.tsx).

| Field | Required |
|---|---|
| Client Type | Yes |
| Full Name | Yes |
| Email | Yes |
| Phone | Yes |
| Message | Yes |

No ID/Tax/Industry fields.

### Dynamics lead
- `riivo_leadtype = 463630001`
- Owner: `/systemusers(b8b57de7-68ae-f011-bbd2-7c1e5235f015)` → **Andrew Bayley** (andrew@ttt-finance.co.za)

### Emails

**Team notification** (sent to):
- andrew@ttt-finance.co.za
- cameron@ttt-tax.co.za (Cameron Drysdale)

Subject: `New Advisory Lead — {client name}`
Shows: Name, Email, Phone, Client Type, Notes, link to lead in CRM.
Reply-To: the client's email.

**Client thank-you:**
Subject: `TTT Financial Group — Thank You for Your Submission`
Branded as **TTT Financial Group**. Body references "our financial advisory services". Contact line: `Tel: 010 442 9222 | Email: admin@ttt-finance.co.za`. Role term: "Financial Advisor". Reply-To: admin@ttt-finance.co.za.

---

## Accounting

### What is collected
3-step form — [ClientOnboardingForm.tsx](app/components/ClientOnboardingForm.tsx).

**Step 1 — Your Details**
- Client Type (if not Individual, Company Name becomes required)
- Registered Company Name (conditional)
- Full Name, Email, Phone
- Services (3-tab selection):
  - **Registrations:** Company, VAT, PAYE, Public Officer, Financial Statements, Other (+ description)
  - **Retainer:** Full Accounting Service + retainer notes
  - **Other Services:** Management Accounts (Quarterly), Final Year End Accounts, Company Tax Return, Company Provisional Return, Personal Tax Returns, Personal Provisional Return, CIPC Annual Return

On advancing from Step 1 → Step 2 a **background lead is created** in Dynamics with `sendEmails: false`, so the lead is captured even if the user abandons mid-flow. Final submit updates that same lead.

**Step 2 — Document Uploads**
- CIPC / COR14.3 Registration file
- Other documents (multiple files allowed)
- Files are base64-encoded and uploaded as Dynamics `annotations` attached to the lead.

**Step 3 — Review & Submit**
- Additional notes (free text)
- Optional Calendly consultation booking

### Dynamics lead
- `riivo_leadtype = 100000001`
- Owner: `/teams(926b8d46-212c-f111-88b3-7c1e523455ba)` → existing accounting team
- Service booleans mapped to CRM fields (`riivo_vatregistrationfiling`, `riivo_annualfinancialstatements`, `riivo_corporatetaxreturns`, `riivo_monthlybookkeeping`, `riivo_payrollservices`, `riivo_companysecretarial`, `riivo_businessadvisory`, `riivo_independentreviewaudit`)
- `riivo_notes` contains a formatted summary (company, notes, selected services)

### Emails

**Team notification** (sent to):
- roscoe@ttt-tax.co.za
- james@ttt-accounting.co.za
- kelly@ttt-accounting.co.za
- jannes@ttt-accounting.co.za

Subject: `New Accounting Lead — {client name}`
Shows: Name, Email, Phone, Client Type, Company, Selected Services, Notes, link to lead in CRM.
Reply-To: the client's email.

**Client thank-you:**
Subject: `TTT Adaptive Accounting — Thank You for Your Submission`
Branded as **TTT Adaptive Accounting**. Body references "our accounting services". Contact line: `Tel: 010 442 9222 | Email: registrations@ttt-tax.co.za`. Role term: "Designated Accountant". If a Calendly consultation was booked, date/time/accountant are shown. Reply-To: registrations@ttt-tax.co.za.

---

## Environment variables (production)

Set in [.env.production](.env.production):

```
# Graph / Dynamics auth
DYNAMICS_TENANT_ID
DYNAMICS_CLIENT_ID
DYNAMICS_CLIENT_SECRET
DYNAMICS_RESOURCE_URL=https://ttt-financial-group2.crm4.dynamics.com/

# Sender (Graph mailbox that issues all outbound mail)
EMAIL_SENDER_ADDRESS=registrations@ttt-tax.co.za

# Per-service Dynamics owners (systemuser GUIDs)
DYNAMICS_TAX_OWNER_ID       = 873db3ff-d563-f011-bec3-000d3ab7e7df
DYNAMICS_INSURANCE_OWNER_ID = c1c0e06f-4292-f011-b4cc-002248a3b06f
DYNAMICS_ADVISORY_OWNER_ID  = b8b57de7-68ae-f011-bbd2-7c1e5235f015

# Accounting falls back to this team if no per-service owner matches
DYNAMICS_OWNER_TEAM_ID      = 926b8d46-212c-f111-88b3-7c1e523455ba

# Per-service team notification recipients (comma-separated)
EMAIL_TAX_ADDRESSES       = sheri@ttt-tax.co.za, taxcrew@ttt-tax.co.za, tori@ttt-tax.co.za
EMAIL_INSURANCE_ADDRESSES = netasha@ttt-insurance.co.za, brandon@ttt-group.co.za
EMAIL_ADVISORY_ADDRESSES  = andrew@ttt-finance.co.za, cameron@ttt-tax.co.za
EMAIL_TEAM_ADDRESSES      = roscoe@ttt-tax.co.za, james@ttt-accounting.co.za, kelly@ttt-accounting.co.za, jannes@ttt-accounting.co.za
```

Per-service branding (brand name, contact phone/email, role term) is **hardcoded** in [`SERVICE_BRANDING`](app/lib/email-templates.ts) — edit there to change copy.

---

## Key files

| Purpose | File |
|---|---|
| Service selection | [app/components/ServiceSelection.tsx](app/components/ServiceSelection.tsx) |
| Tax / Insurance / Advisory form | [app/components/SimpleOnboardingForm.tsx](app/components/SimpleOnboardingForm.tsx) |
| Accounting form (3-step) | [app/components/ClientOnboardingForm.tsx](app/components/ClientOnboardingForm.tsx) |
| Submission + Dynamics write + owner routing | [app/actions.ts](app/actions.ts) |
| Dynamics REST helpers (token, create/update) | [app/lib/dynamics.ts](app/lib/dynamics.ts) |
| Email send (Graph) + per-service recipient + replyTo | [app/lib/email.ts](app/lib/email.ts) |
| Email HTML templates + per-service branding | [app/lib/email-templates.ts](app/lib/email-templates.ts) |

---

## Quick test checklist

For each service, submit a test lead and verify:

- [ ] Lead appears in Dynamics with the correct `riivo_leadtype`
- [ ] Lead **owner** matches the table above (tax → TaxCrew user, insurance → Netasha, advisory → Andrew, accounting → team)
- [ ] Team notification email lands in the right inboxes only (no cross-pollination)
- [ ] Team email subject starts with `New {Service} Lead —`
- [ ] Client thank-you subject starts with the correct brand name
- [ ] Client thank-you signature/contact line matches the service brand
- [ ] For **tax**: Industry row is visible in the team email
- [ ] For **accounting with Calendly booking**: consultation details appear in client email
- [ ] Replying to the client thank-you routes to the right admin inbox
