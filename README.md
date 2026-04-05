# MediPlex — Premium Pediatric Dashboard

Production-ready Next.js 14 dashboard for US pediatric clinics.
Live-synced to Google Sheets · Multi-user roles · Analytics with date range · CSV export

---

## Quick Start

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your values
npm run dev
```

Open http://localhost:3000

---

## Environment Variables (.env.local)

```env
GOOGLE_SHEETS_ID=18XQKbYAKRVho0PzajF2vXwHIs-GcsneginzppJAXVP8
GOOGLE_API_KEY=your_google_api_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_CLINIC_NAME=MediPlex Pediatric Clinic
NEXT_PUBLIC_CLINIC_ADDRESS=123 Medical Center Drive, New York, NY 10001
NEXT_PUBLIC_CLINIC_PHONE=(212) 555-0190
NEXT_PUBLIC_CLINIC_EMAIL=appointments@mediplex.com
NEXT_PUBLIC_DOCTOR_NAME=Dr. Talha
```

---

## Google Sheets Setup

1. Make your sheet public: Share → Anyone with link → Viewer
2. Get an API key at console.cloud.google.com → APIs & Services → Enable Google Sheets API → Credentials → Create API Key
3. Add GOOGLE_API_KEY to .env.local

---

## Deploy to Vercel (Free)

```bash
npm install -g vercel
vercel
```

Or push to GitHub and import at vercel.com. Add all env variables in Project Settings.

---

## Features

- Overview: 8 KPI cards, monthly chart, donut chart, recent + upcoming appointments
- Appointments: Full table, filter by status/visit type/date range, search, CSV export, pagination
- Patients: Unique patient cards with visit history
- Analytics: Date range picker, monthly records table, stacked charts, demographics, trends
- Settings: Google Sheets config guide, role reference table

---

## Cost

- Next.js: Free
- Vercel Hobby: Free
- Google Sheets API: Free
- Domain: ~$12/year
- Total: ~$1/month

---

## Tech Stack

Next.js 14 · TypeScript · Tailwind CSS · Recharts · date-fns · Lucide React · NextAuth.js
