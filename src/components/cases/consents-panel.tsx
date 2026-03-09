'use client'
import { useState, useEffect } from 'react'
import {
  CheckCircle2, Clock, XCircle, AlertCircle, FileText,
  Send, Stamp, Pen, X, Loader2, RefreshCw,
  ShieldCheck, Mail
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface Consent {
  id: string
  form_type: string
  status: string
  signed_at?: string
  signed_by_name?: string
  notarized_by?: string
}

interface SignatureRequest {
  id: string
  doc_type: string
  title: string
  status: string
  participant_name: string
  participant_email: string
  guardian_name?: string
  guardian_email?: string
  requires_guardian: boolean
  participant_signed_at?: string
  guardian_signed_at?: string
  completed_at?: string
  created_at: string
  sent_by_name?: string
}

interface ConsentsPanelProps {
  caseId:            string
  participantName:   string
  participantEmail?: string | null
  isUnder18?:        boolean
  consents:          Consent[]
  userRole?:         string
}

const FORM_META: Record<string, { label: string; description: string; requiresNotarization: boolean; hasEsign: boolean; docType?: string }> = {
  tbw_participation: {
    label: 'TBW Consent to Participate', description: 'General consent to participate in The Book Works programs and services.',
    requiresNotarization: false, hasEsign: true, docType: 'tbw_consent',
  },
  jcps_roi: {
    label: 'JCPS Release of Information (ROI)', description: 'Authorizes The Book Works to receive and share educational records with JCPS.',
    requiresNotarization: true, hasEsign: false,
  },
  cascade_jcps: {
    label: 'Cascade JCPS Records Sign-up', description: 'Consent to access JCPS records via the Cascade system.',
    requiresNotarization: false, hasEsign: false,
  },
  medical_waiver: {
    label: 'Medical Waiver', description: 'Emergency medical authorization and health information form.',
    requiresNotarization: false, hasEsign: false,
  },
  emergency_contact: {
    label: 'Emergency Contact Information', description: 'Emergency contact details if different from parent/guardian.',
    requiresNotarization: false, hasEsign: false,
  },
  policies_and_procedures: {
    label: 'Policies & Procedures', description: 'Building rules, backpack policy, cell phone policy, and safety agreement.',
    requiresNotarization: false, hasEsign: false,
  },
  caregiver_consent_learner_contact: {
    label: 'Caregiver Consent for Learner Contact', description: 'Caregiver permission for advocate to communicate directly with the learner.',
    requiresNotarization: false, hasEsign: false,
  },
}

const SIG_STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  out_for_signature: { label: 'Sent – Awaiting Signature', cls: 'bg-blue-50 text-blue-700',       icon: Mail        },
  partially_signed:  { label: 'Partially Signed',          cls: 'bg-amber-50 text-amber-700',     icon: Pen         },
  signed:            { label: 'Fully Signed',               cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2},
  declined:          { label: 'Declined',                   cls: 'bg-red-50 text-red-600',         icon: XCircle     },
  expired:           { label: 'Expired',                    cls: 'bg-slate-100 text-slate-500',    icon: Clock       },
  cancelled:         { label: 'Cancelled',                  cls: 'bg-slate-100 text-slate-500',    icon: XCircle     },
  pending:           { label: 'Pending',                    cls: 'bg-amber-50 text-amber-700',     icon: Clock       },
}

function SendModal({
  caseId, docType, title, defaultName, defaultEmail, isUnder18, onClose, onSent,
}: {
  caseId: string; docType: string; title: string; defaultName: string
  defaultEmail: string; isUnder18: boolean
  onClose: () => void; onSent: (r: SignatureRequest) => void
}) {
  const [email,   setEmail]   = useState(defaultEmail)
  const [gName,   setGName]   = useState('')
  const [gEmail,  setGEmail]  = useState('')
  const [minor,   setMinor]   = useState(isUnder18)
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')

  const send = async () => {
    if (!email)               { setErr('Participant email is required'); return }
    if (minor && (!gName || !gEmail)) { setErr('Guardian name and email are required'); return }
    setBusy(true); setErr('')
    try {
      const res = await fetch(`/api/cases/${caseId}/signature-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType, participantName: defaultName, participantEmail: email,
          requiresGuardian: minor,
          guardianName:  minor ? gName  : undefined,
          guardianEmail: minor ? gEmail : undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to send')
      onSent(await res.json())
    } catch (e: any) { setErr(e.message); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-0.5">Send for E-Signature</p>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Participant — {defaultName}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="participant@email.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={minor} onChange={e => setMinor(e.target.checked)} className="w-4 h-4 rounded accent-teal-600" />
            <span className="text-sm text-slate-700">Participant is under 18 — requires guardian signature</span>
          </label>
          {minor && (
            <div className="space-y-3 pt-1 pl-7 border-l-2 border-teal-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Guardian Name</label>
                <input type="text" value={gName} onChange={e => setGName(e.target.value)} placeholder="Full name"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Guardian Email</label>
                <input type="email" value={gEmail} onChange={e => setGEmail(e.target.value)} placeholder="guardian@email.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          )}
          {err && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-700">{err}</p>
            </div>
          )}
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">
              An email will be sent with a secure signing link. Signers can complete this on any device — including mobile — without creating an account.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={send} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60 transition-colors">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {busy ? 'Sending...' : 'Send Signing Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SigRequestCard({ req, onRefresh }: { req: SignatureRequest; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false)
  const cfg  = SIG_STATUS[req.status] ?? SIG_STATUS.pending
  const Icon = cfg.icon
  return (
    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full', cfg.cls)}>
          <Icon size={11} />{cfg.label}
        </span>
        <button onClick={async () => { setBusy(true); await onRefresh(); setBusy(false) }}
          className="p-1 text-slate-400 hover:text-slate-600" title="Refresh status">
          <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="space-y-1 text-xs text-slate-500">
        <div>
          <span className="font-medium text-slate-600">Participant: </span>{req.participant_email}
          {req.participant_signed_at && <span className="ml-1.5 text-emerald-600 font-medium">✓ Signed {formatDate(req.participant_signed_at)}</span>}
        </div>
        {req.requires_guardian && (
          <div>
            <span className="font-medium text-slate-600">Guardian: </span>{req.guardian_email}
            {req.guardian_signed_at && <span className="ml-1.5 text-emerald-600 font-medium">✓ Signed {formatDate(req.guardian_signed_at)}</span>}
          </div>
        )}
      </div>
      {req.completed_at && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
          <ShieldCheck size={13} />
          Fully signed {formatDate(req.completed_at)} · Signed PDF saved to Documents
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        Sent {formatDate(req.created_at)}{req.sent_by_name ? ` by ${req.sent_by_name}` : ''}
      </p>
    </div>
  )
}

export function ConsentsPanel({ caseId, participantName, participantEmail, isUnder18 = false, consents, userRole = 'advocate' }: ConsentsPanelProps) {
  const [sigReqs,  setSigReqs]  = useState<SignatureRequest[]>([])
  const [modal,    setModal]    = useState<{ docType: string; title: string } | null>(null)
  const [loading,  setLoading]  = useState(true)
  const canSend = ['admin', 'education_coordinator', 'intake_specialist'].includes(userRole)

  const loadSigReqs = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/signature-request`)
      if (res.ok) setSigReqs(await res.json())
    } catch { /* non-fatal */ } finally { setLoading(false) }
  }

  useEffect(() => { loadSigReqs() }, [caseId])

  const latestByType: Record<string, SignatureRequest> = {}
  for (const r of sigReqs) {
    if (!latestByType[r.doc_type] || r.created_at > latestByType[r.doc_type].created_at) latestByType[r.doc_type] = r
  }

  const signed  = consents.filter(c => c.status === 'signed').length
  const total   = consents.length
  const allDone = signed === total

  return (
    <div className="p-6 max-w-2xl">
      <div className={cn('card p-4 mb-6 flex items-center gap-4', allDone ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50')}>
        {allDone ? <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0" /> : <AlertCircle size={24} className="text-amber-500 flex-shrink-0" />}
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">{allDone ? 'All consents collected' : `${signed} of ${total} consents signed`}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {allDone ? `${participantName}'s file is complete.` : `${total - signed} form${total - signed !== 1 ? 's' : ''} still pending for ${participantName}.`}
          </p>
        </div>
        <p className="text-2xl font-bold font-display text-slate-800">{Math.round((signed / total) * 100)}%</p>
      </div>

      <div className="space-y-3">
        {consents.map((consent) => {
          const meta    = FORM_META[consent.form_type] ?? { label: consent.form_type, description: '', requiresNotarization: false, hasEsign: false }
          const docType = meta.docType ?? consent.form_type
          const sigReq  = latestByType[docType]

          return (
            <div key={consent.id} className={cn('card p-4 transition-all', consent.status === 'signed' && 'opacity-80')}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', consent.status === 'signed' ? 'bg-emerald-50' : 'bg-slate-100')}>
                    <FileText size={16} className={consent.status === 'signed' ? 'text-emerald-500' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                      {meta.requiresNotarization && (
                        <span className="badge bg-blue-50 text-blue-600 text-[10px]"><Stamp size={9} /> Requires Notarization</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{meta.description}</p>
                    {consent.status === 'signed' && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        {consent.signed_by_name && <span>Signed by <strong className="text-slate-600">{consent.signed_by_name}</strong></span>}
                        {consent.signed_at && <><span>·</span><span>{formatDate(consent.signed_at)}</span></>}
                        {consent.notarized_by && <><span>·</span><span className="text-blue-600">Notarized by {consent.notarized_by}</span></>}
                      </div>
                    )}
                    {consent.status !== 'signed' && meta.requiresNotarization && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 bg-blue-50 rounded-md">
                        <AlertCircle size={11} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-blue-700">This form requires notarization by Elizabeth before it can be used for records requests.</p>
                      </div>
                    )}
                    {sigReq && !loading && <SigRequestCard req={sigReq} onRefresh={loadSigReqs} />}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {consent.status === 'signed' ? (
                    <span className="badge bg-emerald-50 text-emerald-700"><CheckCircle2 size={11} /> Signed</span>
                  ) : sigReq?.status === 'out_for_signature' ? (
                    <span className="badge bg-blue-50 text-blue-700"><Mail size={11} /> Sent</span>
                  ) : (
                    <span className="badge bg-amber-50 text-amber-700"><Clock size={11} /> Pending</span>
                  )}
                  {canSend && meta.hasEsign && consent.status !== 'signed' && (
                    <button onClick={() => setModal({ docType, title: meta.label })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors">
                      <Pen size={11} />{sigReq ? 'Resend' : 'Send to Sign'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-700">Note:</strong> The JCPS ROI must be notarized by Elizabeth before attaching to records requests.
          Signed PDFs are automatically saved to the <strong>Documents</strong> tab.
        </p>
      </div>

      {modal && (
        <SendModal
          caseId={caseId} docType={modal.docType} title={modal.title}
          defaultName={participantName} defaultEmail={participantEmail ?? ''}
          isUnder18={isUnder18}
          onClose={() => setModal(null)}
          onSent={(r) => { setSigReqs(p => [r, ...p]); setModal(null) }}
        />
      )}
    </div>
  )
}
