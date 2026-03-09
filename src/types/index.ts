// src/types/index.ts
// Core type definitions for the TBW Advocacy Platform

export type UserRole =
  | 'admin'
  | 'intake_specialist'
  | 'education_coordinator'
  | 'advocate'
  | 'data_analyst'
  | 'site_lead'
  | 'executive'

export type CaseStatus =
  | 'referred'
  | 'intake_scheduled'
  | 'consent_pending'
  | 'scored'
  | 'assigned'
  | 'active'
  | 'stable'
  | 'closed'

export type ParticipantRole = 'learner' | 'caregiver' | 'partner' | 'other'

export type GoalStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'no_progress'
  | 'discontinued'

export type ServiceType =
  | 'education_advocacy'
  | 'engagement_site'
  | 'youth_and_family'
  | 'youth_development'
  | 'info_and_referral'
  | 'stable'

export type ExitReason =
  | 'reached_goals'
  | 'stopped_responding'
  | 'requested_exit'
  | 'other'

export type ConsentFormType =
  | 'tbw_participation'
  | 'jcps_roi'
  | 'cascade_jcps'
  | 'medical_waiver'
  | 'emergency_contact'
  | 'policies_and_procedures'
  | 'engagement_site_enrollment'
  | 'caregiver_consent_learner_contact'

export interface User {
  id: string
  cognitoSub: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Participant {
  id: string
  firstName: string
  lastName: string
  preferredName?: string
  pronouns?: string
  dateOfBirth?: string
  role: ParticipantRole
  phonePrimary?: string
  phoneSecondary?: string
  email?: string
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressZip?: string
  neighborhood?: string
  referralSource?: string
  referralDate?: string
  howHeard?: string
  currentSchool?: string
  currentGrade?: string
  highestEdCompleted?: string
  isEmployed?: boolean
  healthConcerns?: string
  createdAt: string
}

export interface Case {
  id: string
  participantId: string
  caseNumber: string
  status: CaseStatus
  intakeSpecialistId?: string
  coordinatorId?: string
  advocateId?: string
  referralDate?: string
  intakeDate?: string
  consentReceivedDate?: string
  assignedDate?: string
  openedDate?: string
  closedDate?: string
  beginningEdStatus?: string
  currentEdStatus?: string
  checkinFrequency?: string
  exitReason?: ExitReason
  // Joined fields
  firstName?: string
  lastName?: string
  preferredName?: string
  dateOfBirth?: string
  phonePrimary?: string
  currentSchool?: string
  currentGrade?: string
  advocateFirst?: string
  advocateLast?: string
  coordinatorFirst?: string
  coordinatorLast?: string
  involvementScore?: number
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  caseId: string
  title: string
  description?: string
  category?: string
  status: GoalStatus
  aiGenerated: boolean
  targetDate?: string
  completedDate?: string
  outcomeNotes?: string
  progressPct: number
  displayOrder: number
  createdAt: string
}

export interface CaseNote {
  id: string
  caseId: string
  noteType: string
  interactionDate: string
  contactMethod?: string
  strengths?: string
  goalsDiscussed?: string
  barriers?: string
  nextSteps?: string
  fullNote: string
  aiDrafted: boolean
  authorId: string
  authorFirst?: string
  authorLast?: string
  createdAt: string
}

export interface Consent {
  id: string
  participantId: string
  caseId?: string
  formType: ConsentFormType
  status: 'pending' | 'signed' | 'declined' | 'expired'
  signedAt?: string
  signedByName?: string
  requiresNotarization: boolean
  notarizedBy?: string
}

export interface InvolvementScore {
  id: string
  caseId: string
  urgency: 'high' | 'low'
  involvement: 'high' | 'low'
  score: 1 | 2 | 3 | 4
  scoreNotes?: string
  factors: string[]
  scoredAt: string
}

// Pipeline view type (from v_intake_pipeline view)
export interface PipelineCase {
  caseId: string
  caseNumber: string
  status: CaseStatus
  referralDate?: string
  intakeDate?: string
  consentReceivedDate?: string
  assignedDate?: string
  firstName: string
  lastName: string
  phonePrimary?: string
  email?: string
  intakeSpecialist?: string
  involvementScore?: number
  daysInStatus: number
  consentsSigned: number
  consentsTotal: number
}

// Active caseload view type (from v_active_caseload view)
export interface ActiveCase {
  caseId: string
  caseNumber: string
  status: CaseStatus
  assignedDate?: string
  firstName: string
  lastName: string
  preferredName?: string
  dateOfBirth?: string
  currentSchool?: string
  currentGrade?: string
  advocateFirst?: string
  advocateLast?: string
  advocateId?: string
  coordinatorFirst?: string
  coordinatorLast?: string
  checkinFrequency?: string
  daysSinceLastNote?: number
  openGoals: number
  completedGoals: number
  involvementScore?: number
}

// Form schemas (for react-hook-form)
export interface NewReferralForm {
  // Participant
  firstName: string
  lastName: string
  preferredName?: string
  pronouns?: string
  dateOfBirth?: string
  phonePrimary: string
  phoneSecondary?: string
  email?: string
  addressStreet?: string
  addressCity?: string
  addressZip?: string
  neighborhood?: string
  // Education
  currentSchool?: string
  currentGrade?: string
  highestEdCompleted?: string
  // Referral
  referralSource: string
  howHeard?: string
  referralNotes?: string
  // Intake
  intakeSpecialistId: string
}
