// Stable monitoring types

export type AttendancePullStatus = 'not_started' | 'requested' | 'received'
export type StableOutcome = 'stable' | 'refer_back' | null

export interface AttendanceLog {
  id:                string
  loggedAt:          string   // ISO
  loggedBy:          string
  pullDate:          string   // date records were actually pulled
  daysReviewed:      number   // how many school days of data
  unexcusedAbsences: number
  excusedAbsences:   number
  tardies:           number
  currentlyEnrolled: boolean | null
  notes:             string
  outcome:           StableOutcome   // stable = close service; refer_back = reopen advocacy
  referBackReason:   string
}

export interface StableCase {
  id:              string
  caseNumber:      string
  participantName: string
  pronouns:        string
  school:          string
  grade:           string
  exitDate:        string          // ISO date
  stableDueDate:   string          // exitDate + 30 days
  exitReason:      'reached_goals' | 'stopped_responding' | 'requested_exit'
  formerAdvocate:  string
  pullStatus:      AttendancePullStatus
  attendanceLogs:  AttendanceLog[]
  closedAt:        string | null   // ISO when Stable was closed
  outcome:         StableOutcome
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function daysElapsed(exitDate: string): number {
  return Math.floor((Date.now() - new Date(exitDate).getTime()) / 86400000)
}

export function daysRemaining(stableDueDate: string): number {
  return Math.ceil((new Date(stableDueDate).getTime() - Date.now()) / 86400000)
}

export type Urgency = 'overdue' | 'due_soon' | 'upcoming'

export function getUrgency(stableDueDate: string): Urgency {
  const rem = daysRemaining(stableDueDate)
  if (rem < 0) return 'overdue'
  if (rem <= 7) return 'due_soon'
  return 'upcoming'
}

export const EXIT_REASON_LABELS: Record<StableCase['exitReason'], string> = {
  reached_goals:      'Reached Goals',
  stopped_responding: 'Stopped Responding',
  requested_exit:     'Requested Exit',
}

// ── Mock data ────────────────────────────────────────────────────────────────
const today = new Date()
const daysAgo = (n: number) => {
  const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
}
const daysAfter = (base: string, n: number) => {
  const d = new Date(base); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}

export const MOCK_STABLE_CASES: StableCase[] = [
  {
    id: 'sc1', caseNumber: 'TBW-2025-0018',
    participantName: 'Marcus Webb', pronouns: 'he/him',
    school: 'Waggener High School', grade: '11',
    exitDate: daysAgo(34), stableDueDate: daysAfter(daysAgo(34), 30),
    exitReason: 'reached_goals',
    formerAdvocate: 'Emily R.',
    pullStatus: 'not_started', attendanceLogs: [], closedAt: null, outcome: null,
  },
  {
    id: 'sc2', caseNumber: 'TBW-2025-0021',
    participantName: 'Aaliyah Thompson', pronouns: 'she/her',
    school: 'Fern Creek Traditional HS', grade: '10',
    exitDate: daysAgo(26), stableDueDate: daysAfter(daysAgo(26), 30),
    exitReason: 'reached_goals',
    formerAdvocate: 'Darius M.',
    pullStatus: 'requested', attendanceLogs: [], closedAt: null, outcome: null,
  },
  {
    id: 'sc3', caseNumber: 'TBW-2025-0009',
    participantName: 'Jordan Reyes', pronouns: 'they/them',
    school: 'Jefferson Traditional MS', grade: '8',
    exitDate: daysAgo(28), stableDueDate: daysAfter(daysAgo(28), 30),
    exitReason: 'stopped_responding',
    formerAdvocate: 'Sam K.',
    pullStatus: 'not_started', attendanceLogs: [], closedAt: null, outcome: null,
  },
  {
    id: 'sc4', caseNumber: 'TBW-2025-0025',
    participantName: 'Destiny Brown', pronouns: 'she/her',
    school: 'Iroquois High School', grade: '12',
    exitDate: daysAgo(14), stableDueDate: daysAfter(daysAgo(14), 30),
    exitReason: 'reached_goals',
    formerAdvocate: 'Emily R.',
    pullStatus: 'not_started', attendanceLogs: [], closedAt: null, outcome: null,
  },
  {
    id: 'sc5', caseNumber: 'TBW-2025-0031',
    participantName: 'Kendrick Johnson', pronouns: 'he/him',
    school: 'Thomas Jefferson MS', grade: '7',
    exitDate: daysAgo(5), stableDueDate: daysAfter(daysAgo(5), 30),
    exitReason: 'requested_exit',
    formerAdvocate: 'Darius M.',
    pullStatus: 'not_started', attendanceLogs: [], closedAt: null, outcome: null,
  },
  // One already closed
  {
    id: 'sc6', caseNumber: 'TBW-2025-0012',
    participantName: 'Brianna Santos', pronouns: 'she/her',
    school: 'Southern High School', grade: '9',
    exitDate: daysAgo(42), stableDueDate: daysAfter(daysAgo(42), 30),
    exitReason: 'reached_goals',
    formerAdvocate: 'Sam K.',
    pullStatus: 'received',
    attendanceLogs: [{
      id: 'al1', loggedAt: daysAgo(8) + 'T14:30:00Z', loggedBy: 'Jess',
      pullDate: daysAgo(9), daysReviewed: 20,
      unexcusedAbsences: 1, excusedAbsences: 0, tardies: 2,
      currentlyEnrolled: true, notes: 'Attendance looks good. Only one unexcused absence in 20 days.',
      outcome: 'stable', referBackReason: '',
    }],
    closedAt: daysAgo(8) + 'T14:35:00Z',
    outcome: 'stable',
  },
]
