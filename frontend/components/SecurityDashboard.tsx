'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, Clock, Activity, Lock, Eye } from 'lucide-react'

interface Vulnerability {
  cve_id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  affected_device_id: string
  discovered_date: string
  remediation_status: 'open' | 'in-progress' | 'resolved'
}

interface SecurityEvent {
  id: string
  device_id: string
  event_type: 'brute_force' | 'port_scan' | 'config_change' | 'anomaly'
  severity: 'critical' | 'high' | 'medium' | 'low'
  timestamp: string
  description: string
  source_ip: string | null
}

interface ComplianceReport {
  overall_compliance_rate: number
  device_status: {
    compliant: number
    non_compliant: number
    pending: number
  }
  average_security_score: number
  by_site: Record<string, {
    compliance_rate: number
    avg_security_score: number
  }>
}

interface SecurityDashboardProps {
  onClose?: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff4757',
  high: '#ff9f43',
  medium: '#f1c40f',
  low: '#00ff9d'
}

const COMPLIANCE_COLORS: Record<string, string> = {
  compliant: '#00ff9d',
  'non-compliant': '#ff4757',
  pending: '#ff9f43'
}

export default function SecurityDashboard({ onClose }: SecurityDashboardProps = {}) {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(false)
        
        const [vulnResponse, compResponse, eventsResponse] = await Promise.all([
          fetch(`${API_URL}/api/security/vulnerabilities`),
          fetch(`${API_URL}/api/security/compliance`),
          fetch(`${API_URL}/api/security/events`)
        ])

        const vulnData = await vulnResponse.json()
        const compData = await compResponse.json()
        const eventsData = await eventsResponse.json()

        setVulnerabilities(vulnData.vulnerabilities || [])
        setComplianceReport(compData)
        setSecurityEvents(eventsData.events || [])
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredVulnerabilities = vulnerabilities.filter(v => 
    severityFilter === 'all' || v.severity === severityFilter
  )

  const filteredEvents = securityEvents.filter(e => 
    severityFilter === 'all' || e.severity === severityFilter
  )

  if (loading) {
    return (
      <div className="hud-panel rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-cyan-400 tracking-wider">SECURITY</h3>
          {onClose && <button onClick={onClose} className="text-[10px] text-gray-400 hover:text-white">CLOSE</button>}
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-4 w-24 bg-cyan-500/10 rounded" />
              <div className="h-3 w-16 bg-cyan-500/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="hud-panel rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-cyan-400 tracking-wider">SECURITY</h3>
          {onClose && <button onClick={onClose} className="text-[10px] text-gray-400 hover:text-white">CLOSE</button>}
        </div>
        <p className="text-sm text-red-400">Failed to load security data</p>
      </div>
    )
  }

  return (
    <div className="hud-panel rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-cyan-400 tracking-wider">SECURITY</h3>
        {onClose && <button onClick={onClose} className="text-[10px] text-gray-400 hover:text-white">CLOSE</button>}
      </div>

      <div className="space-y-3">
        {/* Overall Security Score */}
        {complianceReport && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-cyan-300 tracking-wider">SECURITY OVERVIEW</h2>
              <Shield className="text-cyan-400" size={14} />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-cyan-500/20 p-2 text-center">
                <div className="text-[10px] text-gray-400 mb-1" style={{ fontFamily: 'var(--font-data)' }}>
                  COMPLIANCE RATE
                </div>
                <div className="text-sm font-bold" style={{ color: COMPLIANCE_COLORS[complianceReport.overall_compliance_rate >= 80 ? 'compliant' : complianceReport.overall_compliance_rate >= 60 ? 'pending' : 'non-compliant'] }}>
                  {complianceReport.overall_compliance_rate}%
                </div>
              </div>
              <div className="rounded border border-cyan-500/20 p-2 text-center">
                <div className="text-[10px] text-gray-400 mb-1" style={{ fontFamily: 'var(--font-data)' }}>
                  AVG SECURITY SCORE
                </div>
                <div className="text-sm font-bold text-cyan-300">
                  {complianceReport.average_security_score}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px]" style={{ fontFamily: 'var(--font-data)' }}>
              <div className="flex items-center gap-1">
                <CheckCircle size={8} className="text-green-400" />
                <span className="text-gray-300">{complianceReport.device_status.compliant}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={8} className="text-orange-400" />
                <span className="text-gray-300">{complianceReport.device_status.pending}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle size={8} className="text-red-400" />
                <span className="text-gray-300">{complianceReport.device_status.non_compliant}</span>
              </div>
            </div>
          </div>
        )}

        {/* Vulnerabilities */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-cyan-300 tracking-wider">VULNERABILITIES</h2>
            <div className="flex items-center gap-1 text-[10px]" style={{ fontFamily: 'var(--font-data)' }}>
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSeverityFilter(severity)}
                  className={`px-1 py-1 rounded border transition-colors ${
                    severityFilter === severity
                      ? 'border-cyan-400/60 text-cyan-300 bg-cyan-500/10'
                      : 'border-cyan-500/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {severity.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400" style={{ fontFamily: 'var(--font-data)' }}>
              {filteredVulnerabilities.length} vulnerabilities found
            </span>
            <button
              onClick={() => {
                fetch(`${API_URL}/api/security/scan`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ scan_type: 'quick' })
                }).then(() => {
                  // Refresh vulnerabilities after scan
                  fetch(`${API_URL}/api/security/vulnerabilities`)
                    .then(res => res.json())
                    .then(data => setVulnerabilities(data.vulnerabilities || []))
                })
              }}
              className="text-[10px] text-cyan-300 hover:text-white"
              style={{ fontFamily: 'var(--font-data)' }}
            >
              RUN GLOBAL SCAN
            </button>
          </div>

          <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1 performance-scroll">
            {filteredVulnerabilities.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4" style={{ fontFamily: 'var(--font-data)' }}>
                No vulnerabilities found
              </div>
            ) : (
              filteredVulnerabilities.map((vuln) => (
                <div key={vuln.cve_id} className="rounded border border-cyan-500/10 px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-cyan-300" style={{ fontFamily: 'var(--font-data)' }}>
                      {vuln.cve_id}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[10px] font-semibold px-1 py-0.5 rounded"
                        style={{
                          fontFamily: 'var(--font-data)',
                          backgroundColor: `${SEVERITY_COLORS[vuln.severity]}20`,
                          color: SEVERITY_COLORS[vuln.severity]
                        }}
                      >
                        {vuln.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-300 mb-1" style={{ fontFamily: 'var(--font-data)' }}>
                    {vuln.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
                    <span>{vuln.affected_device_id}</span>
                    <span>{new Date(vuln.discovered_date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security Events */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-cyan-300 tracking-wider">SECURITY EVENTS</h2>
            <Activity className="text-cyan-400" size={12} />
          </div>

          <div className="max-h-[100px] overflow-y-auto space-y-2 pr-1 performance-scroll">
            {filteredEvents.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4" style={{ fontFamily: 'var(--font-data)' }}>
                No security events
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div key={event.id} className="rounded border border-cyan-500/10 px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {event.event_type === 'brute_force' && <Lock size={8} className="text-red-400" />}
                      {event.event_type === 'port_scan' && <Eye size={8} className="text-orange-400" />}
                      {event.event_type === 'config_change' && <Activity size={8} className="text-yellow-400" />}
                      {event.event_type === 'anomaly' && <AlertTriangle size={8} className="text-purple-400" />}
                      <span className="text-[10px] text-gray-300" style={{ fontFamily: 'var(--font-data)' }}>
                        {event.event_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-1 py-0.5 rounded"
                      style={{
                        fontFamily: 'var(--font-data)',
                        backgroundColor: `${SEVERITY_COLORS[event.severity]}20`,
                        color: SEVERITY_COLORS[event.severity]
                      }}
                    >
                      {event.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-1" style={{ fontFamily: 'var(--font-data)' }}>
                    {event.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
                    <span>{event.device_id}</span>
                    <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}