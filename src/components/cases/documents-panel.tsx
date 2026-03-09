'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileText, FileImage, File, Trash2,
  Download, Loader2, CheckCircle, AlertCircle, X
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CaseDocument {
  id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  doc_type: string
  created_at: string
  uploaded_by_name: string | null
}

interface UploadingFile {
  id: string
  name: string
  size: number
  docType: string
  progress: 'uploading' | 'recording' | 'done' | 'error'
  error?: string
}

const DOC_TYPES: { value: string; label: string }[] = [
  { value: 'tbw_consent',        label: 'TBW Consent Form' },
  { value: 'jcps_roi',           label: 'JCPS ROI' },
  { value: 'cascade_consent',    label: 'Cascade Consent' },
  { value: 'medical_waiver',     label: 'Medical Waiver' },
  { value: 'emergency_contact',  label: 'Emergency Contact' },
  { value: 'enrollment_form',    label: 'Enrollment Form' },
  { value: 'exit_form',          label: 'Exit Form' },
  { value: 'progress_map',       label: 'Progress Map' },
  { value: 'completion_toolkit', label: 'Completion Toolkit' },
  { value: 'records_request',    label: 'Records Request' },
  { value: 'case_note',          label: 'Case Note' },
  { value: 'other',              label: 'Other' },
]

const DOC_TYPE_COLORS: Record<string, string> = {
  tbw_consent:        'bg-teal-100 text-teal-700',
  jcps_roi:           'bg-blue-100 text-blue-700',
  cascade_consent:    'bg-purple-100 text-purple-700',
  medical_waiver:     'bg-red-100 text-red-700',
  emergency_contact:  'bg-orange-100 text-orange-700',
  enrollment_form:    'bg-indigo-100 text-indigo-700',
  exit_form:          'bg-slate-100 text-slate-700',
  progress_map:       'bg-green-100 text-green-700',
  completion_toolkit: 'bg-amber-100 text-amber-700',
  records_request:    'bg-cyan-100 text-cyan-700',
  case_note:          'bg-pink-100 text-pink-700',
  other:              'bg-slate-100 text-slate-600',
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File size={16} className="text-slate-400" />
  if (mimeType === 'application/pdf') return <FileText size={16} className="text-red-500" />
  if (mimeType.startsWith('image/')) return <FileImage size={16} className="text-blue-500" />
  return <FileText size={16} className="text-slate-500" />
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function DocumentsPanel({
  caseId,
  initialDocuments = [],
  userRole,
}: {
  caseId: string
  initialDocuments: CaseDocument[]
  userRole: string
}) {
  const [documents, setDocuments]     = useState<CaseDocument[]>(initialDocuments)
  const [uploading, setUploading]     = useState<UploadingFile[]>([])
  const [dragOver, setDragOver]       = useState(false)
  const [selectedType, setSelectedType] = useState('other')
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canDelete = ['admin', 'education_coordinator', 'intake_specialist'].includes(userRole)

  // ── Upload flow ─────────────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File, docType: string) => {
    const uploadId = crypto.randomUUID()

    setUploading(prev => [...prev, {
      id: uploadId, name: file.name, size: file.size,
      docType, progress: 'uploading',
    }])

    try {
      // Step 1 — get presigned URL
      const presignRes = await fetch(`/api/cases/${caseId}/documents/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
      })

      if (!presignRes.ok) {
        const err = await presignRes.json()
        throw new Error(err.error ?? 'Failed to get upload URL')
      }

      const { uploadUrl, s3Key } = await presignRes.json()

      // Step 2 — upload directly to S3
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!s3Res.ok) throw new Error('S3 upload failed')

      setUploading(prev => prev.map(u =>
        u.id === uploadId ? { ...u, progress: 'recording' } : u
      ))

      // Step 3 — record in DB
      const recordRes = await fetch(`/api/cases/${caseId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          s3Key,
          docType,
        }),
      })

      if (!recordRes.ok) throw new Error('Failed to record upload')

      setUploading(prev => prev.map(u =>
        u.id === uploadId ? { ...u, progress: 'done' } : u
      ))

      // Refresh document list
      const listRes = await fetch(`/api/cases/${caseId}/documents`)
      if (listRes.ok) setDocuments(await listRes.json())

      // Remove from uploading after 2s
      setTimeout(() => {
        setUploading(prev => prev.filter(u => u.id !== uploadId))
      }, 2000)

    } catch (err: any) {
      setUploading(prev => prev.map(u =>
        u.id === uploadId ? { ...u, progress: 'error', error: err.message } : u
      ))
    }
  }, [caseId])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => uploadFile(file, selectedType))
  }, [uploadFile, selectedType])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  // ── Download ────────────────────────────────────────────────────────────────

  const handleDownload = async (doc: CaseDocument) => {
    const res = await fetch(`/api/cases/${caseId}/documents/${doc.id}`)
    if (!res.ok) return
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return
    setDeletingId(docId)
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/${docId}`, { method: 'DELETE' })
      if (res.ok) setDocuments(prev => prev.filter(d => d.id !== docId))
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Upload area */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Document type:</label>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {DOC_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragOver
              ? 'border-teal-400 bg-teal-50'
              : 'border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-teal-50/50'
            }
          `}
        >
          <Upload size={24} className={`mx-auto mb-2 ${dragOver ? 'text-teal-500' : 'text-slate-400'}`} />
          <p className="text-sm font-medium text-slate-600">
            {dragOver ? 'Drop to upload' : 'Drag & drop files here'}
          </p>
          <p className="text-xs text-slate-400 mt-1">or click to browse — PDF, images, Word docs</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Upload progress */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              {u.progress === 'done'
                ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                : u.progress === 'error'
                ? <AlertCircle size={16} className="text-red-500 shrink-0" />
                : <Loader2 size={16} className="text-teal-500 animate-spin shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{u.name}</p>
                <p className="text-xs text-slate-400">
                  {u.progress === 'uploading' && 'Uploading to S3...'}
                  {u.progress === 'recording' && 'Saving record...'}
                  {u.progress === 'done' && 'Upload complete'}
                  {u.progress === 'error' && (u.error ?? 'Upload failed')}
                </p>
              </div>
              {u.progress === 'error' && (
                <button onClick={() => setUploading(p => p.filter(x => x.id !== u.id))}>
                  <X size={14} className="text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 && uploading.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <FileIcon mimeType={doc.mime_type} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOC_TYPE_COLORS[doc.doc_type] ?? DOC_TYPE_COLORS.other}`}>
                    {DOC_TYPES.find(t => t.value === doc.doc_type)?.label ?? doc.doc_type}
                  </span>
                  {doc.file_size && (
                    <span className="text-xs text-slate-400">{formatBytes(doc.file_size)}</span>
                  )}
                  <span className="text-xs text-slate-400">{formatDate(doc.created_at)}</span>
                  {doc.uploaded_by_name && (
                    <span className="text-xs text-slate-400">· {doc.uploaded_by_name}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors"
                  title="Download"
                >
                  <Download size={15} />
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === doc.id
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Trash2 size={15} />
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
