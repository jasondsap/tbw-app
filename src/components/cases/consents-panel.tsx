'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, Clock, XCircle, AlertCircle, FileText,
  Send, Stamp, Mail, MessageSquare, X, Loader2, Edit, Download, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { listFormTypes } from '@/lib/consents/forms'

interface Consent {
  id: string
  form_type: string
  status: string
  signed_at?: string
  signed_by_name?: string
  notarized_by?: string
}

interface ConsentInvitation {
  id:                  string
  form_type:           string
  channel:             'sms' | 'email'
  sent_to:             string
  status:              string
  expires_at:          string
  sent_at:             string
  completed_at:        string | null
  send_status:         string | null
  send_error:          string | null
  sent_by_name:        string | null
}

interface ConsentsPanelProps {
  caseId:            string
  participantName:   string
  participantEmail?: string | null
  participantPhone?: string | null
  consents:          Consent[]
  userRole?:         string
}

const FORM_META: Record<string, { label: string; description: string; requiresNotarization: boolean }> = {
  tbw_participation: {
    label: 'TBW Consent to Participate',
    description: 'General consent to participate in The Book Works programs and services.',
    requiresNotarization: false,
  },
  jcps_roi: {
    label: 'JCPS Release of Information (ROI)',
    description: 'Authorizes The Book Works to receive and share educational records with JCPS.',
    requiresNotarization: true,
  },
  cascade_jcps: {
    label: 'Cascade JCPS Records Sign-up',
    description: 'Consent to access JCPS records via the Cascade system.',
    requiresNotarization: false,
  },
  medical_waiver: {
    label: 'Medical Waiver',
    description: 'Emergency medical authorization and health information form.',
    requiresNotarization: false,
  },
  emergency_contact: {
    label: 'Emergency Contact Information',
    description: 'Emergency contact details if different from parent/guardian.',
    requiresNotarization: false,
  },
  policies_and_procedures: {
    label: 'Policies & Procedures',
    description: 'Building rules, backpack policy, cell phone policy, and safety agreement.',
    requiresNotarization: false,
  },
  caregiver_consent_learner_contact: {
    label: 'Caregiver Consent for Learner Contact',
    description: 'Caregiver permission for advocate to communicate directly with the learner.',
    requiresNotarization: false,
  },
}

const ESIGN_AVAILABLE = new Set(listFormTypes())

export function ConsentsPanel({
  caseId, participantName, participantEmail, participantPhone, consents, userRole = 'advocate',
}: ConsentsPanelProps) {
  const [invites, setInvites] = useState<ConsentInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ formType: string; label: string } | null>(null)
  const canSend = ['admin', 'education_coordinator', 'intake_specialist'].includes(userRole)

  const loadInvites = async () => {
    try {
      const res = await fetch(`/api/consents/invite?caseId=${caseId}`)
      if (res.ok) setInvites(await res.json())
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadInvites() }, [caseId])

  // Latest invitation per (form_type, channel) so resends collapse cleanly
  const latestInvite: Record<string, ConsentInvitation> = {}
  for (const inv of invites) {
    const key = `${inv.form_type}::${inv.channel}`
    if (!latestInvite[key] || inv.sent_at > latestInvite[key].sent_at) {
      latestInvite[key] = inv
    }
  }

  const signed  = consents.filter(c => c.status === 'signed').length
  const total   = consents.length
  const allDone = total > 0 && signed === total
  const pct = total > 0 ? Math.round((signed / total) * 100) : 0

  return (
    <div className="p-6 max-w-2xl">
      <div className={cn(
        'card p-4 mb-6 flex items-center gap-4',
        allDone ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50',
      )}>
        {allDone
          ? <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0" />
          : <AlertCircle size={24} className="text-amber-500 flex-shrink-0" />}
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">
            {allDone ? 'All consents collected' : `${signed} of ${total} consents signed`}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {allDone
              ? `${participantName}'s file is complete.`
              : `${total - signed} form${total - signed !== 1 ? 's' : ''} still pending for ${participantName}.`}
          </p>
        </div>
        <p className="text-2xl font-bold font-display text-slate-800">{pct}%</p>
      </div>

      <div className="space-y-3">
        {consents.map((consent) => {
          const meta = FORM_META[consent.form_type] ?? {
            label: consent.form_type,
            description: '',
            requiresNotarization: false,
          }
          const eSignAvailable = ESIGN_AVAILABLE.has(consent.form_type)
          const smsInv   = latestInvite[`${consent.form_type}::sms`]
          const emailInv = latestInvite[`${consent.form_type}::email`]
          const activeInvites = [smsInv, emailInv].filter(
            (i): i is ConsentInvitation =>
              !!i && (i.status === 'sent' || i.status === 'opened') && new Date(i.expires_at) > new Date()
          )

          return (
            <div key={consent.id} className={cn('card p-4 transition-all', consent.status === 'signed' && 'opacity-90')}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    consent.status === 'signed' ? 'bg-emerald-50' : 'bg-slate-100',
                  )}>
                    <FileText size={16} className={consent.status === 'signed' ? 'text-emerald-500' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                      {meta.requiresNotarization && (
                        <span className="badge bg-blue-50 text-blue-600 text-[10px]">
                          <Stamp size={9} /> Requires Notarization
                        </span>
                      )}
                      {!eSignAvailable && (
                        <span className="badge bg-slate-100 text-slate-500 text-[10px]">Paper for now</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{meta.description}</p>
                    {consent.status === 'signed' && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        {consent.signed_by_name && (
                          <span>Signed by <strong className="text-slate-600">{consent.signed_by_name}</strong></span>
                        )}
                        {consent.signed_at && <><span>·</span><span>{formatDate(consent.signed_at)}</span></>}
                        {consent.notarized_by && (
                          <><span>·</span><span className="text-blue-600">Notarized by {consent.notarized_by}</span></>
                        )}
                      </div>
                    )}
                    {consent.status !== 'signed' && meta.requiresNotarization && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 bg-blue-50 rounded-md">
                        <AlertCircle size={11} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-blue-700">
                          Family can complete digitally; the signed PDF then needs Elizabeth's notarization in person before it's attached to records requests.
                        </p>
                      </div>
                    )}

                    {!loading && activeInvites.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {activeInvites.map(inv => (
                          <span key={inv.id} className="badge bg-blue-50 text-blue-700 text-[10px]">
                            {inv.channel === 'sms' ? <MessageSquare size={9} /> : <Mail size={9} />}
                            Sent {formatDate(inv.sent_at)} · expires {formatDate(inv.expires_at)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={cn(
                    'badge text-[10px]',
                    consent.status === 'signed' ? 'bg-emerald-50 text-emerald-700' :
                    activeInvites.length > 0   ? 'bg-blue-50 text-blue-700' :
                                                  'bg-amber-50 text-amber-700',
                  )}>
                    {consent.status === 'signed'
                      ? <><CheckCircle2 size={11} /> Signed</>
                      : activeInvites.length > 0
                        ? <><Mail size={11} /> Sent</>
                        : <><Clock size={11} /> Pending</>}
                  </span>

                  {canSend && eSignAvailable && consent.status !== 'signed' && (
                    <div className="flex flex-col gap-1.5 items-end">
                      <button
                        onClick={() => setModal({ formType: consent.form_type, label: meta.label })}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                      >
                        <Send size={11} />
                        {activeInvites.length > 0 ? 'Resend' : 'Send invitation'}
                      </button>
                      <Link
                        href={`/cases/${caseId}/consent/${consent.form_type}`}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Edit size={11} /> Administer in person
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-700">Note:</strong> The JCPS ROI requires notarization by Elizabeth before being attached to records requests.
          Signed PDFs are automatically saved to the case file.
        </p>
      </div>

      {modal && (
        <SendInviteModal
          caseId={caseId}
          formType={modal.formType}
          formLabel={modal.label}
          participantName={participantName}
          participantEmail={participantEmail ?? null}
          participantPhone={participantPhone ?? null}
          onClose={() => setModal(null)}
          onSent={() => { setModal(null); loadInvites() }}
        />
      )}
    </div>
  )
}

// ── Send-invitation modal ────────────────────────────────────────────────────

function SendInviteModal({
  caseId, formType, formLabel,
  participantName, participantEmail, participantPhone,
  onClose, onSent,
}: {
  caseId: string
  formType: string
  formLabel: string
  participantName: string
  participantEmail: string | null
  participantPhone: string | null
  onClose: () => void
  onSent: () => void
}) {
  const hasPhone = !!participantPhone
  const hasEmail = !!participantEmail
  const [channels, setChannels] = useState<('sms' | 'email')[]>(() => {
    const init: ('sms' | 'email')[] = []
    if (hasPhone) init.push('sms')
    if (hasEmail) init.push('email')
    return init
  })
  const [customMessage, setCustomMessage] = useState('')
  const [phoneOverride, setPhoneOverride] = useState(participantPhone ?? '')
  const [emailOverride, setEmailOverride] = useState(participantEmail ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ sentVia?: string[]; failedVia?: any[]; expiresAt?: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const toggle = (ch: 'sms' | 'email') =>
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])

  const submit = async () => {
    setSubmitting(true); setErr(null); setResult(null)
    try {
      const res = await fetch('/api/consents/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          formType,
          sendVia: channels,
          customMessage: customMessage.trim() || undefined,
          phoneOverride: channels.includes('sms') ? phoneOverride : undefined,
          emailOverride: channels.includes('email') ? emailOverride : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || `Server returned ${res.status}`)
        if (data.failedVia) setResult({ failedVia: data.failedVia })
        return
      }
      setResult(data)
      if (data.sentVia?.length > 0) onSent()
    } catch {
      setErr('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = channels.length > 0 && !submitting && (
    (channels.includes('sms')   && phoneOverride.trim().length > 0) ||
    (channels.includes('email') && emailOverride.trim().length > 0)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-0.5">Send invitation</p>
            <h3 className="text-base font-bold text-slate-900">{formLabel}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {result?.sentVia ? (
            <div className="space-y-3">
              {result.sentVia.length > 0 && (
                <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                  <p className="font-medium mb-1">Invitation sent</p>
                  <p className="text-xs">
                    Delivered via {result.sentVia.map(c => c === 'sms' ? 'text' : 'email').join(' and ')}.
                    {result.expiresAt && <> Link expires {formatDate(result.expiresAt)}.</>}
                  </p>
                </div>
              )}
              {result.failedVia && result.failedVia.length > 0 && (
                <div className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="font-medium mb-1">Some channels failed</p>
                  <ul className="text-xs list-disc list-inside space-y-0.5">
                    {result.failedVia.map((f, i) => (
                      <li key={i}>{f.channel === 'sms' ? 'Text' : 'Email'}: {f.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={onClose} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Channels</p>
                <div className="space-y-2">
                  <ChannelRow
                    icon={MessageSquare}
                    label="Text message (SMS)"
                    contact={phoneOverride}
                    onContactChange={setPhoneOverride}
                    checked={channels.includes('sms')}
                    onToggle={() => toggle('sms')}
                    placeholder="(502) 555-0000"
                  />
                  <ChannelRow
                    icon={Mail}
                    label="Email"
                    contact={emailOverride}
                    onContactChange={setEmailOverride}
                    checked={channels.includes('email')}
                    onToggle={() => toggle('email')}
                    placeholder="participant@email.com"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                  Custom message <span className="lowercase font-normal text-slate-400">(optional)</span>
                </p>
                <textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Prepended above the standard invitation copy."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {err && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{err}</p>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">
                  An invitation will be sent with a secure signing link. Signers can complete this on any device — including mobile — without creating an account.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium"
                >
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                    : <><Send size={14} /> Send invitation</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ChannelRow({
  icon: Icon, label, contact, onContactChange, checked, onToggle, placeholder,
}: {
  icon: typeof MessageSquare
  label: string
  contact: string
  onContactChange: (v: string) => void
  checked: boolean
  onToggle: () => void
  placeholder: string
}) {
  return (
    <div className={cn(
      'p-3 border rounded-xl transition-colors',
      checked ? 'border-teal-300 bg-teal-50/40' : 'border-slate-200',
    )}>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 accent-teal-600"
        />
        <Icon size={16} className="text-slate-500" />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </label>
      {checked && (
        <input
          type="text"
          value={contact}
          onChange={e => onContactChange(e.target.value)}
          placeholder={placeholder}
          className="w-full mt-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      )}
    </div>
  )
}
