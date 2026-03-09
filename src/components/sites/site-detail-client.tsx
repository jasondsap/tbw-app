'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin, ArrowLeft, Plus, Clock, CheckCircle2,
  UserCheck, Users, ChevronDown, ChevronUp, Circle,
  UserX, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

interface Props {
  data: {
    site: any
    sessions: any[]
    todayAttendees: any[]
  }
}

export function SiteDetailClient({ data }: Props) {
  const { site, sessions, todayAttendees } = data
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [openingSession, setOpeningSession] = useState(false)
  const [signInName, setSignInName] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  const todaysSession = sessions.find(s => {
    const d = new Date(s.session_date)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })

  const isOpen = !!todaysSession && !todaysSession.closed_at

  async function openSession() {
    setOpeningSession(true)
    try {
      const res = await fetch(`/api/sites/${site.id}/session`, { method: 'POST' })
      if (res.ok) window.location.reload()
    } finally {
      setOpeningSession(false)
    }
  }

  async function closeSession() {
    if (!todaysSession) return
    const res = await fetch(`/api/sites/${site.id}/session/${todaysSession.id}/close`, { method: 'POST' })
    if (res.ok) window.location.reload()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-5xl mx-auto">
          <Link href="/sites" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 mb-3 transition-colors">
            <ArrowLeft size={12} /> All Sites
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <MapPin size={18} className="text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-display">{site.name}</h1>
                <p className="text-sm text-slate-500">{site.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
                isOpen ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              )}>
                <Circle size={6} className={isOpen ? 'fill-green-500 text-green-500' : 'fill-slate-400 text-slate-400'} />
                {isOpen ? 'Session Open' : 'No Active Session'}
              </span>
              {isOpen ? (
                <button
                  onClick={closeSession}
                  className="px-4 py-2 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Close Session
                </button>
              ) : (
                <button
                  onClick={openSession}
                  disabled={openingSession}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus size={12} /> Open Today's Session
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-7 grid grid-cols-3 gap-6">

        {/* Left: Today's attendance */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={14} className="text-amber-500" />
                Today's Attendance
                <span className="ml-1 text-xs font-normal text-slate-400">
                  ({new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })})
                </span>
              </h2>
              <span className="text-lg font-bold text-slate-900">{todayAttendees.length}</span>
            </div>

            {!isOpen && todayAttendees.length === 0 ? (
              <div className="py-12 text-center">
                <Clock size={28} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">No session open today</p>
                <p className="text-xs text-slate-400 mt-1">Open a session to start tracking attendance</p>
              </div>
            ) : todayAttendees.length === 0 ? (
              <div className="py-12 text-center">
                <Users size={28} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">No one signed in yet</p>
                <p className="text-xs text-slate-400 mt-1">Use the sign-in form below to log arrivals</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {todayAttendees.map((a: any) => (
                  <div key={a.attendance_id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700 flex-shrink-0">
                      {a.first_name?.[0]}{a.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{a.first_name} {a.last_name}</p>
                      <p className="text-xs text-slate-400">{a.current_school ?? 'No school'} · Gr. {a.current_grade ?? '?'}</p>
                    </div>
                    <div className="text-right flex-shrink-0 text-xs">
                      <div className="flex items-center gap-1 text-teal-600 font-medium justify-end">
                        <UserCheck size={11} /> {fmt(a.signed_in_at)}
                      </div>
                      {a.signed_out_at ? (
                        <div className="flex items-center gap-1 text-slate-400 justify-end mt-0.5">
                          <UserX size={11} /> {fmt(a.signed_out_at)}
                        </div>
                      ) : (
                        <span className="text-green-500 text-[10px]">Still here</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick sign-in */}
            {isOpen && (
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-2">Quick Sign-In (by case # or name)</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search participant..."
                    value={signInName}
                    onChange={e => setSignInName(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
                  />
                  <button
                    disabled={signingIn || !signInName.trim()}
                    className="px-4 py-2 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Plus size={12} /> Sign In
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Full participant search coming soon — manual sign-in from the case record is also available.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Session history */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock size={13} className="text-slate-400" /> Recent Sessions
              </h2>
            </div>
            {sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No sessions yet</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                {sessions.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{fmtDate(s.session_date)}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Users size={10} className="text-slate-400" />
                          <span className="text-[11px] text-slate-500">{s.attendee_count} attendees</span>
                          {!s.closed_at && (
                            <span className="text-[10px] text-green-600 font-semibold">● Open</span>
                          )}
                        </div>
                      </div>
                      {expandedSession === s.id
                        ? <ChevronUp size={13} className="text-slate-400" />
                        : <ChevronDown size={13} className="text-slate-400" />}
                    </div>
                    {expandedSession === s.id && (
                      <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                        <p>Opened: {fmt(s.opened_at)} by {s.opened_by_name ?? 'unknown'}</p>
                        <p>Closed: {s.closed_at ? fmt(s.closed_at) : 'Still open'}</p>
                        {s.notes && <p className="italic">{s.notes}</p>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">30-Day Summary</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Total sessions</span>
                <span className="text-xs font-bold text-slate-800">{sessions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Total visits</span>
                <span className="text-xs font-bold text-slate-800">
                  {sessions.reduce((s, sess) => s + (sess.attendee_count ?? 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Avg per session</span>
                <span className="text-xs font-bold text-slate-800">
                  {sessions.length
                    ? Math.round(sessions.reduce((s, sess) => s + (sess.attendee_count ?? 0), 0) / sessions.length)
                    : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
