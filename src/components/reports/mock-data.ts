// Realistic mock data for The Book Works executive reporting

// ── Annual Report Table ───────────────────────────────────────────────────────
// Exact format from Platform Wishlist: cols a/b/c/d, rows by service type
export const ANNUAL_TABLE = {
  year: 2025,
  rows: [
    {
      service:     'Referred',
      served:      94,   // people served at any point
      openAtEnd:   12,   // open as of 12/31
      progress:    null, // N/A for referrals
      noProgress:  null,
    },
    {
      service:     'Ed Advocacy',
      served:      61,
      openAtEnd:   24,
      progress:    28,
      noProgress:  9,
    },
    {
      service:     'Engagement Sites',
      served:      47,
      openAtEnd:   31,
      progress:    null,
      noProgress:  null,
    },
    {
      service:     'Youth & Family Services',
      served:      19,
      openAtEnd:   7,
      progress:    11,
      noProgress:  1,
    },
    {
      service:     'Youth Development',
      served:      33,
      openAtEnd:   14,
      progress:    null,
      noProgress:  null,
    },
  ],
  unduplicated: 118,  // unique individuals across all services
}

// ── KPI Snapshots (per time period) ────────────────────────────────────────────
export const KPI = {
  thisYear: {
    learnersServed:     61,
    goalsReached:       28,
    totalExited:        37,
    avgDaysInService:   84,
    stableRate:         76,   // % closed as stable (not referred back)
    goalCompletionRate: 46,   // % of exited who reached goals
  },
  thisQuarter: {
    learnersServed:     18,
    goalsReached:       9,
    totalExited:        11,
    avgDaysInService:   91,
    stableRate:         82,
    goalCompletionRate: 52,
  },
  thisMonth: {
    learnersServed:     6,
    goalsReached:       3,
    totalExited:        4,
    avgDaysInService:   78,
    stableRate:         75,
    goalCompletionRate: 50,
  },
}

// ── Exits per month (last 12 months) ────────────────────────────────────────────
export const EXITS_BY_MONTH = [
  { month: 'Apr',  reachedGoals: 1, stoppedResponding: 1, requestedExit: 0 },
  { month: 'May',  reachedGoals: 2, stoppedResponding: 1, requestedExit: 1 },
  { month: 'Jun',  reachedGoals: 3, stoppedResponding: 2, requestedExit: 0 },
  { month: 'Jul',  reachedGoals: 1, stoppedResponding: 3, requestedExit: 1 },
  { month: 'Aug',  reachedGoals: 2, stoppedResponding: 1, requestedExit: 0 },
  { month: 'Sep',  reachedGoals: 4, stoppedResponding: 2, requestedExit: 1 },
  { month: 'Oct',  reachedGoals: 3, stoppedResponding: 1, requestedExit: 2 },
  { month: 'Nov',  reachedGoals: 5, stoppedResponding: 0, requestedExit: 1 },
  { month: 'Dec',  reachedGoals: 2, stoppedResponding: 2, requestedExit: 0 },
  { month: 'Jan',  reachedGoals: 3, stoppedResponding: 1, requestedExit: 1 },
  { month: 'Feb',  reachedGoals: 1, stoppedResponding: 2, requestedExit: 0 },
  { month: 'Mar',  reachedGoals: 1, stoppedResponding: 1, requestedExit: 0 },
]

// ── Exit reasons donut ───────────────────────────────────────────────────────
export const EXIT_REASONS = [
  { name: 'Reached Goals',      value: 28, color: '#0d9488' },
  { name: 'Stopped Responding', value: 18, color: '#94a3b8' },
  { name: 'Requested Exit',     value: 9,  color: '#3b82f6' },
]

// ── Top barriers (from enrollment forms) ────────────────────────────────────
export const TOP_BARRIERS = [
  { barrier: 'Chronic Absences',        count: 34, pct: 56 },
  { barrier: 'Withdrawal / Gap',        count: 28, pct: 46 },
  { barrier: 'Mental Health Needs',     count: 21, pct: 34 },
  { barrier: 'Economic Needs',          count: 18, pct: 30 },
  { barrier: 'Transportation Issues',   count: 16, pct: 26 },
  { barrier: 'Online Learner',          count: 14, pct: 23 },
  { barrier: 'Justice-Involved',        count: 12, pct: 20 },
  { barrier: 'ECE / Special Ed',        count: 11, pct: 18 },
  { barrier: 'School Safety / Bullying',count: 9,  pct: 15 },
  { barrier: 'Foster Care',             count: 7,  pct: 11 },
]

// ── Involvement score distribution ────────────────────────────────────────────
export const SCORE_DIST = [
  { score: '1 — Low',    count: 8,  color: '#10b981' },
  { score: '2 — Mod-Low',count: 14, color: '#0d9488' },
  { score: '3 — Mod-High',count: 27, color: '#f59e0b' },
  { score: '4 — High',   count: 12, color: '#ef4444' },
]

// ── School distribution (top 8) ───────────────────────────────────────────────
export const SCHOOL_DIST = [
  { school: 'Waggener HS',           count: 11 },
  { school: 'Fern Creek Traditional',count: 9  },
  { school: 'Iroquois HS',           count: 7  },
  { school: 'Southern HS',           count: 6  },
  { school: 'Thomas Jefferson MS',   count: 5  },
  { school: 'Manual HS',             count: 4  },
  { school: 'Doss HS',               count: 4  },
  { school: 'Other',                 count: 15 },
]

// ── Grade distribution ────────────────────────────────────────────────────────
export const GRADE_DIST = [
  { grade: '6th',  count: 2  },
  { grade: '7th',  count: 3  },
  { grade: '8th',  count: 5  },
  { grade: '9th',  count: 12 },
  { grade: '10th', count: 14 },
  { grade: '11th', count: 15 },
  { grade: '12th', count: 7  },
  { grade: 'GED',  count: 3  },
]

// ── Referral sources ─────────────────────────────────────────────────────────
export const REFERRAL_SOURCES = [
  { source: 'School / Counselor', count: 22 },
  { source: 'Community Org',      count: 16 },
  { source: 'Family Member',      count: 12 },
  { source: 'Friend',             count: 9  },
  { source: 'Social Media',       count: 5  },
  { source: 'Other',              count: 8  },
]

// ── Missing data flags ────────────────────────────────────────────────────────
export const MISSING_DATA_FLAGS = [
  {
    caseNumber:   'TBW-2025-0008',
    name:         'Jaylen Morris',
    advocate:     'Darius M.',
    issues: ['No involvement score', 'Enrollment form not submitted'],
    severity: 'high',
  },
  {
    caseNumber:   'TBW-2025-0013',
    name:         'Tamara Diggs',
    advocate:     'Emily R.',
    issues: ['Missing exit date', 'Goals have no outcome recorded'],
    severity: 'high',
  },
  {
    caseNumber:   'TBW-2025-0017',
    name:         'Marcus Webb',
    advocate:     'Sam K.',
    issues: ['No case notes in 14 days'],
    severity: 'medium',
  },
  {
    caseNumber:   'TBW-2025-0020',
    name:         'Priya Nair',
    advocate:     'Emily R.',
    issues: ['Enrollment form is a draft (not submitted)'],
    severity: 'medium',
  },
  {
    caseNumber:   'TBW-2025-0022',
    name:         'Devon Hall',
    advocate:     'Darius M.',
    issues: ['Missing school / grade info', 'No pronouns recorded'],
    severity: 'low',
  },
  {
    caseNumber:   'TBW-2025-0026',
    name:         'Keisha Brown',
    advocate:     'Sam K.',
    issues: ['Missing preferred name'],
    severity: 'low',
  },
]
