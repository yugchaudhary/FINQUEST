# THE FOUNDER'S GAMBIT

> A strategic battle of ideas, conviction and calculated risk.

A production-ready full-stack live event platform for a startup pitch competition combining strategic investing (Gambits), live judging, and a final rating round. Built with Next.js, TypeScript, Supabase, and Tailwind CSS.

![Phase](https://img.shields.io/badge/Phase_1-Gambit_Engine-8b5cf6)
![Phase](https://img.shields.io/badge/Phase_2-Finals_Rating-f59e0b)
![Stack](https://img.shields.io/badge/Stack-Next.js_14_%2B_Supabase-000000)

---

## 🎯 Overview

**THE FOUNDER'S GAMBIT** is an interactive competition platform featuring:

- **Phase 1 — The Gambit**: Investor teams watch innovator teams pitch, then place strategic bets (Gambits) on Red vs Blue teams. Judge results determine multipliers and settlement.
- **Phase 2 — The Finals**: Top-performing investors become finalists, pitch their own ideas, and are rated by remaining investors and judges.

### Key Features

- ✅ Real-time event synchronization (Supabase Realtime)
- ✅ Server-authoritative business logic (no client trust)
- ✅ Atomic financial settlement with race condition protection
- ✅ Role-based access control (Admin vs Participant)
- ✅ Excel import for team data
- ✅ Event state machine with validated transitions
- ✅ Comprehensive audit logging
- ✅ Indian number formatting (₹10,00,000)
- ✅ Responsive design (mobile/tablet/desktop/projector)
- ✅ Premium dark theme with animations

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) + TypeScript |
| **UI** | Tailwind CSS + Framer Motion |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth + RLS |
| **Realtime** | Supabase Realtime (Broadcast channels) |
| **Excel Import** | xlsx (SheetJS) |
| **Validation** | Zod |
| **Icons** | Lucide React |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A Supabase project ([create one free](https://supabase.com))
- OR Docker for local Supabase development

### 1. Clone & Install

```bash
cd FINQUEST
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAIL=admin@foundersgambit.com
ADMIN_PASSWORD=admin123456
```

### 3. Set Up Database

#### Option A: Remote Supabase Project

1. Go to your Supabase project → SQL Editor
2. Run the migration files in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_functions.sql`
3. Run `supabase/seed.sql` for demo data

#### Option B: Supabase CLI (Local)

```bash
npx supabase init
npx supabase start
npx supabase db reset  # Applies migrations + seed
```

### 4. Seed Demo Data

After database setup, seed the demo data via the API:

```bash
# Start the dev server first
npm run dev

# Then seed (in another terminal)
curl -X POST http://localhost:3000/api/seed
```

This creates:
- 1 Admin account
- 20 Team accounts (across 4 categories)
- Credentials for all accounts

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 👤 Demo Credentials

### Admin
- **Email**: `admin@foundersgambit.com`
- **Password**: `admin123456`
- **Login URL**: `/admin/login`

### Teams (Pattern)
- **Email**: `{team-slug}@foundersgambit.com`
- **Password**: `gambit-{team-slug}-2024`
- **Login URL**: `/login`

Example teams:
| Team | Email | Password |
|------|-------|----------|
| CyberVault | `cybervault@foundersgambit.com` | `gambit-cybervault-2024` |
| DataPulse | `datapulse@foundersgambit.com` | `gambit-datapulse-2024` |
| VitaCore | `vitacore@foundersgambit.com` | `gambit-vitacore-2024` |

---

## 📁 Project Structure

```
FINQUEST/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Public landing page
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Design system
│   │   ├── login/page.tsx              # Participant login
│   │   ├── admin/
│   │   │   ├── layout.tsx              # Admin sidebar layout
│   │   │   ├── login/page.tsx          # Admin login
│   │   │   ├── page.tsx                # Overview/Command Center
│   │   │   ├── setup/page.tsx          # Excel import + team setup
│   │   │   ├── live-match/page.tsx     # Match broadcast + results
│   │   │   ├── phase1-finale/page.tsx  # Publish leaderboard
│   │   │   ├── finals-transition/      # Role swap + finalist selection
│   │   │   ├── finals-broadcast/       # Finalist live broadcast
│   │   │   ├── finals-scoring/         # Score calculation
│   │   │   ├── audit/page.tsx          # Audit log viewer
│   │   │   └── settings/page.tsx       # Event settings
│   │   ├── dashboard/page.tsx          # Participant dashboard
│   │   ├── api/seed/route.ts           # Demo data seeder
│   │   └── actions/                    # Server Actions
│   │       ├── auth.ts
│   │       ├── teams.ts
│   │       ├── matches.ts
│   │       ├── gambits.ts
│   │       ├── settlement.ts
│   │       ├── leaderboard.ts
│   │       ├── finals.ts
│   │       └── event-state.ts
│   ├── components/
│   │   ├── ui/                         # Design system components
│   │   ├── gambit/                     # Phase 1 components
│   │   ├── finals/                     # Phase 2 components
│   │   └── leaderboard/               # Leaderboard components
│   ├── hooks/                          # Custom React hooks
│   ├── lib/
│   │   ├── supabase/                   # Client factories
│   │   ├── state-machine.ts
│   │   ├── constants.ts
│   │   ├── validators.ts
│   │   ├── format.ts
│   │   └── audit.ts
│   └── types/                          # TypeScript definitions
├── supabase/
│   ├── migrations/                     # SQL schema + RLS + functions
│   └── seed.sql                        # Demo data
├── public/                             # Static assets
└── package.json
```

---

## 🎮 Event Flow

### Phase 1: The Gambit

```
Admin: Import Teams → Assign Roles → Set Balances
           ↓
Admin: Select Category → Pick Red & Blue → BROADCAST MATCH
           ↓
Participants: See RED vs BLUE → Select Team → Enter Amount → LOCK GAMBIT
           ↓
Admin: Enter Judge Score (5-0 to 0-5) → SUBMIT RESULT
           ↓
System: Settle all Gambits atomically (multiplier × amount)
           ↓
Repeat for 10 rounds
           ↓
Admin: PUBLISH PHASE 1 LEADERBOARD
```

### Phase 2: The Finals

```
Admin: Change top Investor teams to Innovator → Select Finalists → INITIALIZE FINALS
           ↓
Admin: Select Finalist → BROADCAST
           ↓
Remaining Investors: Rate on 1.0 - 10.0 scale → SUBMIT SCORE
           ↓
Admin: Enter Judges' Average → CALCULATE
           ↓
System: Final Score = (Investor Avg × 0.5) + (Judges Avg × 0.5)
           ↓
Finals Leaderboard updates live
```

### Multiplier Table

| Score Distribution | Winner Multiplier | Loser Multiplier |
|---|---|---|
| 5-0 | 3.0× | 0.0× |
| 4-1 | 2.2× | 0.5× |
| 3-2 | 1.6× | 0.8× |

---

## 🔒 Security

- **Server-authoritative**: All calculations happen server-side
- **Row Level Security**: Supabase RLS policies enforce access control
- **Atomic transactions**: Balance settlement uses PostgreSQL `FOR UPDATE` locks
- **Auth verification**: Every server action verifies `getUser()` (never `getSession()`)
- **Input validation**: Zod schemas on all server actions
- **No client trust**: Balances, multipliers, scores are never trusted from the client

---

## 📦 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Set environment variables
4. Deploy

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
ADMIN_EMAIL=admin@foundersgambit.com
ADMIN_PASSWORD=your-secure-admin-password
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 🧪 Testing

### Build Verification
```bash
npm run build
npm run lint
```

### End-to-End Test Scenarios

1. **Import**: Upload Excel → Preview → Assign roles → Confirm
2. **Broadcast**: Admin broadcasts match → Participants see it in real-time
3. **Gambit**: Enter ₹3,00,000 → Clamps to ₹2,50,000 → Lock → Ledger deducted
4. **Settlement**: Enter 4-1 → 2.2× multiplier → Balances settle atomically
5. **Leaderboard**: Publish → All participants see leaderboard simultaneously
6. **Finals**: Initialize → Broadcast finalist → Rate → Calculate → Live leaderboard

---

## 📄 License

Built for THE FOUNDER'S GAMBIT event. All rights reserved.
