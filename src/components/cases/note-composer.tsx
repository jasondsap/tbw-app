'use client'
import { useState } from 'react'
import { Zap, Send, Loader2, ChevronDown, ChevronUp, Clock, Phone, MessageSquare, Video, Users, FileText } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface NoteComposerProps {
  caseId:       string
  goals:        Record<string, any>[]
  notes:        Record<string, any>[]
  onNoteAdded:  (note: Record<string, any>) => void
}

const NOTE_TYPES = [
  { value: 'check_in',          label: 'Check-in' },
  { value: 'enrollment_meeting', label: 'Enrollment Meeting' },
  { value: 'intake_call',       label: 'Intake Call' },
  { value: 'phone_attempt',     label: 'Phone Attempt (No Answer)' },
  { value: 'records_request',   label: 'Records Request' },
  { value: 'exit_meeting',      label: 'Exit Meeting' },
  { value: 'general',           label: 'General Note' },
]

const CONTACT_METHODS = [
  { value: 'phone',     label: 'Phone Call',  icon: Phone },
  { value: 'text',      label: 'Text',        icon: MessageSquare },
  { value: 'in-person', label: 'In Person',   icon: Users },
  { value: 'virtual',   label: 'Virtual',     icon: Video },
]

const NOTE_TYPE_LABELS: Record<string, string> = {
  check_in: 'Check-in', enrollment_meeting: 'Enrollment Mtg',
  intake_call: 'Intake Call', phone_attempt: 'No Answer',
  records_request: 'Records', exit_meeting: 'Exit Mtg', general: 'Note',
}

export function NoteComposer({ caseId, goals, notes, onNoteAdded }: NoteComposerProps) {
  // Compose state
  const [noteType,      setNoteType]      = useState('check_in')
  const [contactMethod, setContactMethod] = useState('phone')
  const [date,          setDate]          = useState(new Date().toISOString().split('T')[0])
  const [strengths,     setStrengths]     = useState('')
  const [goalsText,     setGoalsText]     = useState('')
  const [barriers,      setBarriers]      = useState('')
  const [nextSteps,     setNextSteps]     = useState('')
  const [fullNote,      setFullNote]      = useState('')
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])

  // AI state
  const [aiInput,       setAiInput]       = useState('')
  const [aiLoading,     setAiLoading]     = useState(false)
  const [aiMode,        setAiMode]        = useState(false)

  // Submit state
  const [saving,        setSaving]        = useState(false)
  const [expandedNote,  setExpandedNote]  = useState<string | null>(null)

  const toggleGoal = (id: string) =>
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])

  const handleAiDraft = async () => {
    if (!aiInput.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/draft-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: aiInput, noteType, goals }),
      })
      const data = await res.json()
      if (data.strengths)  setStrengths(data.strengths)
      if (data.goals)      setGoalsText(data.goals)
      if (data.barriers)   setBarriers(data.barriers)
      if (data.nextSteps)  setNextSteps(data.nextSteps)
      if (data.fullNote)   setFullNote(data.fullNote)
      setAiMode(false)
    } catch (err) {
      console.error(err)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!fullNote.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/case-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId, noteType, interactionDate: date,
          contactMethod, strengths, goalsDiscussed: goalsText,
          barriers, nextSteps, fullNote,
          aiDrafted: !!aiInput, aiRawInput: aiInput || null,
          goalIds: selectedGoals.length ? selectedGoals : null,
        }),
      })
      const saved = await res.json()
      onNoteAdded({ ...saved, author_first: 'You', author_last: '' })
      // Reset form
      setStrengths(''); setGoalsText(''); setBarriers('')
      setNextSteps(''); setFullNote(''); setAiInput(''); setSelectedGoals([])
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-5 gap-0 min-h-[calc(100vh-200px)]">

      {/* ── Compose panel (left 3/5) ──────────────────────── */}
      <div className="col-span-3 border-r border-slate-200 bg-white">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">New Case Note</h3>

          {/* Type + Date + Method row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="form-label">Note Type</label>
              <select className="form-input text-sm" value={noteType} onChange={e => setNoteType(e.target.value)}>
                {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Date</label>
              <input type="date" className="form-input text-sm" value={date}
                onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Contact Method</label>
              <select className="form-input text-sm" value={contactMethod} onChange={e => setContactMethod(e.target.value)}>
                {CONTACT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {/* Goal tags */}
          {goals.length > 0 && (
            <div className="mb-4">
              <label className="form-label">Tag Goals</label>
              <div className="flex flex-wrap gap-2">
                {goals.filter(g => g.status !== 'completed').map(goal => (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                      selectedGoals.includes(goal.id)
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                    )}
                  >
                    {goal.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Draft toggle */}
        <div className="px-5 pt-4 pb-2">
          <button
            onClick={() => setAiMode(!aiMode)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border',
              aiMode
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-purple-200 hover:text-purple-600'
            )}
          >
            <Zap size={13} />
            {aiMode ? 'Drafting with AI...' : 'Draft with AI'}
          </button>
        </div>

        {/* AI input panel */}
        {aiMode && (
          <div className="mx-5 mb-4 p-4 bg-purple-50 border border-purple-100 rounded-xl">
            <p className="text-xs font-semibold text-purple-700 mb-2">
              Describe what happened — Claude will write the structured note for you
            </p>
            <textarea
              className="w-full text-sm border border-purple-200 rounded-lg p-3 bg-white
                         placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300
                         focus:border-purple-400 resize-none"
              rows={4}
              placeholder="e.g. Called DeShawn today. He answered. Said he went to school 4 out of 5 days this week. His mom mentioned transportation is still a problem on Tuesdays. He's interested in the tutoring program. Next check-in Wednesday..."
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
            />
            <button
              onClick={handleAiDraft}
              disabled={aiLoading || !aiInput.trim()}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700
                         disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              {aiLoading ? 'Drafting...' : 'Generate Note'}
            </button>
          </div>
        )}

        {/* Structured fields */}
        <div className="px-5 pb-5 space-y-4">
          {[
            { label: 'Strengths Observed', value: strengths, setter: setStrengths,
              placeholder: 'What strengths did the learner/caregiver demonstrate?' },
            { label: 'Goals Discussed', value: goalsText, setter: setGoalsText,
              placeholder: 'What goals were discussed or worked on?' },
            { label: 'Barriers Identified', value: barriers, setter: setBarriers,
              placeholder: 'What challenges or barriers were noted?' },
            { label: 'Next Steps', value: nextSteps, setter: setNextSteps,
              placeholder: 'What are the immediate next steps?' },
          ].map(field => (
            <div key={field.label}>
              <label className="form-label">{field.label}</label>
              <textarea
                rows={2}
                className="form-input resize-none text-sm"
                placeholder={field.placeholder}
                value={field.value}
                onChange={e => field.setter(e.target.value)}
              />
            </div>
          ))}

          <div>
            <label className="form-label">
              Full Note <span className="text-red-400 ml-0.5">*</span>
            </label>
            <textarea
              rows={6}
              className="form-input resize-none text-sm"
              placeholder="Write the complete narrative case note..."
              value={fullNote}
              onChange={e => setFullNote(e.target.value)}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !fullNote.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5
                       bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                       text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
              : <><Send size={15} /> Save Note</>
            }
          </button>
        </div>
      </div>

      {/* ── Notes history (right 2/5) ─────────────────────── */}
      <div className="col-span-2 bg-slate-50 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
          <h3 className="text-sm font-semibold text-slate-700">
            Note History
            <span className="ml-2 text-xs font-normal text-slate-400">({notes.length})</span>
          </h3>
        </div>

        <div className="p-4 space-y-3">
          {notes.map((note) => {
            const expanded = expandedNote === note.id
            return (
              <div key={note.id} className="card p-4 cursor-pointer hover:shadow-card-hover transition-shadow"
                onClick={() => setExpandedNote(expanded ? null : note.id)}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-700">
                      {NOTE_TYPE_LABELS[note.note_type] ?? note.note_type}
                    </span>
                    <span className="text-slate-300 text-xs">·</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(note.interaction_date)}
                    </span>
                    {note.ai_drafted && (
                      <span className="badge bg-purple-50 text-purple-600 text-[10px]">
                        <Zap size={9} /> AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-slate-300">
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mb-2">
                  {note.author_first} {note.author_last} · {note.contact_method}
                </p>

                <p className={cn('text-xs text-slate-600 leading-relaxed', !expanded && 'line-clamp-3')}>
                  {note.full_note}
                </p>

                {expanded && note.next_steps && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Next Steps
                    </p>
                    <p className="text-xs text-teal-700">{note.next_steps}</p>
                  </div>
                )}
              </div>
            )
          })}

          {notes.length === 0 && (
            <div className="text-center py-12">
              <FileText size={28} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No notes yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
