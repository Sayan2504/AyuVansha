# AyuVansha

**AyuVansha** is a privacy-first, multi-generational family medical & prescription timeline workspace. It converts decades of scattered paper prescriptions, hospital discharge summaries, and lab reports into a structured clinical timeline, a 3-generation hereditary risk map, and an expiring **1-Page Doctor Brief** accessible via zero-login QR code during 5-minute consultations.

---

## Key Features

- **Multi-Generational Family Workspace:** Manage medical histories for living and deceased blood relatives across maternal and paternal lineages (`mother_id` / `father_id` links).
- **3-Generation Hereditary Risk Rollup:** Automatically traverses up to 3 generations of maternal and paternal ancestry to surface inherited conditions, allergies, and chronic patterns.
- **AI Extraction with Human-in-the-Loop (HITL) Safety:** Uses Gemini multimodal vision with strict JSON schema output, confidence tagging (`high` | `medium` | `low`), and an Explicit Null Rule for illegible handwriting—requiring caregiver confirmation before any event is committed to a member's clinical timeline.
- **Ephemeral 1-Page Doctor QR Brief:** Generates a 30-minute expiring, SHA-256 hashed QR share link (with optional 4-digit consultation PIN) displaying Critical Alerts, Active Medications, Chronic Conditions & Surgeries, Family Hereditary Risk Summary, and Recent Abnormal Lab Markers.
- **Privacy & Right to Erasure:** Row-Level Security (`is_family_member()`), private medical document storage (`medical-records/{family_id}/{member_id}/`), immutable access audit logs, and one-click member data purge.
- **Clean Clinical UI & Dark Mode:** Built with `shadcn/ui`-inspired components (custom popover dropdowns, modern date picker with month/year selectors, search bars, segmented tabs) and persistent light/dark theme switching.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js `15.2.4` (App Router, Server Actions, Route Handlers) |
| **Language & Runtime** | TypeScript `5.8.2`, React `19.0.0` |
| **Styling & UI** | Tailwind CSS `3.4.17`, `lucide-react`, `clsx`, `tailwind-merge` |
| **Database, Auth & Storage** | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — PostgreSQL + RLS + Private Storage |
| **AI Extraction Engine** | Google GenAI SDK (`@google/genai`) — `gemini-3.8-flash` (configurable via `GEMINI_MODEL`) |
| **Validation & QR** | `zod` `3.24.2`, `qrcode.react` `4.2.0` |

---

## Project Structure

```text
├── scripts/
│   └── verify-clinical-engine.ts      # Verification suite for hereditary rollup & AI schema
├── supabase/
│   └── migrations/
│       └── 0001_ayuvansha_schema.sql  # Tables, RLS policies, is_family_member(), storage rules
└── src/
    ├── app/
    │   ├── (auth)/login/page.tsx      # Email OTP / Magic link authentication
    │   ├── (dashboard)/
    │   │   ├── layout.tsx             # Authenticated shell & workspace header
    │   │   ├── page.tsx               # Family overview & Hereditary Risk Map
    │   │   ├── members/[memberId]/    # Individual chronological clinical timeline
    │   │   └── upload/page.tsx        # Document upload & HITL review queue
    │   ├── brief/[token]/page.tsx     # Public expiring 1-Page Doctor QR Brief
    │   └── api/
    │       ├── extract/route.ts       # Gemini multimodal extraction endpoint
    │       └── brief/[token]/verify/  # Consultation PIN verification & audit logging
    ├── components/
    │   ├── ui/                        # Reusable shadcn/ui-style primitives (Button, Card, DatePicker, SelectDropdown, SearchInput, Tabs, Badge)
    │   ├── brief/                     # QR share modal & PIN gate
    │   ├── dashboard/                 # Header workspace switcher & theme toggle
    │   ├── family/                    # Family dashboard & hereditary risk banner
    │   ├── timeline/                  # Filterable clinical timeline & member purge action
    │   └── upload/                    # Upload workspace & HITL verification card
    ├── lib/
    │   ├── ai/extractMedicalDoc.ts    # Gemini prompt, responseSchema & Explicit Null handling
    │   ├── data/repository.ts         # Unified Supabase + local demo data repository
    │   ├── hereditary/computeRisks.ts # 3-generation maternal/paternal graph traversal
    │   └── supabase/                  # Browser & Server SSR Supabase clients
    └── types/database.ts              # Shared TypeScript domain interfaces & tier limits
```

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_paid_tier_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Local Demo Mode:** If `.env.local` uses placeholder keys, AyuVansha automatically runs against a pre-seeded 3-generation demo family workspace so you can explore timelines, HITL verification, and the 1-Page Doctor QR Brief immediately.

### 3. Set Up Supabase (Production / Live Mode)

Run the SQL migration in [supabase/migrations/0001_ayuvansha_schema.sql](supabase/migrations/0001_ayuvansha_schema.sql) inside your Supabase SQL Editor to create all tables, Row-Level Security policies, and the private `medical-records` storage bucket.

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

- `npm run dev` — Start the Next.js development server
- `npm run build` — Build the production bundle
- `npm run start` — Start the production server
- `npm run lint` — Run Next.js ESLint checks
- `npm run test:risks` — Run hereditary risk & extraction schema verification

---

## Deploying to Vercel

AyuVansha is ready to host on **Vercel**:
1. Connect your repository to Vercel.
2. Add the environment variables from `.env.example` in **Project Settings → Environment Variables** (set `NEXT_PUBLIC_APP_URL` to your deployed `https://...vercel.app` URL).
3. Ensure live Supabase credentials are configured so data persists across serverless invocations.
