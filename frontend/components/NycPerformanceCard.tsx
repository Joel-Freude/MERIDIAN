'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'

interface Device {
  id: string
  hostname: string
  ip: string
  vendor: string
  model: string
  site: string
  lat: number
  lng: number
  status: 'online' | 'warning' | 'offline'
  security_score: number
  last_vulnerability_scan: string | null
  compliance_status: 'compliant' | 'non-compliant' | 'pending'
  firmware_version: string
  last_config_change: string | null
  active_sessions: number
  failed_logins: number
  security_zone: 'trusted' | 'dmz' | 'untrusted'
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function ProgressRing({ percent, size = 64, strokeWidth = 6, active }: { percent: number; size?: number; strokeWidth?: number; active?: boolean }) {
  const radius = size / 2 - strokeWidth
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const clamped = Math.max(0, Math.min(100, percent))
  const dashLength = (clamped / 100) * circumference
  const gapLength = circumference - dashLength

  let color = '#00ff9d'
  if (clamped < 40) color = '#ff4757'
  else if (clamped < 70) color = '#ff9f43'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={active ? 'pulse-ring' : ''}
      style={active ? { animation: 'ring-pulse 1.4s ease-in-out infinite', transformOrigin: 'center' } : undefined}
    >
      <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dashLength} ${gapLength}`}
        transform={`rotate(-90 ${center} ${center})`}
        strokeLinecap="round"
      />
      <text x={center} y={center} textAnchor="middle" dy="0.35em" fill="#e8e6de" fontSize="13" fontWeight="700" fontFamily="var(--font-data)">
        {clamped}%
      </text>
    </svg>
  )
}

interface SiteSummary {
  site: string
  lat: number
  lng: number
  devices: Device[]
}

export default function NycPerformanceCard({ onLocationSelect, onOpenAddModal }: { onLocationSelect?: (coords: { lat: number; lng: number; site: string } | null) => void; onOpenAddModal?: () => void }) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedSite, setSelectedSite] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${API_URL}/api/devices`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setDevices(data.devices ?? [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sites = useMemo(() => {
    const map = new Map<string, SiteSummary>()
    for (const d of devices) {
      const key = d.site
      const existing = map.get(key)
      if (existing) {
        existing.devices.push(d)
      } else {
        map.set(key, { site: d.site, lat: d.lat, lng: d.lng, devices: [d] })
      }
    }
    return Array.from(map.values())
  }, [devices])

  const toggleSite = (site: string, lat: number, lng: number) => {
    const isDeselecting = selectedSite === site
    setSelectedSite(isDeselecting ? null : site)
    if (isDeselecting) {
      onLocationSelect?.(null)
    } else {
      onLocationSelect?.({ lat, lng, site })
    }
  }

  if (loading) {
    return (
      <div className="hud-panel border border-cyan-500/30 rounded-lg p-5 w-[380px]">
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-16 h-16 rounded-full border border-cyan-500/20 bg-cyan-500/10" />
              <div className="flex flex-col gap-3 flex-1">
                <div className="h-4 w-28 bg-cyan-500/10 rounded" />
                <div className="h-3 w-20 bg-cyan-500/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="hud-panel border border-cyan-500/30 rounded-lg p-5 w-[380px]">
        <p className="text-sm text-red-400">Failed to load performance data</p>
      </div>
    )
  }

  return (
    <div className="hud-panel border border-cyan-500/30 rounded-lg p-5 w-[380px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-cyan-300" style={{ fontFamily: 'var(--font-data)' }}>
            DATACENTERS
          </div>
          <div className="text-[10px] text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
            Global Network Status
          </div>
        </div>
        <button
          onClick={() => onOpenAddModal?.()}
          className="flex items-center justify-center w-8 h-8 rounded-full border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all"
          title="Add Datacenter"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="performance-scroll flex flex-col gap-4 max-h-[320px] overflow-y-auto pr-1">
        {sites.map((site) => {
          const counts = site.devices.reduce(
            (acc, d) => {
              acc[d.status] = (acc[d.status] || 0) + 1
              return acc
            },
            {} as Record<string, number>,
          )

          const onlineCount = counts.online || 0
          const total = site.devices.length
          const onlinePercent = total > 0 ? Math.round((onlineCount / total) * 100) : 0
          const isSelected = selectedSite === site.site

          return (
            <div key={site.site} className={`border-b border-cyan-500/10 pb-4 last:border-0 last:pb-0 ${isSelected ? 'border-l-2 border-l-cyan-400 pl-3' : ''}`}>
              <button
                onClick={() => toggleSite(site.site, site.lat, site.lng)}
                className={`flex items-center gap-4 w-full text-left rounded-lg p-2 -mx-2 transition-colors ${isSelected ? 'bg-cyan-500/10' : 'hover:bg-cyan-500/5'}`}
              >
                <ProgressRing percent={onlinePercent} size={64} strokeWidth={6} active={isSelected} />
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="text-sm font-semibold text-cyan-300 truncate" style={{ fontFamily: 'var(--font-data)' }}>
                    {site.site}
                  </div>
                  <div className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
                    {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
                  </div>
                  <div className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-data)' }}>
                    {total} device{total !== 1 ? 's' : ''}
                  </div>
                  <div className="flex gap-3 text-xs" style={{ fontFamily: 'var(--font-data)' }}>
                    <span className="text-gray-500">Online: {onlineCount}</span>
                    <span className="text-gray-500">Warning: {counts.warning || 0}</span>
                    <span className="text-gray-500">Offline: {counts.offline || 0}</span>
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
