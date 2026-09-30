'use client'

import { useState, useEffect } from 'react'

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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001'

const STATUS_COLOR: Record<Device['status'], string> = {
  online: '#00ff9d',
  warning: '#ff9f43',
  offline: '#ff4757',
}

export default function DeviceList({ site }: { site: string | null }) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!site) return
    let cancelled = false
    fetch(`${API_URL}/api/devices`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          const all = data.devices ?? []
          setDevices(all.filter((d: Device) => d.site === site))
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
  }, [site])

  if (!site) return null
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-4 w-24 bg-cyan-500/10 rounded" />
            <div className="h-3 w-16 bg-cyan-500/10 rounded" />
          </div>
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <p className="text-sm text-red-400">Failed to load devices</p>
    )
  }

  const visibleDevices = devices

  return (
    <div className="flex flex-col gap-2 overflow-y-auto performance-scroll" style={{ maxHeight: '200px' }}>
      {visibleDevices.map((device) => (
        <div
          key={device.id}
          className="flex items-center justify-between border-b border-cyan-500/10 pb-2 last:border-0 last:pb-0"
        >
          <div className="flex flex-col gap-1 min-w-0">
            <div className="text-xs text-gray-300 truncate" style={{ fontFamily: 'var(--font-data)' }}>
              {device.hostname}
            </div>
            <div className="text-[10px] text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
              {device.ip}
            </div>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded"
            style={{
              fontFamily: 'var(--font-data)',
              backgroundColor: `${STATUS_COLOR[device.status]}20`,
              color: STATUS_COLOR[device.status],
            }}
          >
            {device.status.toUpperCase()}
          </span>
        </div>
      ))}
      {devices.length === 0 && (
        <div className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
          No devices found for this site.
        </div>
      )}
    </div>
  )
}
