import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, differenceInDays, parseISO, format } from 'date-fns'
import type { CaseStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date helpers
export function formatDate(dateStr: string | null | undefined, fmt = 'MMM d, yyyy') {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), fmt) } catch { return '—' }
}

export function daysAgo(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  try { return differenceInDays(new Date(), parseISO(dateStr)) } catch { return null }
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never'
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }) }
  catch { return '—' }
}

// Name helpers
export function fullName(
  first?: string | null,
  last?: string | null,
  preferred?: string | null
): string {
  const display = preferred || first || ''
  return [display, last].filter(Boolean).join(' ') || 'Unknown'
}

export function initials(first?: string | null, last?: string | null): string {
  return [(first ?? '')[0], (last ?? '')[0]].filter(Boolean).join('').toUpperCase()
}

// Status helpers
export function statusLabel(status: CaseStatus): string {
  const labels: Record<CaseStatus, string> = {
    referred:          'Referred',
    intake_scheduled:  'Intake Scheduled',
    consent_pending:   'Consent Pending',
    scored:            'Scored',
    assigned:          'Assigned',
    active:            'Active',
    stable:            'Stable',
    closed:            'Closed',
  }
  return labels[status] ?? status
}

export function statusColor(status: CaseStatus): string {
  const colors: Record<CaseStatus, string> = {
    referred:          'bg-slate-100 text-slate-600',
    intake_scheduled:  'bg-blue-50 text-blue-700',
    consent_pending:   'bg-amber-50 text-amber-700',
    scored:            'bg-purple-50 text-purple-700',
    assigned:          'bg-teal-50 text-teal-700',
    active:            'bg-emerald-50 text-emerald-700',
    stable:            'bg-sky-50 text-sky-700',
    closed:            'bg-slate-100 text-slate-500',
  }
  return colors[status] ?? 'bg-slate-100 text-slate-600'
}

export function statusDot(status: CaseStatus): string {
  const dots: Record<CaseStatus, string> = {
    referred:          'bg-slate-400',
    intake_scheduled:  'bg-blue-500',
    consent_pending:   'bg-amber-500',
    scored:            'bg-purple-500',
    assigned:          'bg-teal-500',
    active:            'bg-emerald-500',
    stable:            'bg-sky-500',
    closed:            'bg-slate-300',
  }
  return dots[status] ?? 'bg-slate-400'
}

// Days urgency coloring
export function daysUrgency(days: number | null): 'ok' | 'warning' | 'critical' {
  if (days === null) return 'ok'
  if (days >= 7) return 'critical'
  if (days >= 3) return 'warning'
  return 'ok'
}

export function daysColor(days: number | null): string {
  const urgency = daysUrgency(days)
  if (urgency === 'critical') return 'text-red-600 font-semibold'
  if (urgency === 'warning')  return 'text-amber-600 font-medium'
  return 'text-slate-500'
}

// Involvement score badge
export function scoreColor(score: number | null | undefined): string {
  if (!score) return 'bg-slate-100 text-slate-500'
  if (score === 4) return 'bg-red-50 text-red-700 ring-1 ring-red-200'
  if (score === 3) return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
  if (score === 2) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
}

// Grade display
export function gradeDisplay(grade: string | null | undefined): string {
  if (!grade) return '—'
  const map: Record<string, string> = {
    '6': '6th', '7': '7th', '8': '8th',
    '9': '9th', '10': '10th', '11': '11th', '12': '12th',
  }
  return map[grade] ?? grade
}

// Phone formatting
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }
  return phone
}
