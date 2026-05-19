# PRD — WordPress Contact Form Iframe Replacement

| Field | Value |
| --- | --- |
| Author | Luc Duval |
| Date | 2026-05-19 |
| Status | Approved — ready for implementation |
| Owner (Eng) | TTT web team |
| Owner (Biz) | TTT Tax Services — Lead Ops |
| Related precedents | `/embed/onboarding`, `/embed/tax-calculator` |

---

## 1. Problem Statement

The TTT public website (WordPress) currently renders a custom contact form in its footer. Submissions reach the team by email (via a WP plugin) but **do not create a record in Microsoft Dynamics CRM**. The team manually re-keys leads — error-prone, slow, and the source of lost or mis-routed prospects.

The Next.js project already serves two iframe-embedded forms (`/embed/onboarding`, `/embed/tax-calculator`) that write to Dynamics and notify the team via Microsoft Graph email. The same pattern can replace the WordPress contact form.

## 2. Goal & Success Metric

**Goal:** Every contact-form submission lands in Dynamics as a `new_leads` record with `riivo_leadsource = 463630001` (Website) AND triggers a team notification email — with zero manual data entry.

**Primary metric:** ≥99% of contact-form submissions appear in Dynamics within a rolling 7-day window, measured as:

```
count(new_leads WHERE riivo_leadsource = 463630001
                  AND subject LIKE 'Website Contact —%')
  /
count(EMAIL_TEAM_ADDRESSES inbox messages WHERE subject LIKE 'New Website Contact —%')
  ≥ 0.99
```

**Secondary signals:** Zero increase in inbound "I submitted a form and never heard back" complaints; no manual lead creation needed for footer submissions.

## 3. Users & Pain Point

| User | Pain today | Resolution |
| --- | --- | --- |
| Website visitor | Fills form, hopes someone replies. No on-screen confirmation that lead is tracked. | Sees "Message sent!" panel; visitor flow unchanged. |
| TTT Lead Ops | Receives email; must manually create a Dynamics lead and route it. | Lead is auto-created with source + team owner; team email is informational only. |
| TTT WP developer | Must maintain WP plugin / form templates. | Replaces form with single `<iframe>` snippet; no further WP-side maintenance. |

---

## 4. Solution & File Plan

### 4.1 Functional behaviour (end-to-end)

1. Visitor lands on a WordPress page with the new iframe embedded where the old form sat.
2. Iframe loads `https://{prod-domain}/embed/contact` (no header, no Next chrome).
3. Visitor fills five fields: **First Name, Last Name, Email Address, Contact Number, Message / Question** — all required.
4. Visitor clicks **SEND MESSAGE**.
5. The browser invokes the `submitContactForm` Server Action with the typed payload.
6. The action creates a `new_leads` record in Dynamics with name/email/phone/description, plus `riivo_leadsource = 463630001` and `ownerid` bound to `DYNAMICS_OWNER_TEAM_ID` (if configured).
7. The action calls `sendContactFormTeamEmail`, which posts a Microsoft Graph `sendMail` request to `EMAIL_TEAM_ADDRESSES` with `replyTo` set to the submitter's email.
8. The action returns `{ success: true }`.
9. The iframe swaps the form for a green "Message sent!" panel; `IframeResizer` posts the new content height to the parent so the WordPress section shrinks accordingly.
10. The visitor may click "Send another message" to reset the form.

If Dynamics is unavailable, the action returns `{ success: false, error }` and the iframe shows an inline red error. The team email is **not** sent if the Dynamics write fails — both succeed together or both don't fire.

### 4.2 File plan

| Status | Path | Purpose |
| --- | --- | --- |
| NEW | `app/embed/contact/page.tsx` | Embed route. Sets `metadata.title = "Contact Us"`. Renders `<ContactFormEmbed />`. |
| NEW | `app/components/ContactFormEmbed.tsx` | Pixel-matched contact form (blue bg, square white inputs). Calls `submitContactForm`. Renders success / error states. |
| MODIFIED | `app/actions.ts` | Extend `submitContactForm`: add `riivo_leadsource`, owner binding, and email side-effect after Dynamics write. Signature unchanged. |
| MODIFIED | `app/lib/email.ts` | Add `sendContactFormTeamEmail(data, dynamicsId?)`. Reuses existing `sendEmail` + `getGraphAccessToken` plumbing. |
| MODIFIED | `app/lib/email-templates.ts` | Add `buildContactFormTeamHtml(data, dynamicsId?)`. Slim template: Name, Email, Phone, Message, timestamp, "View in CRM" CTA. |
| UNCHANGED | `next.config.ts` | `/embed/:path*` already serves `X-Frame-Options: ALLOWALL` + `Content-Security-Policy: frame-ancestors *`. |
| UNCHANGED | `app/embed/layout.tsx` | Wraps embed pages with `data-embed-content` div + `IframeResizer`. Inherited. |
| UNCHANGED | `app/embed/IframeResizer.tsx` | Posts `{ type: "FORM_HEIGHT", height }` to parent. Inherited. |
| UNCHANGED | `app/components/ContactForm.tsx` | Existing Next-site footer component. Stays in place. Will pick up new email behaviour automatically via the shared server action. |
| NEW (out-of-repo) | WP team handover note | Embed URL + iframe snippet + parent-side height-listener JS. Delivered in PR description / Slack. |

### 4.3 Visual specification

Match the existing WordPress contact form exactly:

- Wrapper: full-bleed background `#0077BB` (TTT blue), padding `~24px` top/bottom, `~16px` horizontal.
- Inputs: white background, `border: none` (or `1px solid #ffffff`), **square corners** (`border-radius: 0`), placeholder `#A0A8B0`, focus ring `2px rgba(255,255,255,0.5)`.
- Layout: 2-column grid on `sm:` and up (First Name | Last Name; Email | Contact Number); single column on mobile. Message textarea full width, 5 rows.
- Button: white background, blue text (`#0077BB`), uppercase `"SEND MESSAGE"`, sharp corners, no icon, hover state `bg: rgba(255,255,255,0.92)`.
- No title text, no orange divider, no service-branding header.
- Success state: centred check icon, `Message sent!` heading, `Thank you — a member of our team will be in touch shortly.` body, small underlined `Send another message` link.

### 4.4 WordPress handover snippet (deliverable artifact)

The PR description will include a copy-pasteable embed snippet for the WP developer. It mirrors the snippet used for `/embed/onboarding`:

```html
<iframe
  id="ttt-contact-iframe"
  src="https://{prod-domain}/embed/contact"
  width="100%"
  height="500"
  style="border:0;background:#0077BB;display:block;"
  title="Contact TTT"
  loading="lazy"
></iframe>
<script>
  (function () {
    window.addEventListener('message', function (event) {
      if (!event.data || event.data.type !== 'FORM_HEIGHT') return;
      var f = document.getElementById('ttt-contact-iframe');
      if (f && typeof event.data.height === 'number') {
        f.style.height = event.data.height + 'px';
      }
    });
  })();
</script>
```

---

## 5. Out of Scope

The following are explicitly **not** in this delivery. Treat as scope-creep alarms:

| Item | Why excluded | Re-open trigger |
| --- | --- | --- |
| Spam protection (honeypot, captcha, rate-limit) | Matches existing `/embed/onboarding` convention. None of the current forms have any. | If contact-form spam exceeds ~5/day after launch. |
| Removal of the Next-site footer `ContactForm` | "Fire for both" decision — both call sites share the upgraded action. | Separate ticket if/when the Next-site footer is retired. |
| Client (submitter) auto-responder email | User explicitly chose "team email only" — matches phrasing "sends an email to the team." | Separate ticket if visitor confusion arises. |
| WordPress-side install | WP team owns the iframe drop-in. Deliverable stops at the embed URL + snippet. | n/a — handled by WP team. |
| Analytics instrumentation (GA, Segment, PostHog, etc.) | None of the existing embeds emit analytics events. | Separate ticket if marketing needs conversion tracking. |
| Multi-language / i18n | Site is English-only today. | When TTT internationalises. |
| Form field changes (additional dropdowns, file uploads, service selectors) | Mirror the WP screenshot exactly. | Separate ticket for any field additions. |
| Lead-type / client-type tagging | Contact form is generic — no service context to tag. | If the team wants different routing per "subject" picklist later. |
| GDPR / POPIA consent line | Not present on existing WP form per screenshot; out of scope unless legal flags it. | If legal team requires a consent checkbox. |

---

## 6. AI / Engineering Contracts

### 6.1 Server Action contract — `submitContactForm`

**Path:** [`app/actions.ts`](../app/actions.ts) (existing — extended)

**TypeScript signature** (unchanged from today):

```ts
export async function submitContactForm(
  data: {
    firstName: string;
    lastName:  string;
    email:     string;
    phone:     string;
    message:   string;
  }
): Promise<{ success: true } | { success: false; error?: string }>;
```

**Input validation invariants:**
- All five fields required, non-empty after trim.
- `email` must contain `@` (browser-side `type="email"` plus server-side sanity check).
- `phone` is free-text; no format enforcement.
- Action is a Next.js Server Action — request body validated by the runtime.

**Side effects (in order, fail-fast):**

1. **Dynamics write:**
   ```json
   POST {DYNAMICS_RESOURCE_URL}/api/data/v9.2/new_leads
   {
     "subject":           "Website Contact — {firstName} {lastName}",
     "ttt_firstname":     "{firstName}",
     "ttt_lastname":      "{lastName}",
     "ttt_email":         "{email}",
     "ttt_mobilephone":   "{phone}",
     "description":       "{message}",
     "riivo_leadsource":  463630001,
     "ownerid@odata.bind": "/teams({DYNAMICS_OWNER_TEAM_ID})"   // omitted if env var unset
   }
   ```
2. **Team email** via Microsoft Graph (only if Dynamics write succeeded):
   ```
   POST https://graph.microsoft.com/v1.0/users/{EMAIL_SENDER_ADDRESS}/sendMail
   ```
   Body (Microsoft Graph `sendMail` shape):
   ```json
   {
     "message": {
       "subject":      "New Website Contact — {firstName} {lastName}",
       "body":         { "contentType": "HTML", "content": "{buildContactFormTeamHtml output}" },
       "toRecipients": [
         { "emailAddress": { "address": "<each address from EMAIL_TEAM_ADDRESSES>" } }
       ],
       "replyTo":      [ { "emailAddress": { "address": "{submitter email}" } } ]
     },
     "saveToSentItems": false
   }
   ```

**Failure modes:**

| Condition | Return value | User-facing UX |
| --- | --- | --- |
| `DYNAMICS_CLIENT_ID` not set | `{ success: true }` after an 800ms delay (existing dev-stub behaviour) | "Message sent!" panel. Dev environments only. |
| Dynamics write throws | `{ success: false, error: "Submission failed. Please try again." }` | Inline red error; form stays intact. **No email sent.** |
| Email send throws after successful Dynamics write | `{ success: true }` (Dynamics is source of truth) | "Message sent!" panel. Error logged server-side. |

### 6.2 Email helper contract — `sendContactFormTeamEmail`

**Path:** [`app/lib/email.ts`](../app/lib/email.ts) (new export)

```ts
export async function sendContactFormTeamEmail(
  data: {
    firstName: string;
    lastName:  string;
    email:     string;
    phone:     string;
    message:   string;
  },
  dynamicsId?: string | null
): Promise<void>;
```

- No-op (with `console.warn`) if `EMAIL_TEAM_ADDRESSES` is unset.
- Splits `EMAIL_TEAM_ADDRESSES` on `,` and trims.
- Throws on Graph token-fetch or `sendMail` failure (caller swallows + logs).

### 6.3 Email template contract — `buildContactFormTeamHtml`

**Path:** [`app/lib/email-templates.ts`](../app/lib/email-templates.ts) (new export)

```ts
export function buildContactFormTeamHtml(
  data: {
    firstName: string;
    lastName:  string;
    email:     string;
    phone:     string;
    message:   string;
  },
  dynamicsId?: string | null
): string;
```

**Rendered structure (must match):**

```
┌────────────────────────────────────────────────────────┐
│  Header band (#0077BB)                                 │
│    "New Website Contact"                               │
├────────────────────────────────────────────────────────┤
│  Body                                                  │
│    Name:    {firstName} {lastName}                     │
│    Email:   <mailto link>                              │
│    Phone:   {phone}                                    │
│    Message: {message — newlines preserved}             │
│                                                        │
│    [ View in CRM ]   ← only if dynamicsId set and      │
│                       DYNAMICS_RESOURCE_URL set        │
├────────────────────────────────────────────────────────┤
│  Footer band (#f9f9f9)                                 │
│    "Submitted {timestamp Africa/Johannesburg}"         │
└────────────────────────────────────────────────────────┘
```

CRM link format: `{DYNAMICS_RESOURCE_URL}/main.aspx?pagetype=entityrecord&etn=new_lead&id={dynamicsId}` (matches existing onboarding template).

### 6.4 Embed route contract — `app/embed/contact/page.tsx`

```tsx
import type { Metadata } from "next";
import ContactFormEmbed from "@/app/components/ContactFormEmbed";

export const metadata: Metadata = {
  title: "Contact Us",
};

export default function EmbedContact() {
  return <ContactFormEmbed />;
}
```

- Inherits `app/embed/layout.tsx` (provides `data-embed-content` wrapper + `IframeResizer`).
- Inherits `next.config.ts` headers (`X-Frame-Options: ALLOWALL`, `frame-ancestors *`).

### 6.5 Component contract — `ContactFormEmbed`

**Path:** `app/components/ContactFormEmbed.tsx`

**Type signature (no props):**

```ts
export default function ContactFormEmbed(): JSX.Element;
```

**Internal state machine:**

```
                  ┌─────────┐    submit       ┌─────────┐
                  │  idle   │ ───────────────▶│ loading │
                  └─────────┘                 └────┬────┘
                       ▲                           │
                       │                           │ result
                       │                           ▼
                  ┌────┴────┐               ┌──────────┐
                  │  error  │◀──────────────│ resolved │
                  └─────────┘  success=false└────┬─────┘
                                                 │ success=true
                                                 ▼
                                            ┌─────────┐
                                            │ success │
                                            └────┬────┘
                                                 │ "Send another message"
                                                 ▼
                                              (back to idle, fields cleared)
```

**Accessibility:** all `<input>` and `<textarea>` elements carry `required` + `autoComplete` hints (`given-name`, `family-name`, `email`, `tel`). Visible focus ring on all interactive controls.

**postMessage contract (via inherited `IframeResizer`):**

```json
{ "type": "FORM_HEIGHT", "height": <integer pixels> }
```

The WP parent script (see §4.4) listens for `message.type === "FORM_HEIGHT"` and sets `iframe.style.height = `${height}px`.

### 6.6 Environment-variable matrix

| Env var | Required? | Used by | Behaviour if unset |
| --- | --- | --- | --- |
| `DYNAMICS_CLIENT_ID` | Prod yes / Dev no | Lead creation | Simulated success (dev stub). |
| `DYNAMICS_TENANT_ID` | Prod yes | Graph token, Dynamics auth | Email + Dynamics throw. |
| `DYNAMICS_CLIENT_SECRET` | Prod yes | Graph token, Dynamics auth | Email + Dynamics throw. |
| `DYNAMICS_RESOURCE_URL` | Prod yes | Dynamics base + CRM link in email | Lead create fails / CRM link omitted. |
| `DYNAMICS_OWNER_TEAM_ID` | Recommended | Lead owner assignment | Owner left unassigned (existing behaviour). |
| `EMAIL_SENDER_ADDRESS` | Prod yes | Microsoft Graph mailbox | Email helper throws. |
| `EMAIL_TEAM_ADDRESSES` | Required for emails | Recipient list | `sendContactFormTeamEmail` warns and no-ops. |

No new env vars are introduced by this PRD. All required vars exist today.

---

## 7. Test Plan

| # | Scenario | Expected |
| --- | --- | --- |
| T1 | Submit valid data via `/embed/contact` in dev (no Dynamics creds) | "Message sent!" panel; no Dynamics call; no email call. |
| T2 | Submit valid data in staging (Dynamics + email configured) | New `new_leads` record with `riivo_leadsource = 463630001`, owner = team; team inbox receives "New Website Contact — …"; `replyTo` = submitter. |
| T3 | Submit with missing required field | Browser-native validation blocks submit; action not invoked. |
| T4 | Dynamics returns 500 | Inline error; "Send another message" not shown; no email sent. |
| T5 | Email throws after successful Dynamics write | "Message sent!" panel still shown (Dynamics is source of truth); error logged server-side. |
| T6 | Iframe embedded in test WP page | Visual matches screenshot; iframe height shrinks on success panel. |
| T7 | Submit via Next-site footer `ContactForm` (shared action regression) | Behaviour identical to T2 — same Dynamics write + team email. |
| T8 | Headers check on `/embed/contact` | `X-Frame-Options: ALLOWALL` and `Content-Security-Policy: frame-ancestors *` present. |

## 8. Rollout

1. Merge to `main`, deploy to production at the stable HTTPS domain.
2. Verify `/embed/contact` renders standalone and headers are present.
3. Hand WP developer:
   - The embed URL
   - The iframe + parent-listener snippet from §4.4
   - Confirmation that the existing onboarding iframe pattern is reused (no new JS contract)
4. WP developer swaps the form on the live WP footer in a staging environment, smoke-tests, then promotes.
5. Lead Ops monitors inbox + Dynamics for 7 days to confirm metric (§2) is hit.

## 9. Open Questions

| # | Question | Owner | Resolution by |
| --- | --- | --- | --- |
| Q1 | Exact production HTTPS domain to bake into the WP handover snippet. | Eng | Before WP handover. |
| Q2 | Does WP team need any other resource (CSS overrides, fallback styles)? | WP team | Before live cutover. |

---

*End of PRD.*
