# Issue Breakdown — WordPress Contact Form Iframe Replacement

**Source PRD:** [PRD-contact-form-iframe.md](./PRD-contact-form-iframe.md)
**Generated:** 2026-05-19
**Owner:** TTT web team

This breakdown converts the approved PRD into 9 independently shippable issues across frontend, backend, testing, and handover. Issues are ordered by recommended execution sequence; backend issues (BE-*) should land first so frontend (FE-*) can integrate against the real action.

---

## Progress (2026-05-19)

**Tracer bullet complete:** BE-1, BE-2, BE-3, FE-2, FE-1 all landed in one slice — the full end-to-end path from `/embed/contact` → Dynamics `new_leads` write → team email now compiles, type-checks, and builds. `/embed/contact` is prerendered as a static route per `next build` output.

**Deferred (blocked on test-stack decision):**
- QA-1, QA-2 (T4 / T5) — repo has no test framework (`package.json` only has `lint`, `dev`, `build`, `start`). Adding Vitest / Jest is a HITL decision; the issue called it out as "match the project's existing test stack" but there is none. Confirm framework choice before implementing.
- QA-3 T8 (headers `curl -I`) — can be a one-line bash check; trivial to add once a deploy URL exists.

**HITL (out-of-scope for AFK):**
- QA-2 T2 (staging happy path), QA-3 T6 (WP iframe smoke), QA-3 T7 (footer regression — manual against shared action), DOC-1 (WP handover snippet — needs Q1 prod domain resolved).

---

## Backend

### - [x] BE-1 — [email-templates] Add `buildContactFormTeamHtml` template

**Description:**

- **Context:** The team notification email needs a slim, branded HTML template matching the rendered structure in PRD §6.3. This must exist before the email helper (BE-2) can call it. No other component depends on it, so it can ship first.
- **Acceptance Criteria:**
  - [ ] Given the helper is exported from `app/lib/email-templates.ts`
        When called with `{firstName, lastName, email, phone, message}` and a `dynamicsId`
        Then the returned HTML contains a `#0077BB` header band reading "New Website Contact".
  - [ ] Given a `dynamicsId` is provided AND `DYNAMICS_RESOURCE_URL` is set
        When the template renders
        Then a "View in CRM" anchor is included with href `{DYNAMICS_RESOURCE_URL}/main.aspx?pagetype=entityrecord&etn=new_lead&id={dynamicsId}`.
  - [ ] Given `dynamicsId` is `null` / `undefined` OR `DYNAMICS_RESOURCE_URL` is unset
        When the template renders
        Then the "View in CRM" CTA is omitted.
  - [ ] Given a multi-line `message`
        When the template renders
        Then newlines are preserved (CSS `white-space: pre-wrap` or equivalent).
  - [ ] The footer band shows the submission timestamp in `Africa/Johannesburg`.
- **Technical Notes:**
  - File: [app/lib/email-templates.ts](../app/lib/email-templates.ts)
  - Mirror the structure of the existing onboarding email template in the same file for header band styling, footer band, and CRM link format.
  - Signature: `export function buildContactFormTeamHtml(data, dynamicsId?: string | null): string`.

---

### - [x] BE-2 — [email] Add `sendContactFormTeamEmail` helper

**Description:**

- **Context:** The server action needs a typed helper that posts the team notification through Microsoft Graph `sendMail`, reusing existing `getGraphAccessToken` plumbing. Depends on BE-1 for the HTML body.
- **Acceptance Criteria:**
  - [ ] Given `EMAIL_TEAM_ADDRESSES` is unset
        When the helper is invoked
        Then it logs a `console.warn` and returns without throwing.
  - [ ] Given `EMAIL_TEAM_ADDRESSES = "a@x.com, b@x.com"`
        When the helper is invoked with valid data
        Then a single Graph `sendMail` request is made with both recipients (trimmed), `replyTo` = submitter email, `saveToSentItems: false`, and subject `"New Website Contact — {firstName} {lastName}"`.
  - [ ] Given the Graph token fetch fails
        When the helper runs
        Then it throws (caller in BE-1 server action swallows + logs).
  - [ ] Given the Graph `sendMail` POST returns a non-2xx
        When the helper runs
        Then it throws with the upstream error surfaced.
- **Technical Notes:**
  - File: [app/lib/email.ts](../app/lib/email.ts)
  - Reuse the existing `sendEmail` wrapper if its shape supports `replyTo`; otherwise reuse `getGraphAccessToken` directly (match the onboarding helper's pattern).
  - Signature: `export async function sendContactFormTeamEmail(data, dynamicsId?: string | null): Promise<void>`.
  - Graph endpoint: `POST https://graph.microsoft.com/v1.0/users/{EMAIL_SENDER_ADDRESS}/sendMail`.

---

### - [x] BE-3 — [actions] Extend `submitContactForm` with lead source, owner, and email side-effect

**Description:**

- **Context:** The current action writes to Dynamics but does not set `riivo_leadsource`, bind the owner, or notify the team. PRD §6.1 specifies fail-fast ordering: Dynamics write first, email only on success, email failure does NOT fail the action. Depends on BE-2.
- **Acceptance Criteria:**
  - [ ] Given a valid submission and Dynamics credentials configured
        When `submitContactForm` runs
        Then the POST to `new_leads` includes `"riivo_leadsource": 463630001` and (if `DYNAMICS_OWNER_TEAM_ID` is set) `"ownerid@odata.bind": "/teams({DYNAMICS_OWNER_TEAM_ID})"`.
  - [ ] Given the Dynamics write succeeds
        When the action continues
        Then `sendContactFormTeamEmail` is called with the submitted data + returned `dynamicsId`, and `{ success: true }` is returned.
  - [ ] Given the Dynamics write throws
        When the action handles the error
        Then `{ success: false, error: "Submission failed. Please try again." }` is returned AND `sendContactFormTeamEmail` is NOT invoked.
  - [ ] Given the email send throws AFTER a successful Dynamics write
        When the action resolves
        Then `{ success: true }` is still returned and the error is logged server-side.
  - [ ] Given `DYNAMICS_CLIENT_ID` is unset (dev environment)
        When the action runs
        Then the existing 800ms-delay dev stub is preserved and returns `{ success: true }` without calling Dynamics or email.
  - [ ] The TypeScript signature in PRD §6.1 is unchanged (no breaking change to the existing `ContactForm.tsx` caller).
- **Technical Notes:**
  - File: [app/actions.ts](../app/actions.ts)
  - This action is shared with the Next-site footer `ContactForm.tsx` — the new email behaviour will fire for both call sites (intentional per PRD §5 "Fire for both" decision).
  - Wrap the email call in try/catch; only Dynamics failure should change the return value.

---

## Frontend

### - [x] FE-1 — [embed] New route `app/embed/contact/page.tsx`

**Description:**

- **Context:** WordPress will load `https://{prod-domain}/embed/contact` in an iframe. The route inherits `app/embed/layout.tsx` (which provides `IframeResizer` + `data-embed-content` wrapper) and `next.config.ts` headers (`X-Frame-Options: ALLOWALL`, `frame-ancestors *`). No header / Next chrome.
- **Acceptance Criteria:**
  - [ ] Given a browser opens `/embed/contact` directly
        When the page renders
        Then it shows `<ContactFormEmbed />` with no site header or footer.
  - [ ] Given the page is loaded
        When metadata is inspected
        Then `<title>` is `"Contact Us"`.
  - [ ] Given the page is loaded
        When response headers are inspected
        Then `X-Frame-Options: ALLOWALL` and `Content-Security-Policy: frame-ancestors *` are present (inherited from `next.config.ts`).
- **Technical Notes:**
  - File: `app/embed/contact/page.tsx` (NEW)
  - Implementation is exactly the snippet in PRD §6.4 — `metadata.title = "Contact Us"`, default export renders `<ContactFormEmbed />`.
  - Depends on FE-2 for the component import.

---

### - [x] FE-2 — [components] `ContactFormEmbed` pixel-matched form + state machine

**Description:**

- **Context:** Pixel-matched replacement for the WordPress contact form, calling the upgraded `submitContactForm` action. Visual spec in PRD §4.3; state machine in PRD §6.5. Iframe height auto-syncs via the inherited `IframeResizer`.
- **Acceptance Criteria:**
  - [ ] Given the component mounts
        When it renders idle state
        Then it displays 5 required fields (First Name, Last Name, Email, Contact Number, Message) on a `#0077BB` full-bleed background with square white inputs and a white `SEND MESSAGE` button.
  - [ ] Given the viewport is `sm:` (≥640px) or larger
        When the form renders
        Then First/Last Name and Email/Phone are in a 2-column grid; on mobile they stack.
  - [ ] Given a field is empty
        When the user clicks `SEND MESSAGE`
        Then browser-native `required` validation blocks submission (no action call).
  - [ ] Given a valid submission
        When the action returns `{ success: true }`
        Then the form is replaced by a centred success panel: check icon, `Message sent!` heading, `Thank you — a member of our team will be in touch shortly.` body, and a `Send another message` underlined link.
  - [ ] Given the success panel is shown
        When the user clicks `Send another message`
        Then the form returns to idle state with all fields cleared.
  - [ ] Given the action returns `{ success: false, error }`
        When the resolved state lands
        Then an inline red error is shown, the form fields remain populated, and the user can retry.
  - [ ] Given the state transitions (idle → loading → success / error)
        When the rendered height changes
        Then `IframeResizer` posts `{ type: "FORM_HEIGHT", height }` to the parent (inherited behaviour — verify by spying on `postMessage`).
  - [ ] Inputs include `autoComplete` hints: `given-name`, `family-name`, `email`, `tel`. All interactive controls have a visible focus ring (`2px rgba(255,255,255,0.5)`).
- **Technical Notes:**
  - File: `app/components/ContactFormEmbed.tsx` (NEW)
  - State machine reference: PRD §6.5 (`idle → loading → resolved → success|error`).
  - Visual reference: PRD §4.3. Use Tailwind utility classes consistent with the rest of `app/components/`.
  - Compare against the existing `app/components/SimpleOnboardingForm.tsx` for state-handling style and against the existing footer `app/components/ContactForm.tsx` for action-call shape — do not extract a shared abstraction (per PRD §5: footer component stays unchanged).

---

## Testing

### - [ ] QA-1 — [tests] Dev-stub + client-side validation coverage (T1, T3)

**Description:**

- **Context:** Verify the form behaves correctly in dev (no Dynamics creds) and that browser-native validation prevents bad submissions from ever reaching the server action.
- **Acceptance Criteria:**
  - [ ] **T1**: Given `DYNAMICS_CLIENT_ID` is unset in the test env
        When a valid submission is made via `/embed/contact`
        Then the success panel renders, no Dynamics HTTP call is made, and no email is sent.
  - [ ] **T3**: Given any required field is empty
        When the user clicks `SEND MESSAGE`
        Then the browser blocks the form submit and `submitContactForm` is never invoked.
- **Technical Notes:**
  - Add a component-level test (Vitest + Testing Library or equivalent — match the project's existing test stack).
  - Mock `getGraphAccessToken` / HTTP layer to assert "not called" rather than relying on env var stripping.

---

### - [ ] QA-2 — [tests] Dynamics + email integration + failure-mode coverage (T2, T4, T5)

**Description:**

- **Context:** Lock in the contract from PRD §6.1: Dynamics + email succeed together on the happy path; Dynamics failure blocks the email; email failure does NOT block the success response.
- **Acceptance Criteria:**
  - [ ] **T2 (staging happy path)**: Given staging credentials are configured
        When a valid submission is made via `/embed/contact`
        Then a `new_leads` record is created with `riivo_leadsource = 463630001` and `ownerid` = team, AND the team inbox receives a `"New Website Contact — …"` email with `replyTo` = submitter email.
  - [ ] **T4 (Dynamics failure)**: Given the Dynamics endpoint is mocked to return 500
        When the action runs
        Then it returns `{ success: false, … }`, no email is sent, and the UI shows the inline error.
  - [ ] **T5 (email failure after Dynamics success)**: Given Dynamics resolves successfully but `sendContactFormTeamEmail` throws
        When the action runs
        Then it returns `{ success: true }`, the UI shows the success panel, and the email error is logged server-side (assert on `console.error` spy).
- **Technical Notes:**
  - T2 is a manual staging smoke (or an automated integration test if the project has one — confirm with the team before adding).
  - T4 / T5 are unit tests on the server action with the Dynamics + email clients mocked.

---

### - [ ] QA-3 — [tests] Iframe smoke, headers, and footer regression (T6, T7, T8)

**Description:**

- **Context:** Verify the iframe contract end-to-end (visual + height auto-resize), the security headers required by WP, and that the existing Next-site footer `ContactForm.tsx` did not regress under the shared-action change.
- **Acceptance Criteria:**
  - [ ] **T6 (WP iframe smoke)**: Given a test WordPress page embedding `/embed/contact` via the §4.4 snippet
        When a submission resolves
        Then the iframe height shrinks to match the success panel and the visual matches the screenshot reference.
  - [ ] **T7 (footer regression)**: Given the Next-site footer `app/components/ContactForm.tsx` is used (existing call site)
        When a valid submission is made
        Then the Dynamics write + team email behave identically to T2.
  - [ ] **T8 (headers)**: Given a GET against `/embed/contact`
        When response headers are inspected (`curl -I`)
        Then both `X-Frame-Options: ALLOWALL` and `Content-Security-Policy: frame-ancestors *` are present.
- **Technical Notes:**
  - T6 is manual against a staging WP page (the WP dev should be looped in per §8 rollout step 4).
  - T8 can be automated with a `curl -I` check in CI or a Playwright/Vitest network-level assertion.
  - T7: this is the "Fire for both" regression — do not extract or refactor `ContactForm.tsx` (per PRD §5 out-of-scope).

---

## Handover

### - [ ] DOC-1 — [docs] WP team handover snippet + embed URL

**Description:**

- **Context:** The PRD deliverable stops at the embed URL + iframe snippet. The WP developer owns the install. Per PRD §9, Q1 (exact production HTTPS domain) must be resolved before handover.
- **Acceptance Criteria:**
  - [ ] Given the PR description (or a follow-up Slack message) is delivered to the WP developer
        When they read it
        Then they have: (a) the production embed URL with the resolved domain, (b) the iframe + parent listener snippet from PRD §4.4, (c) confirmation that the existing `/embed/onboarding` pattern is reused (no new JS contract).
  - [ ] PRD §9 Q1 ("exact production HTTPS domain") is resolved and recorded inline in the handover note.
- **Technical Notes:**
  - Out-of-repo artifact — lives in the PR description and/or Slack handoff.
  - Use the snippet in PRD §4.4 verbatim; only substitute `{prod-domain}`.

---

## Execution Order (suggested)

1. **BE-1** → **BE-2** → **BE-3** (server contracts complete first so frontend can integrate against the real action).
2. **FE-2** → **FE-1** (component before route — the route is a 3-line wrapper).
3. **QA-1** → **QA-2** → **QA-3** (unit / mocked tests during dev; staging + iframe smoke after deploy).
4. **DOC-1** (after the production deploy reveals the final domain — PRD §8 step 3).

## Cross-cutting Notes

- **No new env vars** are introduced (PRD §6.6). All required vars exist today.
- **Out of scope** (PRD §5): spam protection, removal of footer `ContactForm`, client auto-responder, WP install, analytics, i18n, extra fields, lead-type tagging, consent line. Flag scope creep against these explicitly.
- **Success metric** (PRD §2): ≥99% of submissions appear in Dynamics within a 7-day rolling window. Lead Ops monitors per §8 step 5.
