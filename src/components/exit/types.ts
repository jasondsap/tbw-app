// Exit wizard shared types

export type ExitReason =
  | 'reached_goals'
  | 'stopped_responding'
  | 'requested_exit'
  | 'change_in_goals'
  | 'referred_but_not_enrolled'
export type MeetingHeld = 'yes' | 'no'

// Canonical 11-phrase service exit narrative (Casebook Process.pdf).
// Kept as a string column so "Other" free text is also valid.
export const SERVICE_EXIT_NARRATIVES = [
  'Re-enrolled in school.',
  'Learning online with additional supports.',
  'Returned to school post-suspension.',
  'Returned to school with a safety plan.',
  'Returned to out-of-county school.',
  'Returned to school with a plan for additional in-school supports.',
  'Returned to school after receiving additional out-of-school supports.',
  'Returned to school with a plan for transportation.',
  'Enrolled in ongoing education advocacy services to reach goals.',
  'Exited without re-enrolling in school or unknown departure.',
  'Referred but not enrolled.',
] as const

export type ServiceExitNarrative = (typeof SERVICE_EXIT_NARRATIVES)[number]

// Suggested narratives per short reason — UI pre-selects/sorts by these.
export const NARRATIVE_SUGGESTIONS: Record<ExitReason, ServiceExitNarrative[]> = {
  reached_goals: [
    'Re-enrolled in school.',
    'Returned to school post-suspension.',
    'Returned to school with a safety plan.',
    'Returned to school with a plan for additional in-school supports.',
    'Returned to school after receiving additional out-of-school supports.',
    'Returned to school with a plan for transportation.',
    'Returned to out-of-county school.',
    'Learning online with additional supports.',
    'Enrolled in ongoing education advocacy services to reach goals.',
  ],
  stopped_responding: [
    'Exited without re-enrolling in school or unknown departure.',
  ],
  requested_exit: [
    'Exited without re-enrolling in school or unknown departure.',
    'Re-enrolled in school.',
  ],
  change_in_goals: [
    'Enrolled in ongoing education advocacy services to reach goals.',
  ],
  referred_but_not_enrolled: [
    'Referred but not enrolled.',
  ],
}

export interface GoalOutcome {
  goalId:     string
  goalText:   string
  reached:    boolean | null
  endDate:    string
  comments:   string
}

export interface ContactAttempt {
  date:   string
  method: 'phone_call' | 'text' | 'voicemail'
  notes:  string
}

export interface ExitInterviewData {
  // Education
  currentSchool:  string
  currentGrade:   string
  graduated:      boolean | null
  // Employment
  employed:       boolean | null
  occupation:     string
  // Goals table (pulled from case goals)
  goalOutcomes:   GoalOutcome[]
  // Next steps
  nextSteps: {
    twoYearCollege:     boolean
    fourYearCollege:    boolean
    tradeSchool:        boolean
    employment:         boolean
    military:           boolean
    stillPlanning:      boolean
  }
  // Barriers table (free text - they fill in their starting barriers + improved Y/N)
  barrierOutcomes: { barrier: string; improved: boolean | null; comments: string }[]
  // Page 2 - Programs
  programsParticipated: string[]
  positiveChanges:      string
  satisfactionRating:   number | null  // 1-5
  howToImprove:         string
}

export interface ToolkitData {
  // Strengths
  strengths: string[]
  strengthsOther: string
  // Long-term goals
  longTermGoals: string[]
  // Next steps narrative
  nextStepsNarrative: string
  // Challenges
  challengeClasses:     string[]
  challengeSchool:      string[]
  // Self-advocacy
  selfAdvocacyStatement: string
  // Trusted adults
  trustedAdults: { name: string; phone: string }[]
  // Coping skills
  copingSkills: string[]
}

export interface ExitWizardState {
  step:          number
  reason:        ExitReason | null
  narrative:     string   // one of SERVICE_EXIT_NARRATIVES or free text via "Other"
  meetingHeld:   MeetingHeld | null
  contactAttempts: ContactAttempt[]  // for stopped_responding
  interview:     ExitInterviewData
  toolkit:       ToolkitData
  caseNote:      string
  exitDate:      string
  submitting:    boolean
  submitted:     boolean
}

// ── Constants ────────────────────────────────────────────────────────────────

export const PROGRAMS = [
  'Education Engagement Hub @ Americana',
  'Education Engagement Hub @ Neighborhood House',
  'Tutoring or reading support',
  'Education Advocacy: Special Education Services',
  'Education Advocacy: Attendance or Behavior Services',
  'Education Self-Advocacy Workshop for Students and Parents',
  'Youth Mental Wellness Program',
  'Family Support Services',
]

export const STRENGTHS = [
  'Reading', 'Math', 'Science', 'Writing', 'Taking tests',
  'Asking questions', 'Solving problems', 'Working in a group',
  'Leading other people', 'Setting and reaching goals', 'Art or music',
  'Making plans for my future', 'Listening', 'Explaining what I think',
]

export const LONG_TERM_GOALS = [
  '2-year college', '4-year college', 'Trade or technical school',
  'Employment', 'Military', 'Still making plans',
]

export const CLASS_CHALLENGES = [
  'Classes are hard', 'Classes are not relevant',
  'Learning is difficult for me', 'Classes are not challenging', 'I failed courses',
]

export const SCHOOL_CHALLENGES = [
  "I don't have a connection with teachers", "I don't like my school",
  'I experience discrimination at school',
  'I experience violence or lack of safety at school',
]

export const COPING_SKILLS = [
  'Breathing Techniques', 'Exercise', 'Coloring', 'Journaling',
  'Make a playlist', 'Go outside', 'Therapy', 'Talk with a safe person',
]

export const STEPS_FOR_REASON: Record<ExitReason, number[]> = {
  reached_goals:             [1, 2, 3, 4, 5, 6], // reason, interview, toolkit, goals, note, finalize
  stopped_responding:        [1, 4, 5, 6],        // reason, goals, note, finalize
  requested_exit:            [1, 4, 5, 6],        // reason, goals, note, finalize
  change_in_goals:           [1, 4, 5, 6],        // reason, goals, note, finalize
  referred_but_not_enrolled: [1, 5, 6],            // reason, note, finalize — no goals/interview
}

export const STEP_LABELS = [
  '', // 0 unused
  'Reason',
  'Exit Interview',
  'Completion Toolkit',
  'Goals Review',
  'Exit Note',
  'Finalize',
]

export const DEFAULT_INTERVIEW: ExitInterviewData = {
  currentSchool: '', currentGrade: '', graduated: null,
  employed: null, occupation: '',
  goalOutcomes: [],
  nextSteps: { twoYearCollege: false, fourYearCollege: false, tradeSchool: false, employment: false, military: false, stillPlanning: false },
  barrierOutcomes: [],
  programsParticipated: [],
  positiveChanges: '', satisfactionRating: null, howToImprove: '',
}

export const DEFAULT_TOOLKIT: ToolkitData = {
  strengths: [], strengthsOther: '',
  longTermGoals: [],
  nextStepsNarrative: '',
  challengeClasses: [], challengeSchool: [],
  selfAdvocacyStatement: '',
  trustedAdults: [{ name: '', phone: '' }, { name: '', phone: '' }],
  copingSkills: [],
}
