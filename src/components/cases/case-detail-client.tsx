'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, MapPin, GraduationCap, Calendar,
  User, AlertCircle, CheckCircle2, Clock, ChevronRight,
  FileText, Target, Shield, BookOpen, Send, Zap,
  MoreHorizontal, Edit2, Plus, ExternalLink,
} from 'lucide-react'
import { cn, formatDate, formatPhone, fullName, initials, statusLabel, statusColor, statusDot, scoreColor, gradeDisplay } from '@/lib/utils'
import { NoteComposer } from './note-composer'
import { GoalsPanel } from './goals-panel'
import { ConsentsPanel } from './consents-panel'
import { InvolvementScoreModal } from './involvement-score-modal'
import { RecordsRequestPanel } from './records-request-panel'

// ─── Types ───────────────────────────────────────────────────

type TabId = 'overview' | 'notes' | 'goals' | 'consents' | 'records'

interface CaseDetailClientProps {
  caseData:  Record<string, any>
  goals:     Record<string, any>[]
  notes:     Record<string, any>[]
  consents:  Record<string, any>[]
}

// ─── Small shared UI pieces ──────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 flex-shrink-0 w-36">{label}</span>
      <span className={cn('text-xs text-right', mono ? 'font-mono text-slate-700' : 'text-slate-700', !value && 'text-slate-300 italic')}>
        {value || '—'}
      </span>
    </div>
  )
}

function TabButton({ id, label, icon: Icon, activeTab, count, urgent, onClick }: {
  id: TabId; label: string; icon: React.ElementType
  activeTab: TabId; count?: number; urgent?: boolean; onClick: (id: TabId) => void
}) {
  const active = activeTab === id
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
        active
          ? 'border-teal-600 text-teal-700'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
      )}
    >
      <Icon size={15} />
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn(
          'text-xs rounded-full px-1.5 py-0.5 font-semibold min-w-[20px] text-center',
          urgent ? 'bg-red-100 text-red-600' : active ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

function AvatarInitials({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const chars = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className={cn(
      'rounded-full bg-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0',
      size === 'sm' && 'w-7 h-7 text-xs',
      size === 'md' && 'w-9 h-9 text-sm',
      size === 'lg' && 'w-12 h-12 text-base',
    )}>
      {chars}
    </div>
  )
}

// ─── Overview tab ─────────────────────────────────────────────

function OverviewTab({ caseData, goals, notes }: { caseData: any; goals: any[]; notes: any[] }) {
  const completedGoals = goals.filter(g => g.status === 'completed').length
  const openGoals      = goals.filter(g => g.status !== 'completed' && g.status !== 'discontinued').length

  return (
    <div className="grid grid-cols-3 gap-5 p-6">

      {/* Left col: participant + case info */}
      <div className="col-span-2 space-y-5">

        {/* Education status */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <GraduationCap size={15} className="text-teal-600" />
              Education Status
            </h3>
            <button className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1">
              <Edit2 size={11} /> Update
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Beginning Status
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {caseData.beginning_ed_status || '—'}
              </p>
            </div>
            <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1.5">
                Current Status
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {caseData.current_ed_status || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Goals summary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Target size={15} className="text-teal-600" />
              Goals
              <span className="text-xs font-normal text-slate-400">({openGoals} open)</span>
            </h3>
          </div>
          <div className="space-y-3">
            {goals.slice(0, 3).map((goal) => (
              <div key={goal.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', {
                  'bg-slate-300':   goal.status === 'not_started',
                  'bg-teal-500':    goal.status === 'in_progress',
                  'bg-emerald-500': goal.status === 'completed',
                  'bg-red-400':     goal.status === 'no_progress',
                })} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{goal.title}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-[120px]">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${goal.progress_pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{goal.progress_pct}%</span>
                    {goal.target_date && (
                      <span className="text-xs text-slate-400">Due {formatDate(goal.target_date, 'MMM d')}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {goals.length === 0 && (
              <p className="text-sm text-slate-400 italic text-center py-4">No goals yet</p>
            )}
          </div>
        </div>

        {/* Recent notes */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText size={15} className="text-teal-600" />
              Recent Case Notes
            </h3>
          </div>
          <div className="space-y-3">
            {notes.slice(0, 2).map((note) => (
              <div key={note.id} className="p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 capitalize">
                      {note.note_type.replace('_', ' ')}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{formatDate(note.interaction_date)}</span>
                    {note.ai_drafted && (
                      <span className="badge bg-purple-50 text-purple-600 text-[10px]">
                        <Zap size={9} /> AI
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{note.author_first} {note.author_last}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{note.full_note}</p>
                {note.next_steps && (
                  <div className="mt-2 flex items-start gap-1.5">
                    <ChevronRight size={11} className="text-teal-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-teal-700 font-medium">{note.next_steps}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right col: sidebar info */}
      <div className="space-y-4">

        {/* Quick stats */}
        <div className="card p-4 space-y-0">
          <InfoRow label="Case Number"   value={caseData.case_number} mono />
          <InfoRow label="Status"        value={statusLabel(caseData.status)} />
          <InfoRow label="Referral Date" value={formatDate(caseData.referral_date)} />
          <InfoRow label="Assigned"      value={formatDate(caseData.assigned_date)} />
          <InfoRow label="Check-ins"     value={caseData.checkin_frequency ?? null} />
          <InfoRow label="Contact Pref." value={caseData.preferred_contact ?? null} />
        </div>

        {/* Team */}
        <div className="card p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Case Team</h4>
          <div className="space-y-2.5">
            {[
              { role: 'Advocate',    first: caseData.advocate_first,    last: caseData.advocate_last,    phone: caseData.advocate_phone, email: caseData.advocate_email },
              { role: 'Coordinator', first: caseData.coordinator_first, last: caseData.coordinator_last, phone: null, email: null },
              { role: 'Intake',      first: caseData.intake_first,      last: caseData.intake_last,      phone: null, email: null },
            ].filter(m => m.first).map((member) => (
              <div key={member.role} className="flex items-center gap-2.5">
                <AvatarInitials name={`${member.first} ${member.last}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700">{member.first} {member.last}</p>
                  <p className="text-[10px] text-slate-400">{member.role}</p>
                </div>
                {member.phone && (
                  <a href={`tel:${member.phone}`} className="text-slate-300 hover:text-teal-600 transition-colors">
                    <Phone size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Involvement score */}
        <div className="card p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Involvement Score</h4>
          {caseData.involvement_score ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('text-3xl font-bold font-display', scoreColor(caseData.involvement_score).replace(/bg-\S+ /, '').replace(/ring\S+ /, ''))}>
                  {caseData.involvement_score}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    {caseData.urgency === 'high' ? 'High' : 'Low'} Urgency •{' '}
                    {caseData.involvement_level === 'high' ? 'High' : 'Low'} Involvement
                  </p>
                  <p className="text-[10px] text-slate-400">out of 4</p>
                </div>
              </div>
              {caseData.factors?.length > 0 && (
                <div className="space-y-1">
                  {caseData.factors.map((f: string) => (
                    <div key={f} className="flex items-start gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      <p className="text-[11px] text-slate-600">{f}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Not yet scored</p>
          )}
        </div>

        {/* Participant contact */}
        <div className="card p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Participant</h4>
          <div className="space-y-1.5">
            {caseData.phone_primary && (
              <a href={`tel:${caseData.phone_primary}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-teal-600 transition-colors">
                <Phone size={12} className="text-slate-300" />
                {formatPhone(caseData.phone_primary)}
              </a>
            )}
            {caseData.email && (
              <a href={`mailto:${caseData.email}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-teal-600 transition-colors">
                <Mail size={12} className="text-slate-300" />
                {caseData.email}
              </a>
            )}
            {caseData.neighborhood && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin size={12} className="text-slate-300" />
                {caseData.neighborhood} {caseData.address_zip && `· ${caseData.address_zip}`}
              </div>
            )}
            {caseData.current_school && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <GraduationCap size={12} className="text-slate-300" />
                {caseData.current_school}
                {caseData.current_grade && ` · ${gradeDisplay(caseData.current_grade)}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main client component ────────────────────────────────────

export function CaseDetailClient({ caseData, goals, notes, consents }: CaseDetailClientProps) {
  const [activeTab, setActiveTab]     = useState<TabId>('overview')
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [localNotes, setLocalNotes]   = useState(notes)
  const [localGoals, setLocalGoals]   = useState(goals)

  const participantName = fullName(caseData.first_name, caseData.last_name, caseData.preferred_name)
  const pendingConsents = consents.filter(c => c.status === 'pending').length
  const age = caseData.date_of_birth
    ? Math.floor((Date.now() - new Date(caseData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const handleNoteAdded = (newNote: Record<string, any>) => {
    setLocalNotes(prev => [newNote, ...prev])
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Case Header ─────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 pt-5 pb-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <Link href="/cases" className="hover:text-slate-600 transition-colors flex items-center gap-1">
              <ArrowLeft size={13} /> Cases
            </Link>
            <span>/</span>
            <span className="text-slate-600 font-medium">{caseData.case_number}</span>
          </div>

          {/* Main header row */}
          <div className="flex items-start justify-between gap-6 mb-5">
            <div className="flex items-start gap-4">
              <AvatarInitials name={participantName} size="lg" />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-bold text-navy-900 font-display">{participantName}</h1>
                  {caseData.pronouns && (
                    <span className="text-xs text-slate-400">({caseData.pronouns})</span>
                  )}
                  <span className={cn('badge', statusColor(caseData.status))}>
                    <span className={cn('stage-dot', statusDot(caseData.status))} />
                    {statusLabel(caseData.status)}
                  </span>
                  {caseData.involvement_score && (
                    <span className={cn('badge text-xs font-bold', scoreColor(caseData.involvement_score))}>
                      Score {caseData.involvement_score}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {age && <span>{age} years old</span>}
                  {caseData.current_school && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>{caseData.current_school}</span>
                    </>
                  )}
                  {caseData.current_grade && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>{gradeDisplay(caseData.current_grade)} Grade</span>
                    </>
                  )}
                  {caseData.advocate_first && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>Advocate: {caseData.advocate_first} {caseData.advocate_last}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!caseData.involvement_score && (
                <button
                  onClick={() => setShowScoreModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold
                             bg-amber-50 text-amber-700 border border-amber-200 rounded-lg
                             hover:bg-amber-100 transition-colors"
                >
                  <AlertCircle size={13} /> Score Case
                </button>
              )}
              <button
                onClick={() => setActiveTab('notes')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold
                           bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
              >
                <Plus size={13} /> Add Note
              </button>
              {/* Overflow menu */}
              <div className="relative group">
                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                  <MoreHorizontal size={16} />
                </button>
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-100
                                opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 py-1">
                  <Link
                    href={`/cases/${caseData.id}/enrollment`}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <FileText size={14} className="text-teal-600" /> Enrollment Form
                  </Link>
                  <Link
                    href={`/cases/${caseData.id}/exit`}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink size={14} className="text-amber-500" /> Begin Exit
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0 border-b-0 -mb-px overflow-x-auto">
            <TabButton id="overview"  label="Overview"  icon={User}      activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="notes"     label="Case Notes" icon={FileText}  activeTab={activeTab} count={localNotes.length} onClick={setActiveTab} />
            <TabButton id="goals"     label="Goals"     icon={Target}    activeTab={activeTab} count={localGoals.filter(g => g.status !== 'completed').length} onClick={setActiveTab} />
            <TabButton id="consents"  label="Consents"  icon={Shield}    activeTab={activeTab} count={pendingConsents} urgent={pendingConsents > 0} onClick={setActiveTab} />
            <TabButton id="records"   label="Records"   icon={BookOpen}  activeTab={activeTab} onClick={setActiveTab} />
          </div>
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────── */}
      <div className="page-enter">
        {activeTab === 'overview' && (
          <OverviewTab caseData={caseData} goals={localGoals} notes={localNotes} />
        )}
        {activeTab === 'notes' && (
          <NoteComposer
            caseId={caseData.id}
            goals={localGoals}
            notes={localNotes}
            onNoteAdded={handleNoteAdded}
          />
        )}
        {activeTab === 'goals' && (
          <GoalsPanel
            caseId={caseData.id}
            goals={localGoals}
            onGoalsChange={setLocalGoals}
          />
        )}
        {activeTab === 'consents' && (
          <ConsentsPanel
            caseId={caseData.id}
            participantName={participantName}
            consents={consents}
          />
        )}
        {activeTab === 'records' && (
          <RecordsRequestPanel
            caseId={caseData.id}
            participantName={participantName}
            schoolName={caseData.current_school}
            advocateName={`${caseData.advocate_first ?? ''} ${caseData.advocate_last ?? ''}`.trim()}
          />
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      {showScoreModal && (
        <InvolvementScoreModal
          caseId={caseData.id}
          onClose={() => setShowScoreModal(false)}
          onScored={(score) => {
            setShowScoreModal(false)
            // In production: refresh caseData
          }}
        />
      )}
    </div>
  )
}
