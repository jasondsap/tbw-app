// src/components/coordinator/mock-data.ts
// Replace with real DB calls to v_active_caseload, getAdvocates(), getIntakePipeline()

import type { CaseStatus } from '@/types'

export const MOCK_ADVOCATES = [
  {
    id: 'adv-1',
    firstName: 'Ysa', lastName: 'Leon',
    email: 'ysa@thebookworks.org', phone: '5025550101',
    activeCases: 8, stableCases: 2,
    overdueNotes: 2,   // cases with 7+ days since last note
    atRisk: 1,         // cases with 14+ days no contact
    avgScore: 3.1,
  },
  {
    id: 'adv-2',
    firstName: 'Marcus', lastName: 'D.',
    email: 'marcus@thebookworks.org', phone: '5025550202',
    activeCases: 6, stableCases: 1,
    overdueNotes: 0,
    atRisk: 0,
    avgScore: 2.8,
  },
  {
    id: 'adv-3',
    firstName: 'Destiny', lastName: 'P.',
    email: 'destiny@thebookworks.org', phone: '5025550303',
    activeCases: 9, stableCases: 3,
    overdueNotes: 3,
    atRisk: 2,
    avgScore: 3.4,
  },
]

export const MOCK_ASSIGNMENT_QUEUE = [
  {
    caseId: 'q1', caseNumber: 'TBW-2025-0011', status: 'scored' as CaseStatus,
    firstName: 'Aaliyah', lastName: 'Reed', dateOfBirth: '2007-06-14',
    currentSchool: 'Seneca High School', currentGrade: '11',
    neighborhood: 'Smoketown', phonePrimary: '5025558001',
    involvementScore: 4, urgency: 'high', involvement: 'high',
    scoredDate: '2025-03-05',
    factors: ['Housing instability - hotel/car/street/evicted', 'Ongoing self-harm/suicidal ideation'],
    intakeSpecialist: 'Gail T.',
    consentsSigned: 5, consentsTotal: 5,
    daysInStatus: 2,
  },
  {
    caseId: 'q2', caseNumber: 'TBW-2025-0012', status: 'scored' as CaseStatus,
    firstName: 'Jordan', lastName: 'Kim', dateOfBirth: '2009-11-03',
    currentSchool: 'Iroquois High School', currentGrade: '9',
    neighborhood: 'South Louisville', phonePrimary: '5025558002',
    involvementScore: 3, urgency: 'high', involvement: 'low',
    scoredDate: '2025-03-06',
    factors: ['Unenrolled', 'Ongoing foster care involvement'],
    intakeSpecialist: 'Gail T.',
    consentsSigned: 4, consentsTotal: 5,
    daysInStatus: 1,
  },
  {
    caseId: 'q3', caseNumber: 'TBW-2025-0013', status: 'scored' as CaseStatus,
    firstName: 'Tre', lastName: 'Washington', dateOfBirth: '2008-02-20',
    currentSchool: 'Waggener High School', currentGrade: '10',
    neighborhood: 'Germantown', phonePrimary: '5025558003',
    involvementScore: 2, urgency: 'low', involvement: 'high',
    scoredDate: '2025-03-04',
    factors: ['Bullying', 'Multilingual learner'],
    intakeSpecialist: 'Gail T.',
    consentsSigned: 5, consentsTotal: 5,
    daysInStatus: 3,
  },
]

export const MOCK_ALL_ACTIVE_CASES = [
  // Ysa's cases
  {
    caseId: 'c1', caseNumber: 'TBW-2025-0003', status: 'active' as CaseStatus,
    firstName: 'DeShawn', lastName: 'Carter', dateOfBirth: '2008-04-15',
    currentSchool: 'Waggener High School', currentGrade: '10',
    advocateId: 'adv-1', advocateFirst: 'Ysa', advocateLast: 'Leon',
    involvementScore: 4, daysSinceLastNote: 2, openGoals: 3, completedGoals: 0,
    assignedDate: '2025-03-01', checkinFrequency: 'weekly',
    flag: null,
  },
  {
    caseId: 'c2', caseNumber: 'TBW-2025-0007', status: 'active' as CaseStatus,
    firstName: 'Tiana', lastName: 'Brooks', dateOfBirth: '2007-09-22',
    currentSchool: 'Seneca High School', currentGrade: '11',
    advocateId: 'adv-1', advocateFirst: 'Ysa', advocateLast: 'Leon',
    involvementScore: 2, daysSinceLastNote: 8, openGoals: 2, completedGoals: 1,
    assignedDate: '2025-02-10', checkinFrequency: 'biweekly',
    flag: 'overdue_note',
  },
  {
    caseId: 'c3', caseNumber: 'TBW-2025-0009', status: 'active' as CaseStatus,
    firstName: 'Keion', lastName: 'Simmons', dateOfBirth: '2009-01-10',
    currentSchool: 'Iroquois High School', currentGrade: '9',
    advocateId: 'adv-1', advocateFirst: 'Ysa', advocateLast: 'Leon',
    involvementScore: 3, daysSinceLastNote: 16, openGoals: 2, completedGoals: 0,
    assignedDate: '2025-02-01', checkinFrequency: 'weekly',
    flag: 'at_risk',
  },
  // Marcus's cases
  {
    caseId: 'c4', caseNumber: 'TBW-2025-0004', status: 'active' as CaseStatus,
    firstName: 'Destiny', lastName: 'Moore', dateOfBirth: '2007-05-30',
    currentSchool: 'Manual High School', currentGrade: '11',
    advocateId: 'adv-2', advocateFirst: 'Marcus', advocateLast: 'D.',
    involvementScore: 2, daysSinceLastNote: 1, openGoals: 1, completedGoals: 2,
    assignedDate: '2025-01-15', checkinFrequency: 'biweekly',
    flag: null,
  },
  {
    caseId: 'c5', caseNumber: 'TBW-2025-0005', status: 'active' as CaseStatus,
    firstName: 'Jaylen', lastName: 'Thomas', dateOfBirth: '2008-08-12',
    currentSchool: 'Waggener High School', currentGrade: '10',
    advocateId: 'adv-2', advocateFirst: 'Marcus', advocateLast: 'D.',
    involvementScore: 3, daysSinceLastNote: 4, openGoals: 3, completedGoals: 0,
    assignedDate: '2025-02-20', checkinFrequency: 'weekly',
    flag: null,
  },
  // Destiny's cases
  {
    caseId: 'c6', caseNumber: 'TBW-2025-0006', status: 'active' as CaseStatus,
    firstName: 'Zara', lastName: 'Green', dateOfBirth: '2008-03-07',
    currentSchool: 'Eastern High School', currentGrade: '10',
    advocateId: 'adv-3', advocateFirst: 'Destiny', advocateLast: 'P.',
    involvementScore: 4, daysSinceLastNote: 9, openGoals: 4, completedGoals: 0,
    assignedDate: '2025-02-15', checkinFrequency: 'weekly',
    flag: 'overdue_note',
  },
  {
    caseId: 'c7', caseNumber: 'TBW-2025-0008', status: 'active' as CaseStatus,
    firstName: 'Marquise', lastName: 'Taylor', dateOfBirth: '2006-12-01',
    currentSchool: 'Fern Creek High School', currentGrade: '12',
    advocateId: 'adv-3', advocateFirst: 'Destiny', advocateLast: 'P.',
    involvementScore: 3, daysSinceLastNote: 18, openGoals: 2, completedGoals: 1,
    assignedDate: '2025-01-10', checkinFrequency: 'weekly',
    flag: 'at_risk',
  },
  {
    caseId: 'c8', caseNumber: 'TBW-2025-0010', status: 'active' as CaseStatus,
    firstName: 'Brianna', lastName: 'Hayes', dateOfBirth: '2009-07-19',
    currentSchool: 'Atherton High School', currentGrade: '9',
    advocateId: 'adv-3', advocateFirst: 'Destiny', advocateLast: 'P.',
    involvementScore: 2, daysSinceLastNote: 11, openGoals: 1, completedGoals: 0,
    assignedDate: '2025-02-28', checkinFrequency: 'biweekly',
    flag: 'overdue_note',
  },
]

export const PROGRAM_STATS = {
  totalActive:       23,
  totalStable:        6,
  inIntakePipeline:   6,
  awaitingAssignment: 3,
  overdueNotes:       5,
  atRisk:             3,
  exitedThisMonth:    2,
  goalsCompletedYTD: 18,
}
