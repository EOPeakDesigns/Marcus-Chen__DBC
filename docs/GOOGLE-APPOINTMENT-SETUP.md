# Google Calendar Appointment Schedule + Google Meet (Portfolio Demo)

Use this guide to create a **free trial booking page** like Calendly, built into Google Calendar.  
Clients open your link, see **real availability**, book a slot, and Google automatically adds **Google Meet**, **calendar blocks**, and **email reminders**.

---

## What your client experiences

1. They tap **Schedule** on your digital card.
2. They open a page such as **“Book a discovery call with [Your Name]”**.
3. They see **only your free times** (based on your calendar).
4. They pick a slot and enter **name + email**.
5. Google automatically:
   - Creates the calendar event on both calendars  
   - Adds a **Google Meet** video link  
   - Sends **confirmation** and **reminder** emails  
   - Prevents **double-booking** on that calendar  

---

## Step-by-step: Create a trial booking page (≈10 minutes)

### Requirements

- A **Google account** (Gmail or Google Workspace).
- Google Calendar on web: [https://calendar.google.com](https://calendar.google.com)

### 1. Create the appointment schedule

1. Open **Google Calendar** (computer browser works best).
2. Click **Create** (or **+**).
3. Choose **Appointment schedule** (not “Event” or “Task”).
4. Set **title**, e.g.  
   `Book a discovery call with Eslam`  
   (or `Book a meeting with Marcus Chen` for this demo card).
5. Set **duration**: **30 minutes** (matches `durationMinutes` in `data/card.json`).
6. Set **appointment availability** (example for demo):
   - Mon–Fri, 10:00 AM – 4:00 PM  
   - Time zone: your local zone  
7. Under **Scheduling window** (optional but professional):
   - “Offer for the next 14 days”  
   - Minimum notice: 4 hours  
   - Buffer between meetings: 10 minutes  

### 2. Add Google Meet (required)

1. In the appointment schedule editor, find **Conferencing** or **Location**.
2. Select **Google Meet video conferencing**.
3. Save. Every booked meeting will include a **Meet link** in the invite.

### 3. Turn on confirmations & reminders

Google sends these by default for booked appointments. Confirm in schedule settings:

- **Email confirmations** to you and the guest  
- **Reminders** (e.g. 30 minutes before)  

No extra tool needed.

### 4. Copy your public booking link

1. After saving, open the appointment schedule.
2. Click **Share** or **Copy link**.
3. Your link looks like one of:
   - `https://calendar.app.google/AbCdEfGh...` (preferred, short)  
   - `https://calendar.google.com/calendar/appointments/schedules/...`  

### 5. Paste the link into this project

Edit `data/card.json`:

```json
"schedule": {
  "appointmentUrl": "https://calendar.app.google/YOUR_LINK_HERE",
  ...
}
```

Replace `YOUR_LINK_HERE` with the full URL you copied.

6. Serve the site over HTTP and test:

```bash
npx serve .
```

7. Tap **Schedule** on the card — it should open your Google booking page.

---

## Portfolio demo checklist

| Check | Expected result |
|--------|------------------|
| Open booking link in incognito | Shows your name + available slots |
| Book a test slot | Event appears on your calendar |
| Guest email | Receives invite with **Google Meet** |
| Your email | Receives notification |
| Book same slot again | Slot no longer available (no double-book) |

Use a **second Gmail address** as the “client” for testing.

---

## Customize copy in `card.json`

| Field | Purpose |
|--------|---------|
| `bookingPageTitle` | Describes the booking page (accessibility) |
| `buttonLabel` | Button text on card (default: `Schedule`) |
| `ariaLabel` / `title` | Screen readers & hover tooltip |
| `toastMessage` | Short message when opening the link |
| `durationMinutes` | Should match your Google schedule duration |
| `eventTitle` | Reference title for your records |

---

## Troubleshooting

**Schedule button shows a toast “Booking not configured”**  
→ `appointmentUrl` is empty or invalid. Paste a real `calendar.app.google` link.

**Link opens but shows no times**  
→ Add availability hours in the appointment schedule, or check the correct calendar is selected.

**No Google Meet on the invite**  
→ Re-edit the schedule and set conferencing to **Google Meet**.

**Works on phone?**  
→ Yes. Google’s booking pages are mobile-friendly.

---

## Privacy note for portfolio

Use a **dedicated demo schedule** (e.g. “Portfolio demo calls”) with limited hours so test bookings do not clutter your personal calendar.
