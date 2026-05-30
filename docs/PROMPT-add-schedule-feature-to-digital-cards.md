# Reusable Prompt: Add “Schedule” Feature to a Digital Business Card

Copy everything inside the **PROMPT START** / **PROMPT END** block into your AI coding agent when porting this feature to another card project.

---

## PROMPT START

You are a **world-class Senior Frontend Engineer** and **Senior Prompt Engineer** with 20+ years of experience building premium digital business cards, PWAs, and mobile-first contact experiences.

Your task is to **add a production-grade “Schedule” quick-action** to an existing digital business card codebase **without redesigning** the card’s visual identity unless required for the new control to fit the existing design system.

---

## Feature summary

Implement a **Schedule** button that opens the card owner’s **Google Calendar Appointment Schedule** booking page (Calendly-style flow, native to Google).

**Provider:** Google Calendar Appointment Schedules + **Google Meet** (not Calendly, not a manual “create event” template as the primary path).

**Customer experience when configured correctly:**

1. Visitor taps **Schedule** on the card.
2. Browser opens a public booking page (e.g. “Book a discovery call with [Owner Name]”).
3. Visitor sees **only available time slots** (from the owner’s calendar rules).
4. Visitor picks a slot and enters name/email.
5. Google automatically:
   - Creates the calendar event on both calendars
   - Adds a **Google Meet** link
   - Sends **confirmation and reminder** emails
   - **Blocks** the slot (no double-booking on that calendar)

This signals the owner is **organized, in demand, and professional** (credibility signal).

**Positioning (copy, not “meet the CEO”):** Frame as a **digital transformation / discovery consultation** — understanding the client’s business and workflow — not an executive audience request.

---

## Non-negotiable constraints

### Preserve existing design
- Do **not** redesign the card, change the color system globally, or refactor unrelated components.
- Match existing button/pill/grid patterns, spacing tokens, typography, and hover/focus behavior.
- Place **Schedule** in the existing **quick-actions row** (or equivalent 4-button grid) unless the project has no such area — then add one section using the same visual language.

### Preserve existing architecture
- Keep **vanilla HTML / CSS / JS** unless the target project explicitly uses a framework — then implement idiomatically in that stack.
- Use **central config** (`card.json` or equivalent) for all schedule copy and URLs — **no hardcoded owner strings** in JS except safe fallbacks.
- Do **not** remove or break: vCard save, share, QR modal, clipboard, PWA, or other contact links.

### Google Calendar only (primary path)
- **Valid booking URLs:**
  - `https://calendar.app.google/{id}` (preferred)
  - `https://calendar.google.com/calendar/appointments/schedules/...`
- **Reject / do not use as primary:** Calendly links, empty URLs, `#`, placeholder strings, generic `calendar.google.com/render?action=TEMPLATE` unless `appointmentUrl` is missing and you document that as dev-only fallback (production cards should require Appointment Schedule URL).

### Accessibility & mobile
- Minimum **44×44px** touch target.
- `target="_blank"` + `rel="noopener noreferrer"` on the booking link.
- Descriptive `aria-label` and `title` (mention Google Meet + automatic reminders).
- Toast feedback on tap: e.g. “Opening booking page — pick an available time slot”.
- If URL not configured: `preventDefault`, show toast explaining `appointmentUrl` must be set in config; do not navigate to a broken page.

---

## Configuration schema (`card.json`)

Add under `contact.schedule`:

```json
"schedule": {
  "provider": "google_calendar_appointment",
  "buttonLabel": "Schedule",
  "bookingPageTitle": "Book a discovery call with {{OWNER_FULL_NAME}}",
  "ariaLabel": "Book a discovery call with {{OWNER_FULL_NAME}}. See available times, get a Google Meet link, and receive confirmation emails automatically.",
  "title": "Google Calendar booking · Google Meet · automatic reminders",
  "toastMessage": "Opening booking page — pick an available time slot",
  "appointmentUrl": "https://calendar.app.google/YOUR_ID_HERE",
  "durationMinutes": 30,
  "eventTitle": "Digital Transformation Discovery Call",
  "conferencing": "google_meet",
  "eventDescription": "30-minute online discovery session to understand your business goals and workflow. Google Meet link and reminder emails are sent automatically."
}
```

Replace `{{OWNER_FULL_NAME}}` and `YOUR_ID_HERE` per card owner.

---

## HTML requirements

Add (or update) a **Schedule** control in the quick-actions area:

```html
<a
  href="#"
  class="smart-btn smart-btn--link smart-btn--schedule"
  data-contact="schedule"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="…"
  title="…">
  <svg class="smart-btn__icon-schedule" aria-hidden="true" viewBox="0 0 24 24">…calendar icon…</svg>
  <span data-schedule="buttonLabel">Schedule</span>
</a>
```

- `href` is set at runtime from config (not a static Calendly/third-party URL).
- Keep label short: **Schedule** (grid space).

---

## JavaScript requirements

### 1. `schedule-manager.js` (new module)

Responsibilities:

| Responsibility | Detail |
|----------------|--------|
| Validate URL | Regex for `calendar.app.google/...` or `calendar.google.com/calendar/appointments/` |
| Reject placeholders | `cal.com`, `PLACEHOLDER`, empty, `#` |
| `refreshFromConfig()` | After `card.json` loads: set `href`, `aria-label`, `title`, button label, `data-schedule-mode` |
| Click handler | If invalid URL → `preventDefault` + toast; if valid → toast then allow navigation |
| Configured state | `data-schedule-mode="google-appointment"` |
| Unconfigured state | `href="#"`, `aria-disabled="true"`, subtle disabled styling |

Export: `window.ScheduleManager = ScheduleManager`.

### 2. Wire in `main.js`

- Load `card.json` **before** initializing managers.
- Instantiate: `this.scheduleManager = new ScheduleManager(this.cardData, this.toastManager)`.
- After init: `this.scheduleManager.refreshFromConfig()`.
- Also call refresh from `card-data.js` `setSchedule()` after apply (delegates to `window.app.scheduleManager`).

### 3. Script load order

```html
<script src="scripts/core/card-data.js"></script>
<script src="scripts/core/schedule-manager.js"></script>
<!-- …other core modules… -->
<script src="scripts/main.js"></script>
```

### 4. Service worker (if PWA exists)

- Add `schedule-manager.js` to precache list.
- Bump cache version when shipping.

---

## CSS requirements (minimal)

- Reuse existing `.smart-btn` / quick-grid styles.
- Optional modifiers:
  - `.smart-btn--schedule` — tech accent on icon (e.g. cyan) to distinguish from share/save.
  - `.smart-btn--schedule-unconfigured` — reduced opacity when URL missing.
- Hover: `scale(1.02)`, border glow, **250ms** transition — match card.
- `prefers-reduced-motion`: disable scale.

---

## Owner setup documentation (include in repo)

Create `docs/GOOGLE-APPOINTMENT-SETUP.md` with:

1. Create Google Calendar → **Appointment schedule** (not regular event).
2. Title: “Book a discovery call with [Name]”.
3. Duration: match `durationMinutes` in JSON.
4. Availability windows + timezone.
5. **Conferencing → Google Meet**.
6. Share → copy `https://calendar.app.google/...` link.
7. Paste into `contact.schedule.appointmentUrl`.
8. Test in incognito with a second Google account.

Reference: [Google Calendar appointment schedules help](https://support.google.com/calendar/answer/10729749)

---

## Acceptance criteria (definition of done)

- [ ] **Schedule** visible in quick-actions row with consistent styling.
- [ ] With valid `appointmentUrl`, tap opens booking page in new tab.
- [ ] Booking page shows owner’s name and available slots (owner must configure Google side).
- [ ] Booked test event includes **Google Meet** and emails (verify manually once).
- [ ] With empty/invalid `appointmentUrl`, tap shows helpful toast; no broken navigation.
- [ ] All schedule strings driven from `card.json` (label, aria, title, toast).
- [ ] No regression: save contact, share, QR, phone, email, other links.
- [ ] WCAG: focus visible, 44px target, screen-reader labels.
- [ ] Works on mobile Safari and Chrome (320–480px).
- [ ] `docs/GOOGLE-APPOINTMENT-SETUP.md` included for the next card owner.

---

## Example reference implementation

If the agent needs a reference, mirror the pattern from a card that already ships:

| Artifact | Purpose |
|----------|---------|
| `scripts/core/schedule-manager.js` | URL validation + UI bind + click |
| `data/card.json` → `contact.schedule` | Config |
| `docs/GOOGLE-APPOINTMENT-SETUP.md` | Owner instructions |
| Quick-actions `<a data-contact="schedule">` | UI hook |

**Example live booking URL format:**  
`https://calendar.app.google/UDMdhhZVHxyAjHRs6`  
(Page title: “Book a discovery call with Marcus Chen”.)

---

## What NOT to do

- Do not use Calendly unless the project owner explicitly requests it.
- Do not use `action=TEMPLATE` Google Calendar links as the production booking path.
- Do not nest `<button>` inside `<a>` for copy actions on the same row.
- Do not hardcode one owner’s name/URL in HTML — only in `card.json`.
- Do not add heavy dependencies for this feature alone.

---

## One-line invocation (quick copy)

> Add a **Schedule** quick-action to this digital business card that opens the owner’s **Google Calendar Appointment Schedule** URL from `card.json` (`calendar.app.google/...`), with Google Meet implied on the Google side, 44px touch target, toast on click, validation + unconfigured state handling via `schedule-manager.js`, owner setup doc, and **zero visual redesign** — match existing quick-action buttons exactly.

## PROMPT END

---

## Optional variables to customize per card

| Variable | Example |
|----------|---------|
| Owner name | Marcus Chen / Eslam Osama |
| Company | TechFlow Innovations |
| Session type | Discovery call / Strategy session |
| Duration | 30 min |
| `appointmentUrl` | From Google Calendar → Share |
| Button position | 4th slot in quick-actions grid |

---

## Changelog template (for your PR/commit)

```text
feat(schedule): add Google Calendar Appointment Schedule booking action

- Add Schedule quick-action with schedule-manager.js
- Configure contact.schedule in card.json
- Validate calendar.app.google URLs; toast when unconfigured
- Add GOOGLE-APPOINTMENT-SETUP.md for card owners
```
