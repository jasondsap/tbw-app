'use client'
import { useState } from 'react'
import { X, User, AlertTriangle, CheckCircle2, Loader2, BarChart2 } from 'lucide-react'
import { cn, scoreColor, gradeDisplay } from '@/lib/utils'

interface AssignmentModalProps {
  caseData:   Record<string, any>
  advocates:  any[]
  onClose:    () => void
  onAssigned: (caseId: string, advocateId: string) => void
}

const SCORE_RING: Record<number, string> = {
  4: 'ring-2 ring-red-200',
  3: 'ring-2 ring-orange-200',
  2: 'ring-2 ring-amber-200',
  1: 'ring-1 ring-slate-200',
}

function CapacityBar({ active, max = 10 }: { active: number; max?: number }) {
  const pct  = Math.min((active / max) * 100, 100)
  const over = active >= max
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', over ? 'bg-red-400' : active >= 8 ? 'bg-amber-400' : 'bg-teal-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('text-xs font-medium tabular-nums', over ? 'text-red-500' : 'text-slate-500')}>
        {active}/{max}
      </span>
    </div>
  )
}

export function AssignmentModal({ caseData, advocates, onClose, onAssigned }: AssignmentModalProps) {
  const [selectedAdvocate, setSelectedAdvocate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notifyAdvocate, setNotifyAdvocate] = useState(true)

  const chosenAdvocate = advocates.find(a => a.id === selectedAdvocate)

  const handleAssign = async () => {
    if (!selectedAdvocate) return
    setSaving(true)
    try {
      await fetch(`/api/cases/${caseData.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advocateId: selectedAdvocate,
          notifyAdvocate,
        }),
      })
      onAssigned(caseData.id, selectedAdvocate)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 font-display">Assign Case</h2>
            <p className="text-xs text-slate-400 mt-0.5">{caseData.case_number} · {caseData.first_name} {caseData.last_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Case summary */}
          <div className={cn('flex items-center gap-4 p-4 rounded-xl bg-slate-50 border', SCORE_RING[caseData.involvement_score] ?? '')}>
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0',
              caseData.involvement_score === 4 ? 'bg-red-500' :
              caseData.involvement_score === 3 ? 'bg-orange-500' :
              caseData.involvement_score === 2 ? 'bg-amber-500' : 'bg-slate-400'
            )}>
              {caseData.involvement_score}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {caseData.first_name} {caseData.last_name}
                {caseData.dateOfBirth && (
                  <span className="font-normal text-slate-500 ml-2 text-xs">
                    {Math.floor((Date.now() - new Date(caseData.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}y
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {caseData.current_school} · {gradeDisplay(caseData.current_grade)} · {caseData.neighborhood}
              </p>
              {caseData.factors?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {caseData.factors.map((f: string) => (
                    <span key={f} className="text-[10px] px-2 py-0.5 bg-white border border-red-100 text-red-600 rounded-full">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Advocate selection */}
          <div>
            <label className="form-label mb-3">Select Advocate</label>
            <div className="space-y-2">
              {advocates.map((adv) => {
                const atCapacity = Number(adv.active_cases ?? 0) >= 10
                const busy       = Number(adv.active_cases ?? 0) >= 8
                const selected   = selectedAdvocate === adv.id

                return (
                  <button
                    key={adv.id}
                    onClick={() => !atCapacity && setSelectedAdvocate(adv.id)}
                    disabled={atCapacity}
                    className={cn(
                      'w-full p-3.5 rounded-xl border-2 text-left transition-all',
                      selected
                        ? 'border-teal-500 bg-teal-50'
                        : atCapacity
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-teal-200 bg-white cursor-pointer'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                        selected ? 'bg-teal-600' : 'bg-navy-700'
                      )}>
                        {(adv.first_name ?? "?")[0]}{(adv.last_name ?? "?")[0]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-800">
                            {adv.first_name} {adv.last_name}
                          </span>
                          <div className="flex items-center gap-2">
                            {adv.overdueNotes > 0 && (
                              <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">
                                {adv.overdueNotes} overdue
                              </span>
                            )}
                            {atCapacity && (
                              <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-medium">
                                At capacity
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <CapacityBar active={Number(adv.active_cases ?? 0)} />
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            avg score {adv.avgScore.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {selected && <CheckCircle2 size={18} className="text-teal-600 flex-shrink-0" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notify toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyAdvocate}
              onChange={e => setNotifyAdvocate(e.target.checked)}
              className="w-4 h-4 accent-teal-600"
            />
            <span className="text-sm text-slate-700">
              Notify {chosenAdvocate ? `${chosenAdvocate.first_name}` : 'advocate'} by email when assigned
            </span>
          </label>

          {/* Reminder */}
          {selectedAdvocate && (
            <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg text-xs text-teal-800">
              <strong>{chosenAdvocate?.first_name}</strong> will receive a notification and should make
              initial contact within <strong>2–3 business days</strong>.
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleAssign}
            disabled={!selectedAdvocate || saving}
            className="w-full py-2.5 flex items-center justify-center gap-2
                       bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Assigning...</>
              : <>Assign to {chosenAdvocate ? `${chosenAdvocate.first_name}` : 'Advocate'}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
