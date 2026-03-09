# The Book Works Advocacy Platform

Next.js case management application for The Book Works education advocacy team.

## Stack
- **Next.js 15** (App Router)
- **Neon PostgreSQL** (serverless)
- **AWS Cognito** (auth)
- **Tailwind CSS** (styling)
- **Claude AI** (case note drafting, goal generation)

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.local.example .env.local
# Fill in your Neon DATABASE_URL and Cognito credentials
```

### 3. Run the database schema
- Open your Neon project dashboard
- Go to the SQL Editor
- Paste and run the contents of `schema.sql`

### 4. Start the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          ← Login page
│   ├── (dashboard)/           ← All protected pages (sidebar layout)
│   │   ├── intake/            ← Intake pipeline + new referral form
│   │   ├── cases/             ← Case management
│   │   ├── goals/             ← Goals tracker
│   │   ├── sites/             ← Engagement sites
│   │   └── reports/           ← Dashboards & reports
│   └── api/                   ← API routes
├── components/
│   ├── layout/sidebar.tsx     ← Nav sidebar
│   └── ui/                    ← Reusable components
├── lib/
│   ├── db/                    ← Neon SQL queries
│   ├── auth/                  ← Cognito auth helpers
│   └── utils.ts               ← Shared utilities
└── types/index.ts             ← TypeScript types
```

## Modules Built
- [x] Intake Pipeline dashboard
- [x] New Referral form (2-step)
- [ ] Case detail page
- [ ] Involvement scoring
- [ ] Consent form tracking
- [ ] Enrollment form + AI goal generation
- [ ] Case notes + AI drafting
- [ ] Exit workflow
- [ ] Dashboards (advocate, coordinator, data analyst, executive)
- [ ] Engagement sites

## Deployment
- **Development/Testing**: Vercel
- **Production**: AWS Amplify (HIPAA compliant with BAA)
```
