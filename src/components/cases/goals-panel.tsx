'use client'
import { useState } from 'react'
import { Plus, Zap, Target, CheckCircle2, Circle, Loader2, Edit2, ChevronDown } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface GoalsPanelProps {
  caseId:        string
  goals:         Record<string, any>[]
  onGoalsChange: (goals: Record<string, any>[]) => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  not_started:  { label: 'Not Started',  color: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-300' },
  in_progress:  { label: 'In Progress',  color: 'bg-teal-50 text-teal-700',       dot: 'bg-teal-500' },
  completed:    { label: 'Completed',    color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  no_progress:  { label: 'No Progress',  color: 'bg-red-50 text-red-600',         dot: 'bg-red-400' },
  discontinued: { label: 'Discontinued', color: 'bg-slate-100 text-slate-400',    dot: 'bg-slate-200' },
}

const CATEGORIES = [
  'Attendance', 'Academics', 'IEP/504', 'Enrollment', 'Credit Recovery',
  'Transfer', 'Graduation', 'Post-secondary', 'Self-advocacy', 'Other',
]

function GoalCard({
  goal, onUpdate,
}: {
  goal: Record<string, any>
  onUpdate: (id: string, updates: Record<string, any>) => void
}) {
  const [expanded,  setExpanded]  = useState(false)
  const [editing,   setEditing]   = useState(false)
  const [progress,  setProgress]  = useState(goal.progress_pct)
  const [status,    setStatus]    = useState(goal.status)
  const [saving,    setSaving]    = useState(false)

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started

  const handleSaveProgress = async () => {
    setSaving(true)
    try {
      await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressPct: progress, status }),
      })
      onUpdate(goal.id, { progress_pct: progress, status })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('card p-5 transition-all', goal.status === 'completed' && 'opacity-70')}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {status === 'completed'
            ? <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            : <Circle size={18} className={cn('mt-0.5 flex-shrink-0', cfg.dot.replace('bg-', 'text-'))} />
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">{goal.title}</p>
            {goal.category && (
              <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide
                               text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                {goal.category}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('badge text-xs', cfg.color)}>{cfg.label}</span>
          {goal.ai_generated && (
            <span className="badge bg-purple-50 text-purple-600 text-[10px]">
              <Zap size={9} /> AI
            </span>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="text-slate-300 hover:text-slate-500 transition-colors">
            <ChevronDown size={15} className={cn('transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500',
              status === 'completed' ? 'bg-emerald-500' :
              status === 'no_progress' ? 'bg-red-400' : 'bg-teal-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-600 w-8 text-right">{progress}%</span>
      </div>

      {/* Target date */}
      {goal.target_date && (
        <p className="text-xs text-slate-400 mb-2">
          Target: {formatDate(goal.target_date)}
          {goal.completed_date && ` · Completed ${formatDate(goal.completed_date)}`}
        </p>
      )}

      {/* Expanded: description + edit */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {goal.description && (
            <p className="text-xs text-slate-600 leading-relaxed mb-4">{goal.description}</p>
          )}

          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-teal-600
                         hover:text-teal-800 transition-colors px-2.5 py-1.5 rounded-md hover:bg-teal-50">
              <Edit2 size={11} /> Update Progress
            </button>
          ) : (
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <label className="form-label">Progress</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={100} step={5}
                    value={progress}
                    onChange={e => setProgress(Number(e.target.value))}
                    className="flex-1 accent-teal-600"
                  />
                  <span className="text-sm font-bold text-slate-700 w-10 text-right">{progress}%</span>
                </div>
              </div>
              <div>
                <label className="form-label">Status</label>
                <select className="form-input text-sm" value={status} onChange={e => setStatus(e.target.value)}>
                  {Object.entries(STATUS_CONFIG).map(([v, cfg]) => (
                    <option key={v} value={v}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveProgress} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700
                             disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                  {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                  Save
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-slate-500 text-xs rounded-lg hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {goal.outcome_notes && (
            <div className="mt-3 p-2.5 bg-emerald-50 rounded-lg">
              <p className="text-xs text-emerald-700">{goal.outcome_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function GoalsPanel({ caseId, goals, onGoalsChange }: GoalsPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [newTitle,    setNewTitle]    = useState('')
  const [newDesc,     setNewDesc]     = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newTarget,   setNewTarget]   = useState('')
  const [saving,      setSaving]      = useState(false)

  const handleGoalUpdate = (id: string, updates: Record<string, any>) => {
    onGoalsChange(goals.map(g => g.id === id ? { ...g, ...updates } : g))
  }

  const handleGenerateAiGoals = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/generate-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      })
      const data = await res.json()
      if (data.goals) {
        onGoalsChange([...goals, ...data.goals])
      }
    } finally {
      setAiLoading(false)
    }
  }

  const handleAddGoal = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, title: newTitle, description: newDesc, category: newCategory, targetDate: newTarget }),
      })
      const newGoal = await res.json()
      onGoalsChange([...goals, newGoal])
      setNewTitle(''); setNewDesc(''); setNewCategory(''); setNewTarget('')
      setShowAddForm(false)
    } finally {
      setSaving(false)
    }
  }

  const activeGoals    = goals.filter(g => g.status !== 'completed' && g.status !== 'discontinued')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const overallPct     = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress_pct, 0) / goals.length)
    : 0

  return (
    <div className="p-6 max-w-3xl">

      {/* Goals summary bar */}
      {goals.length > 0 && (
        <div className="card p-4 mb-6 flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold font-display text-navy-900">{completedGoals.length}</p>
            <p className="text-xs text-slate-400">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-display text-teal-700">{activeGoals.length}</p>
            <p className="text-xs text-slate-400">Active</p>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Overall Progress</span>
              <span className="text-sm font-bold text-slate-700">{overallPct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${overallPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700
                     text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <Plus size={15} /> Add Goal
        </button>
        <button onClick={handleGenerateAiGoals} disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2 border border-purple-200 bg-purple-50
                     hover:bg-purple-100 disabled:opacity-50 text-purple-700 text-sm font-semibold
                     rounded-lg transition-colors">
          {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          {aiLoading ? 'Generating...' : 'Generate from Enrollment Form'}
        </button>
      </div>

      {/* Add goal form */}
      {showAddForm && (
        <div className="card p-5 mb-5 border-teal-200 border bg-teal-50/30">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">New Goal</h4>
          <div className="space-y-3">
            <div>
              <label className="form-label">Goal Title <span className="text-red-400">*</span></label>
              <input className="form-input" placeholder="e.g. Improve attendance to 90%+"
                value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Category</label>
                <select className="form-input" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  <option value="">Select...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Target Date</label>
                <input type="date" className="form-input" value={newTarget}
                  onChange={e => setNewTarget(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea className="form-input resize-none" rows={2}
                placeholder="What does reaching this goal look like?"
                value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddGoal} disabled={saving || !newTitle.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700
                           disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Target size={13} />}
                Add Goal
              </button>
              <button onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-slate-500 text-sm rounded-lg hover:bg-slate-100 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-3 mb-6">
          {activeGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal} onUpdate={handleGoalUpdate} />
          ))}
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Completed ({completedGoals.length})
          </h4>
          <div className="space-y-2">
            {completedGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onUpdate={handleGoalUpdate} />
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && !showAddForm && (
        <div className="text-center py-16 card">
          <Target size={36} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 text-sm font-medium">No goals set yet</p>
          <p className="text-slate-400 text-xs mt-1 mb-4">Add goals manually or generate them from the enrollment form</p>
        </div>
      )}
    </div>
  )
}
