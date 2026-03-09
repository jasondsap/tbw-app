'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin, Users, TrendingUp, ChevronRight, Plus,
  Building2, Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SITE_COLORS: Record<string, { bg: string; ring: string; icon: string }> = {
  'Americana': { bg: 'bg-teal-50', ring: 'ring-teal-200', icon: 'text-teal-600' },
  '502 Blueprint': { bg: 'bg-indigo-50', ring: 'ring-indigo-200', icon: 'text-indigo-600' },
  'Neighborhood House': { bg: 'bg-amber-50', ring: 'ring-amber-200', icon: 'text-amber-600' },
}

function getSiteStyle(shortName: string) {
  return SITE_COLORS[shortName] ?? { bg: 'bg-slate-50', ring: 'ring-slate-200', icon: 'text-slate-600' }
}

interface Props {
  initialSites: any[]
}

export function SitesDashboard({ initialSites }: Props) {
  const totalToday = initialSites.reduce((s, site) => s + (site.todays_count ?? 0), 0)
  const totalMonthly = initialSites.reduce((s, site) => s + (site.monthly_visits ?? 0), 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <MapPin size={17} className="text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-display">Engagement Sites</h1>
                <p className="text-sm text-slate-500">Attendance tracking for Education Hubs</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalToday}</p>
                <p className="text-xs text-slate-500">today across all sites</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalMonthly}</p>
                <p className="text-xs text-slate-500">visits (30 days)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-5">
        {initialSites.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Building2 size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No sites found. Run the sites migration in Neon first.</p>
          </div>
        ) : (
          initialSites.map((site: any) => {
            const style = getSiteStyle(site.short_name)
            const isOpen = !!site.todays_session_id
            return (
              <Link
                key={site.id}
                href={`/sites/${site.id}`}
                className="block bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
              >
                <div className="flex items-stretch">
                  {/* Color strip */}
                  <div className={cn('w-2 flex-shrink-0', style.bg.replace('bg-', 'bg-').replace('-50', '-400')
                    .replace('teal-400', 'teal-500').replace('indigo-400', 'indigo-500').replace('amber-400', 'amber-400'))} />

                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', style.bg)}>
                          <MapPin size={20} className={style.icon} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 mb-0.5">
                            <h2 className="text-lg font-bold text-slate-900 font-display">{site.name}</h2>
                            {/* Open/closed indicator */}
                            <span className={cn(
                              'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                              isOpen
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            )}>
                              <Circle size={5} className={isOpen ? 'fill-green-500 text-green-500' : 'fill-slate-400 text-slate-400'} />
                              {isOpen ? 'Session Open' : 'No Session Today'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">{site.address}</p>
                          {site.site_lead && (
                            <p className="text-xs text-slate-400 mt-0.5">Site Lead: {site.site_lead}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-8 text-right flex-shrink-0">
                        <div>
                          <p className="text-3xl font-bold text-slate-900">{site.todays_count ?? 0}</p>
                          <p className="text-xs text-slate-400">today</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-slate-600">{site.monthly_visits ?? 0}</p>
                          <p className="text-xs text-slate-400">30-day visits</p>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-600 transition-colors mt-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}

        {/* Info note */}
        <div className="mt-4 px-4 py-3 bg-slate-100 rounded-xl text-xs text-slate-500">
          <strong>Note:</strong> Run <code className="font-mono bg-white px-1 py-0.5 rounded">sites-migration.sql</code> in your Neon console to create the sites tables and seed Americana, 502 Blueprint, and Neighborhood House.
        </div>
      </div>
    </div>
  )
}
