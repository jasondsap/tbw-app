// Enrollment form types - every field from Enrollment_Form_2025.docx

// ── Section 1: Participant Information ──────────────────────────────────────
export interface ParticipantSection {
  firstName:        string
  lastName:         string
  preferredName:    string
  pronouns:         string
  howHeard:         string[]   // checkboxes
  howHeardOrg:      string     // "Community organization: ___"
  howHeardOther:    string
  tbwGoals:         string[]   // goals for working with TBW
  tbwGoalsOther:    string
}

// ── Section 2: Education & Employment ───────────────────────────────────────
export interface EducationSection {
  currentSchool:       string
  currentGrade:        string
  highestEdCompleted:  string  // 'elementary' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'ged' | 'none'
  lastAttended:        string  // when
  lastAttendedWhere:   string
  hsStartYear:         string
  graduated:           boolean | null
  employed:            boolean | null
  occupation:          string
  healthConcerns:      string
}

// ── Section 3: Your Goals (strengths-based) ─────────────────────────────────
export interface GoalsSection {
  strengths:         string[]
  strengthsOther:    string
  longTermGoals:     string[]
  careerInterests:   string
}

// ── Section 4: Challenges ────────────────────────────────────────────────────
export interface ChallengesSection {
  classChallenges:   string[]   // checkboxes
  schoolChallenges:  string[]   // checkboxes
  suspensions:       boolean
  suspensionsDetail: string
}

// ── Section 5: Barriers (the big structured section) ────────────────────────
export interface BarrierEntry {
  active:  boolean
  detail:  string    // generic detail field
  detail2: string    // second detail for barriers with two questions
}

export interface BarriersSection {
  chronicAbsences:   BarrierEntry & { howLong: string; why: string }
  withdrawalGap:     BarrierEntry & { howLong: string }
  onlineLearner:     BarrierEntry & { howLong: string; why: string }
  schoolSafety:      BarrierEntry & { howLong: string; addressed: string }
  fosterCare:        BarrierEntry & { length: string }
  justiceInvolved:   BarrierEntry & { status: string }
  ece:               BarrierEntry & { hasIep: string; needsEval: string }
  multilingual:      BarrierEntry & { support: string }
  mentalHealth:      BarrierEntry & { referral: string }
  economicNeeds:     BarrierEntry & { assistance: string }
  transportation:    BarrierEntry & { howLong: string; support: string }
  houselessness:     BarrierEntry & { assistance: string }
  primaryBarrier:    string   // free text "primary barrier" field
}

// ── Section 6: Resources Requested ──────────────────────────────────────────
export interface ResourcesSection {
  resources:      string[]
  resourcesOther: string
}

// ── Full form ────────────────────────────────────────────────────────────────
export interface EnrollmentFormData {
  participant:  ParticipantSection
  education:    EducationSection
  goals:        GoalsSection
  challenges:   ChallengesSection
  barriers:     BarriersSection
  resources:    ResourcesSection
  meetingDate:  string
  meetingType:  'in_person' | 'virtual' | ''
  notes:        string     // advocate's additional notes
  status:       'draft' | 'submitted'
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const HOW_HEARD_OPTIONS = [
  'Family member', 'Friend', 'Teacher or school counselor',
  'Social Media', 'Newspaper', 'Community organization', 'Other',
]

export const TBW_GOALS = [
  'To return to middle or high school',
  'To make up credits needed for graduation',
  'To increase reading or math skills',
  'To learn about my education options',
  'To earn a high school diploma',
  'To earn a GED',
]

export const EDUCATION_LEVELS = [
  { value: 'elementary', label: 'Elementary School' },
  { value: '6',  label: '6th grade' },
  { value: '7',  label: '7th grade' },
  { value: '8',  label: '8th grade' },
  { value: '9',  label: '9th grade' },
  { value: '10', label: '10th grade' },
  { value: '11', label: '11th grade' },
  { value: '12', label: '12th grade' },
  { value: 'ged',  label: 'GED' },
  { value: 'none', label: 'No Formal Education' },
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
  'Learning is difficult for me', 'Classes are not challenging',
  'I failed courses',
]

export const SCHOOL_ENV_CHALLENGES = [
  "I don't have a connection with teachers",
  "I don't like my school",
  'I experience discrimination at school',
  'I experience violence or lack of safety at school',
]

export const RESOURCES = [
  'Youth Leadership/Civic Engagement',
  'College Preparation',
  'Post-Secondary/Vocational Training',
  'Employment',
  'Food Resources',
  'Housing Resources',
  'Immigration Services',
  'Job Training',
  'Juvenile/Criminal Justice Resources',
  'LGBTQ Resources',
  'Medical Assistance',
  'Mental Health Resources',
  'Pregnant/Parenting Youth',
  'Substance (drug/alcohol) Abuse',
  'Victim Assistance - Urgent Safety Concerns',
  'Victim Assistance - Other',
]

// ── Defaults ──────────────────────────────────────────────────────────────────

const emptyBarrier = (): BarrierEntry => ({ active: false, detail: '', detail2: '' })

export const DEFAULT_FORM: EnrollmentFormData = {
  participant: {
    firstName: '', lastName: '', preferredName: '', pronouns: '',
    howHeard: [], howHeardOrg: '', howHeardOther: '',
    tbwGoals: [], tbwGoalsOther: '',
  },
  education: {
    currentSchool: '', currentGrade: '', highestEdCompleted: '',
    lastAttended: '', lastAttendedWhere: '',
    hsStartYear: '', graduated: null,
    employed: null, occupation: '', healthConcerns: '',
  },
  goals: {
    strengths: [], strengthsOther: '',
    longTermGoals: [], careerInterests: '',
  },
  challenges: {
    classChallenges: [], schoolChallenges: [],
    suspensions: false, suspensionsDetail: '',
  },
  barriers: {
    chronicAbsences:  { ...emptyBarrier(), howLong: '', why: '' },
    withdrawalGap:    { ...emptyBarrier(), howLong: '' },
    onlineLearner:    { ...emptyBarrier(), howLong: '', why: '' },
    schoolSafety:     { ...emptyBarrier(), howLong: '', addressed: '' },
    fosterCare:       { ...emptyBarrier(), length: '' },
    justiceInvolved:  { ...emptyBarrier(), status: '' },
    ece:              { ...emptyBarrier(), hasIep: '', needsEval: '' },
    multilingual:     { ...emptyBarrier(), support: '' },
    mentalHealth:     { ...emptyBarrier(), referral: '' },
    economicNeeds:    { ...emptyBarrier(), assistance: '' },
    transportation:   { ...emptyBarrier(), howLong: '', support: '' },
    houselessness:    { ...emptyBarrier(), assistance: '' },
    primaryBarrier:   '',
  },
  resources: { resources: [], resourcesOther: '' },
  meetingDate: '', meetingType: '', notes: '', status: 'draft',
}

// Sections for nav
export const SECTIONS = [
  { id: 'participant',  label: 'Participant Info',    icon: '👤' },
  { id: 'education',    label: 'Education & Work',    icon: '🏫' },
  { id: 'goals',        label: 'Goals & Strengths',   icon: '⭐' },
  { id: 'challenges',   label: 'Challenges',          icon: '📚' },
  { id: 'barriers',     label: 'Barriers',            icon: '🚧' },
  { id: 'resources',    label: 'Resources',           icon: '🔗' },
]
