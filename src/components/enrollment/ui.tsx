'use client'
import { cn } from '@/lib/utils'

export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-slate-800 font-display">{title}</h2>
      {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export function FieldGroup({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="form-label">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-400 -mt-1">{hint}</p>}
      {children}
    </div>
  )
}

export function CheckGrid({
  options, selected, onToggle, cols = 2,
}: {
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  cols?: 2 | 3 | 4
}) {
  return (
    <div className={cn(
      'grid gap-2',
      cols === 2 && 'grid-cols-1 sm:grid-cols-2',
      cols === 3 && 'grid-cols-2 sm:grid-cols-3',
      cols === 4 && 'grid-cols-2 sm:grid-cols-4',
    )}>
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2.5 cursor-pointer group select-none">
          <div className={cn(
            'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
            selected.includes(opt)
              ? 'bg-teal-600 border-teal-600'
              : 'border-slate-300 group-hover:border-teal-400'
          )}>
            {selected.includes(opt) && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <input type="checkbox" className="sr-only" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
          <span className="text-sm text-slate-700 group-hover:text-slate-900 leading-snug">{opt}</span>
        </label>
      ))}
    </div>
  )
}

export function YesNoField({
  value, onChange, labels = ['Yes', 'No'],
}: {
  value: boolean | null
  onChange: (v: boolean) => void
  labels?: [string, string]
}) {
  return (
    <div className="flex gap-2">
      {[true, false].map((v, i) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium border-2 transition-all',
            value === v
              ? 'bg-teal-600 border-teal-600 text-white'
              : 'border-slate-200 text-slate-600 hover:border-teal-300 bg-white'
          )}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  )
}

export function DetailInput({
  label, value, onChange, placeholder, rows = 1, hint,
}: {
  label?: string; value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number; hint?: string
}) {
  if (rows > 1) return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-slate-500">{label}</label>}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input text-sm resize-none"
      />
    </div>
  )
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-slate-500">{label}</label>}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input text-sm"
      />
    </div>
  )
}
