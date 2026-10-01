'use client'

import { useState, useEffect } from 'react'
import GlobeMap from '@/components/Globe'
import NycPerformanceCard from '@/components/NycPerformanceCard'
import AddDatacenterModal from '@/components/AddDatacenterModal'
import SplashScreen from '@/components/SplashScreen'
import SecurityDashboard from '@/components/SecurityDashboard'
import VulnerabilityScanner from '@/components/VulnerabilityScanner'
import { Globe, Activity, Network, Settings, BarChart3, Shield, Radio, Layers, LayoutDashboard, Lock } from 'lucide-react'

type WidgetKey = 'dashboard' | 'network' | 'activity' | 'settings' | 'layers' | 'analytics' | 'threats' | 'live' | 'security'

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

const WIDGET_LABELS: Record<WidgetKey, string> = {
  dashboard: 'Dashboard',
  network: 'Network',
  activity: 'Activity',
  settings: 'Settings',
  layers: 'Layers',
  analytics: 'Analytics',
  threats: 'Threats',
  live: 'Live feeds',
  security: 'Security',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001'

const STATUS_COLOR: Record<Device['status'], string> = {
  online: '#00ff9d',
  warning: '#ff9f43',
  offline: '#ff4757',
}

const SECURITY_SCORE_COLOR = (score: number): string => {
  if (score >= 90) return '#00ff9d'
  if (score >= 70) return '#ff9f43'
  return '#ff4757'
}

const COMPLIANCE_COLOR: Record<Device['compliance_status'], string> = {
  compliant: '#00ff9d',
  'non-compliant': '#ff4757',
  pending: '#ff9f43',
}

type TopologyType = 'star' | 'bus' | 'ring' | 'mesh' | 'tree' | 'hybrid'

const DATACENTER_TOPOLOGIES: Record<string, TopologyType> = {
  'New York DC': 'star',
  'London DC': 'bus',
  'Tokyo DC': 'ring',
  'Sydney DC': 'mesh',
  'Paris DC': 'tree',
  'Berlin DC': 'hybrid',
}

const TOPOLOGY_LABELS: Record<TopologyType, string> = {
  star: 'STAR',
  bus: 'BUS',
  ring: 'RING',
  mesh: 'MESH',
  tree: 'TREE',
  hybrid: 'HYBRID',
}

const LEFT_WIDGET_KEYS: WidgetKey[] = ['dashboard', 'network', 'activity', 'settings']
const RIGHT_WIDGET_KEYS: WidgetKey[] = ['layers', 'analytics', 'threats', 'live', 'security']

export default function DashboardPage() {
  const [activeWidgets, setActiveWidgets] = useState<WidgetKey[]>(['dashboard'])
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [devicesError, setDevicesError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'warning' | 'offline'>('all')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [displayedDevice, setDisplayedDevice] = useState<Device | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [pendingDevice, setPendingDevice] = useState<Device | null>(null)
  const [selectedSiteForTopology, setSelectedSiteForTopology] = useState<string | null>(null)
  const [showDeviceList, setShowDeviceList] = useState(true)
  const deviceListVisibleItems = 4
  const [showNetworkModal, setShowNetworkModal] = useState(false)
  const [modalSelectedDevice, setModalSelectedDevice] = useState<Device | null>(null)
  const [analyticsMetrics, setAnalyticsMetrics] = useState({ cpu: 50, mem: 60, temp: 40, lat: 12, inBw: 50, outBw: 35 })
  const [waveformHistory, setWaveformHistory] = useState<number[]>(Array.from({ length: 60 }, () => 50))
  const [activities, setActivities] = useState<{ id: string; message: string; severity: 'high' | 'medium' | 'low'; timestamp: string }[]>([])
  const [activityFilter, setActivityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [acknowledgedActivities, setAcknowledgedActivities] = useState<Set<string>>(new Set())
  const [deviceHealth, setDeviceHealth] = useState({ cpu: 50, ram: 50, upload: 50, download: 50, overall: 50 })
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [threatsLoading, setThreatsLoading] = useState(false)
  const [threatsError, setThreatsError] = useState(false)
  const [threatSeverityFilter, setThreatSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [acknowledgedThreats, setAcknowledgedThreats] = useState<Set<string>>(new Set())

  useEffect(() => {
    const saved = localStorage.getItem('activeWidgets')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WidgetKey[]
        if (Array.isArray(parsed)) setActiveWidgets(parsed)
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('activeWidgets', JSON.stringify(activeWidgets))
  }, [activeWidgets])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveWidgets((prev) => prev.filter((k) => !RIGHT_WIDGET_KEYS.includes(k)))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    setDevicesLoading(true)
    setDevicesError(false)
    fetch(`${API_URL}/api/devices`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setDevices(data.devices ?? [])
          setDevicesLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDevicesError(true)
          setDevicesLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!activeWidgets.includes('network')) return
    let cancelled = false
    setDevicesLoading(true)
    setDevicesError(false)
    fetch(`${API_URL}/api/devices`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setDevices(data.devices ?? [])
          setDevicesLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDevicesError(true)
          setDevicesLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeWidgets])

  useEffect(() => {
    if (!activeWidgets.includes('threats')) return
    let cancelled = false
    setThreatsLoading(true)
    setThreatsError(false)
    fetch(`${API_URL}/api/security/events`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setSecurityEvents(data.events ?? [])
          setThreatsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setThreatsError(true)
          setThreatsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeWidgets])

  useEffect(() => {
    if (!activeWidgets.includes('analytics')) return
    const interval = setInterval(() => {
      setAnalyticsMetrics((prev) => ({
        cpu: Math.max(10, Math.min(95, prev.cpu + (Math.random() - 0.5) * 20)),
        mem: Math.max(20, Math.min(90, prev.mem + (Math.random() - 0.5) * 10)),
        temp: Math.max(30, Math.min(80, prev.temp + (Math.random() - 0.5) * 8)),
        lat: Math.max(2, Math.min(100, prev.lat + (Math.random() - 0.5) * 15)),
        inBw: Math.max(10, Math.min(200, prev.inBw + (Math.random() - 0.5) * 30)),
        outBw: Math.max(10, Math.min(200, prev.outBw + (Math.random() - 0.5) * 25)),
      }))
      setWaveformHistory((prev) => {
        const last = prev[prev.length - 1] ?? 50
        const next = Math.max(5, Math.min(95, last + (Math.random() - 0.5) * 25))
        const nextHistory = [...prev.slice(1), next]
        return nextHistory
      })
    }, 800)
    return () => clearInterval(interval)
  }, [activeWidgets])

  useEffect(() => {
    if (!activeWidgets.includes('activity')) return
    const events = [
      { message: 'New device registered: nyc-dc-07', severity: 'low' as const },
      { message: 'Interface flapping: Gi0/1', severity: 'medium' as const },
      { message: 'BGP peer down: 192.168.1.1', severity: 'high' as const },
      { message: 'CPU spike: 94% on router-02', severity: 'high' as const },
      { message: 'Backup completed successfully', severity: 'low' as const },
      { message: 'Firmware upgrade: core-sw-nyc01', severity: 'medium' as const },
      { message: 'High latency detected: 120ms', severity: 'medium' as const },
      { message: 'Port security violation: Gi0/3', severity: 'high' as const },
      { message: 'Syslog rotation completed', severity: 'low' as const },
      { message: 'Temperature warning: 72°C', severity: 'medium' as const },
    ]
    const interval = setInterval(() => {
      const event = events[Math.floor(Math.random() * events.length)]
      const now = new Date()
      const timestamp = now.toLocaleTimeString('en-US', { hour12: false })
      setActivities((prev) => [...prev.slice(-200), { id: `${timestamp}-${Math.random()}`, message: event.message, severity: event.severity, timestamp }])
    }, 2500)
    return () => clearInterval(interval)
  }, [activeWidgets])

  useEffect(() => {
    if (!selectedDevice) return
    const interval = setInterval(() => {
      setDeviceHealth((prev) => {
        const cpu = Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 20))
        const ram = Math.max(10, Math.min(90, prev.ram + (Math.random() - 0.5) * 15))
        const upload = Math.max(10, Math.min(95, prev.upload + (Math.random() - 0.5) * 18))
        const download = Math.max(10, Math.min(95, prev.download + (Math.random() - 0.5) * 18))
        const overall = Math.max(10, Math.min(95, (cpu + ram + upload + download) / 4))
        return { cpu, ram, upload, download, overall }
      })
    }, 1200)
    return () => clearInterval(interval)
  }, [selectedDevice?.id])

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      !searchQuery ||
      device.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ip.includes(searchQuery) ||
      device.site.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleSelectDevice = (device: Device) => {
    if (displayedDevice?.id === device.id) return
    if (!displayedDevice) {
      setDisplayedDevice(device)
      setSelectedDevice(device)
      setFlyToLocation({ lat: device.lat, lng: device.lng })
      return
    }
    setPendingDevice(device)
    setIsExiting(true)
  }

  const handleSelectDeviceWithoutFly = (device: Device) => {
    if (displayedDevice?.id === device.id) return
    if (!displayedDevice) {
      setDisplayedDevice(device)
      setSelectedDevice(device)
      return
    }
    setPendingDevice(device)
    setIsExiting(true)
  }

  const handleDeviceAnimationEnd = () => {
    if (isExiting && pendingDevice) {
      setDisplayedDevice(pendingDevice)
      setSelectedDevice(pendingDevice)
      setPendingDevice(null)
      setIsExiting(false)
    }
  }

  const sites = Array.from(new Set(devices.map((d) => d.site)))
  const activeSite = selectedSiteForTopology ?? sites[0] ?? null
  const siteDevices = activeSite ? devices.filter((d) => d.site === activeSite) : []
  const topologyType: TopologyType = activeSite ? DATACENTER_TOPOLOGIES[activeSite] ?? 'star' : 'star'

  const getDeviceType = (device: Device): string => {
    const h = device.hostname.toLowerCase()
    if (h.startsWith('core-sw-') || h.startsWith('sw-') || h.includes('switch')) return 'switch'
    if (h.startsWith('edge-rtr-') || h.startsWith('router-')) return 'router'
    if (h.startsWith('fw-') || h.includes('firewall')) return 'firewall'
    if (h.startsWith('srv-') || h.startsWith('server-')) return 'server'
    if (h.startsWith('ap-') || h.startsWith('acc-')) return 'ap'
    return 'server'
  }

  const renderTopology = (filterId = 'glow', onNodeClick?: (device: Device) => void, forceTopology?: TopologyType) => {
    const width = 380
    const height = 220
    const nodes = siteDevices.map((device, index) => ({ device, index }))
    const effectiveTopology = forceTopology ?? topologyType

    const deviceIcon = (x: number, y: number, device: Device) => {
      const type = getDeviceType(device)
      const fill = SECURITY_SCORE_COLOR(device.security_score)
      if (type === 'switch') {
        return (
          <g key={device.id}>
            <rect x={x - 10} y={y - 6} width="20" height="12" rx="2" fill={fill} filter={`url(#${filterId})`} />
            <circle cx={x - 5} cy={y} r="1" fill="#0a0a0f" />
            <circle cx={x} cy={y} r="1" fill="#0a0a0f" />
            <circle cx={x + 5} cy={y} r="1" fill="#0a0a0f" />
          </g>
        )
      }
      if (type === 'router') {
        return (
          <g key={device.id}>
            <rect x={x - 9} y={y - 5} width="18" height="10" rx="2" fill={fill} filter={`url(#${filterId})`} />
            <path d={`M${x - 6},${y - 1} L${x - 3},${y - 3} M${x - 6},${y + 1} L${x - 3},${y + 3}`} stroke="#0a0a0f" strokeWidth="1" />
            <path d={`M${x + 6},${y - 1} L${x + 3},${y - 3} M${x + 6},${y + 1} L${x + 3},${y + 3}`} stroke="#0a0a0f" strokeWidth="1" />
          </g>
        )
      }
      if (type === 'firewall') {
        return (
          <g key={device.id}>
            <path d={`M${x},${y - 8} L${x + 7},${y - 4} L${x + 7},${y + 4} L${x},${y + 8} L${x - 7},${y + 4} L${x - 7},${y - 4} Z`} fill={fill} filter={`url(#${filterId})`} />
            <rect x={x - 3} y={y - 2} width="6" height="4" rx="1" fill="#0a0a0f" />
          </g>
        )
      }
      if (type === 'ap') {
        return (
          <g key={device.id}>
            <circle cx={x} cy={y} r="7" fill="none" stroke={fill} strokeWidth="1.5" filter={`url(#${filterId})`} />
            <circle cx={x} cy={y} r="3" fill={fill} />
            <path d={`M${x},${y - 10} Q${x},${y - 5} ${x},${y}`} stroke={fill} strokeWidth="1" fill="none" />
            <path d={`M${x - 6},${y - 6} Q${x - 3},${y - 3} ${x},${y}`} stroke={fill} strokeWidth="1" fill="none" />
            <path d={`M${x + 6},${y - 6} Q${x + 3},${y - 3} ${x},${y}`} stroke={fill} strokeWidth="1" fill="none" />
          </g>
        )
      }
      return (
        <g key={device.id}>
          <rect x={x - 8} y={y - 6} width="16" height="12" rx="2" fill={fill} filter={`url(#${filterId})`} />
          <rect x={x - 5} y={y - 3} width="10" height="1" fill="#0a0a0f" />
          <rect x={x - 5} y={y} width="10" height="1" fill="#0a0a0f" />
          <circle cx={x + 4} cy={y + 3.5} r="1" fill="#0a0a0f" />
        </g>
      )
    }

    const commonNode = (x: number, y: number, device: Device) => (
      <g onClick={() => onNodeClick?.(device)} style={{ cursor: 'pointer' }}>
        {deviceIcon(x, y, device)}
        <circle cx={x + 8} cy={y - 8} r="6" fill={SECURITY_SCORE_COLOR(device.security_score)} stroke="#0a0a0f" strokeWidth="1" />
        <text x={x + 8} y={y - 7} textAnchor="middle" fill="#0a0a0f" fontSize="6" fontWeight="bold" style={{ fontFamily: 'var(--font-data)' }}>
          {device.security_score}
        </text>
        <text x={x} y={y + 16} textAnchor="middle" fill="#9ca3af" fontSize="7" style={{ fontFamily: 'var(--font-data)' }}>
          {device.hostname}
        </text>
      </g>
    )

    if (effectiveTopology === 'star') {
      const cx = width / 2
      const cy = height / 2
      const r = Math.min(width, height) / 2 - 28
      return (
        <>
          {nodes.map(({ device }, idx) => {
            const angle = ((idx + 1) / (nodes.length + 1)) * Math.PI * 2 - Math.PI / 2
            const x = cx + r * Math.cos(angle)
            const y = cy + r * Math.sin(angle)
            return (
              <g key={device.id} onClick={() => onNodeClick?.(device)} style={{ cursor: 'pointer' }}>
                <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(0,212,255,0.15)" strokeWidth="1" />
                {commonNode(x, y, device)}
              </g>
            )
          })}
          <circle cx={cx} cy={cy} r="9" fill="#00d4ff" filter={`url(#${filterId})`} />
          <text x={cx} y={cy + 22} textAnchor="middle" fill="#9ca3af" fontSize="9" style={{ fontFamily: 'var(--font-data)' }}>
            CORE SWITCH
          </text>
        </>
      )
    }

    if (effectiveTopology === 'bus') {
      const busY = height / 2
      const startX = 30
      const endX = width - 30
      return (
        <>
          <line x1={startX} y1={busY} x2={endX} y2={busY} stroke="rgba(0,212,255,0.25)" strokeWidth="2" />
          {nodes.map(({ device }, idx) => {
            const x = startX + ((idx + 1) / (nodes.length + 1)) * (endX - startX)
            return (
              <g key={device.id} onClick={() => onNodeClick?.(device)} style={{ cursor: 'pointer' }}>
                <line x1={x} y1={busY} x2={x} y2={busY - 18} stroke="rgba(0,212,255,0.2)" strokeWidth="1" />
                {commonNode(x, busY - 24, device)}
              </g>
            )
          })}
          <text x={width / 2} y={busY + 18} textAnchor="middle" fill="#9ca3af" fontSize="9" style={{ fontFamily: 'var(--font-data)' }}>
            BACKBONE BUS
          </text>
        </>
      )
    }

    if (effectiveTopology === 'ring') {
      const cx = width / 2
      const cy = height / 2
      const r = Math.min(width, height) / 2 - 28
      const points = nodes.map(({ device }, idx) => {
        const angle = (idx / nodes.length) * Math.PI * 2 - Math.PI / 2
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), device }
      })
      return (
        <>
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            stroke="rgba(0,212,255,0.25)"
            strokeWidth="1.5"
            fill="none"
          />
          {points.map((p) => (
            <g key={p.device.id} onClick={() => onNodeClick?.(p.device)} style={{ cursor: 'pointer' }}>
              {commonNode(p.x, p.y, p.device)}
            </g>
          ))}
          <text x={cx} y={cy + 18} textAnchor="middle" fill="#9ca3af" fontSize="9" style={{ fontFamily: 'var(--font-data)' }}>
            RING
          </text>
        </>
      )
    }

    if (effectiveTopology === 'mesh') {
      const cols = Math.ceil(Math.sqrt(nodes.length))
      const rows = Math.ceil(nodes.length / cols)
      const cellW = width / (cols + 1)
      const cellH = height / (rows + 1)
      const points = nodes.map(({ device }, idx) => {
        const col = idx % cols
        const row = Math.floor(idx / cols)
        return { x: cellW * (col + 1), y: cellH * (row + 1), device }
      })
      return (
        <>
          {points.map((a, i) =>
            points.map((b, j) =>
              i < j ? (
                <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,212,255,0.1)" strokeWidth="1" />
              ) : null
            )
          )}
          {points.map((p) => (
            <g key={p.device.id} onClick={() => onNodeClick?.(p.device)} style={{ cursor: 'pointer' }}>
              {commonNode(p.x, p.y, p.device)}
            </g>
          ))}
          <text x={width / 2} y={height - 10} textAnchor="middle" fill="#9ca3af" fontSize="9" style={{ fontFamily: 'var(--font-data)' }}>
            MESH
          </text>
        </>
      )
    }

    if (effectiveTopology === 'tree') {
      const cx = width / 2
      const rootY = 24
      const levelGap = 56
      const levelYs = [rootY, rootY + levelGap, rootY + levelGap * 2]
      const padding = 32
      const usableWidth = width - padding * 2

      const rootCount = 1
      const remaining = nodes.length - rootCount
      const branchCount = Math.min(2, remaining)
      const leafCount = Math.max(0, remaining - branchCount)

      const rootNodes: { x: number; y: number; device: Device }[] = []
      const branchNodes: { x: number; y: number; device: Device }[] = []
      const leafNodes: { x: number; y: number; device: Device }[] = []

      if (nodes.length > 0) {
        rootNodes.push({ x: cx, y: levelYs[0], device: nodes[0].device })
      }
      for (let i = 0; i < branchCount && (1 + i) < nodes.length; i++) {
        const step = branchCount > 1 ? usableWidth / (branchCount - 1) : 0
        const x = branchCount === 1 ? cx : padding + step * i
        branchNodes.push({ x, y: levelYs[1], device: nodes[1 + i].device })
      }
      for (let i = 0; i < leafCount && (1 + branchCount + i) < nodes.length; i++) {
        const step = leafCount > 1 ? usableWidth / (leafCount - 1) : 0
        const x = leafCount === 1 ? cx : padding + step * i
        leafNodes.push({ x, y: levelYs[2], device: nodes[1 + branchCount + i].device })
      }

      const allNodes = [...rootNodes, ...branchNodes, ...leafNodes]
      const links: { x1: number; y1: number; x2: number; y2: number }[] = []

      if (allNodes.length > 1) {
        const root = allNodes[0]
        const leavesPerBranch = Math.max(1, Math.floor(leafCount / branchCount))
        const extraLeaves = leafCount % branchCount
        let leafOffset = 0
        for (let i = 0; i < branchCount && (1 + i) < allNodes.length; i++) {
          const branch = allNodes[1 + i]
          links.push({ x1: root.x, y1: root.y, x2: branch.x, y2: branch.y })
          const count = leavesPerBranch + (i < extraLeaves ? 1 : 0)
          for (let j = 0; j < count && (1 + branchCount + leafOffset + j) < allNodes.length; j++) {
            const leaf = allNodes[1 + branchCount + leafOffset + j]
            links.push({ x1: branch.x, y1: branch.y, x2: leaf.x, y2: leaf.y })
          }
          leafOffset += count
        }
      }

      const parentIcon = (x: number, y: number) => (
        <g>
          <rect x={x - 10} y={y - 8} width="20" height="16" rx="2" fill="#f59e0b" filter={`url(#${filterId})`} />
          <rect x={x - 5} y={y - 4} width="10" height="1" fill="#0a0a0f" />
          <rect x={x - 5} y={y} width="10" height="1" fill="#0a0a0f" />
          <circle cx={x + 3} cy={y + 4} r="1" fill="#0a0a0f" />
        </g>
      )

      const level1Icon = (x: number, y: number) => (
        <g>
          <rect x={x - 9} y={y - 6} width="18" height="12" rx="2" fill="#3b82f6" filter={`url(#${filterId})`} />
          <circle cx={x - 4} cy={y} r="1" fill="#0a0a0f" />
          <circle cx={x + 1} cy={y} r="1" fill="#0a0a0f" />
        </g>
      )

      const level2Icon = (x: number, y: number) => (
        <g>
          <rect x={x - 9} y={y - 6} width="18" height="12" rx="2" fill="#22c55e" filter={`url(#${filterId})`} />
          <circle cx={x - 4} cy={y} r="1" fill="#0a0a0f" />
          <circle cx={x + 1} cy={y} r="1" fill="#0a0a0f" />
        </g>
      )

      return (
        <>
          {links.map((link, idx) => (
            <line key={idx} x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} stroke="rgba(0,212,255,0.35)" strokeWidth="1.5" />
          ))}
          {branchNodes.map((p) => (
            <g key={`branch-${p.device.id}`} onClick={() => onNodeClick?.(p.device)} style={{ cursor: 'pointer' }}>
              {level1Icon(p.x, p.y)}
              <text x={p.x} y={p.y + 16} textAnchor="middle" fill="#9ca3af" fontSize="7" style={{ fontFamily: 'var(--font-data)' }}>
                {p.device.hostname}
              </text>
            </g>
          ))}
          {leafNodes.map((p) => (
            <g key={`leaf-${p.device.id}`} onClick={() => onNodeClick?.(p.device)} style={{ cursor: 'pointer' }}>
              {level2Icon(p.x, p.y)}
              <text x={p.x} y={p.y + 16} textAnchor="middle" fill="#9ca3af" fontSize="7" style={{ fontFamily: 'var(--font-data)' }}>
                {p.device.hostname}
              </text>
            </g>
          ))}
          {rootNodes.map((p) => (
            <g key={`root-${p.device.id}`} onClick={() => onNodeClick?.(p.device)} style={{ cursor: 'pointer' }}>
              {parentIcon(p.x, p.y)}
              <text x={p.x} y={p.y + 16} textAnchor="middle" fill="#9ca3af" fontSize="7" style={{ fontFamily: 'var(--font-data)' }}>
                {p.device.hostname}
              </text>
            </g>
          ))}
          <text x={cx} y={levelYs[0] - 16} textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold" style={{ fontFamily: 'var(--font-data)' }}>
            PARENT NODE
          </text>
          <text x={padding - 8} y={levelYs[1] + 4} textAnchor="start" fill="#3b82f6" fontSize="9" fontWeight="bold" style={{ fontFamily: 'var(--font-data)' }}>
            Level 1
          </text>
          <text x={padding - 8} y={levelYs[2] + 4} textAnchor="start" fill="#22c55e" fontSize="9" fontWeight="bold" style={{ fontFamily: 'var(--font-data)' }}>
            Level 2
          </text>
        </>
      )
    }

    const hybridTopology = effectiveTopology === 'hybrid' ? 'star' : 'star'
    const cx = width / 2
    const cy = height / 2
    const r = Math.min(width, height) / 2 - 28
    const coreLinks = nodes.slice(0, Math.max(1, Math.floor(nodes.length / 2))).map(({ device }, idx) => {
      const angle = (idx / Math.max(1, Math.floor(nodes.length / 2))) * Math.PI * 2 - Math.PI / 2
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), device }
    })
    const ringNodes = nodes.slice(coreLinks.length).map(({ device }, idx) => {
      const angle = (idx / Math.max(1, nodes.length - coreLinks.length)) * Math.PI * 2 - Math.PI / 2
      return { x: cx + (r * 0.55) * Math.cos(angle), y: cy + (r * 0.55) * Math.sin(angle), device }
    })
    return (
      <>
        {coreLinks.map((p) => (
          <g key={p.device.id} onClick={() => onNodeClick?.(p.device)} style={{ cursor: 'pointer' }}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(0,212,255,0.15)" strokeWidth="1" />
            {commonNode(p.x, p.y, p.device)}
          </g>
        ))}
        <polyline
          points={ringNodes.map((p) => `${p.x},${p.y}`).join(' ')}
          stroke="rgba(0,212,255,0.25)"
          strokeWidth="1.5"
          fill="none"
        />
        {ringNodes.map((p) => (
          <g key={p.device.id} onClick={() => onNodeClick?.(p.device)} style={{ cursor: 'pointer' }}>
            {commonNode(p.x, p.y, p.device)}
          </g>
        ))}
        <circle cx={cx} cy={cy} r="9" fill="#00d4ff" filter={`url(#${filterId})`} />
        <text x={cx} y={cy + 22} textAnchor="middle" fill="#9ca3af" fontSize="9" style={{ fontFamily: 'var(--font-data)' }}>
          HYBRID
        </text>
      </>
    )
  }

  const toggleWidget = (key: WidgetKey) => {
    setActiveWidgets((prev) => {
      const isLeft = LEFT_WIDGET_KEYS.includes(key)
      const has = prev.includes(key)

      if (isLeft) {
        return [key, ...prev.filter((k) => RIGHT_WIDGET_KEYS.includes(k))]
      }

      if (has) {
        return prev.filter((k) => k !== key)
      }

      return [...prev.filter((k) => !RIGHT_WIDGET_KEYS.includes(k)), key]
    })
  }

  const isActive = (key: WidgetKey) => activeWidgets.includes(key)

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <div className="flex h-screen w-screen overflow-hidden bg-cyber-black">
      {/* Top-left title + horizontal icon rail */}
      <div className="fixed top-4 left-3 z-50 flex items-center gap-3">
        <div className="bg-transparent border border-cyan-500/30 rounded-lg px-4 py-2 backdrop-blur-sm">
          <h1 className="text-4xl font-bold tracking-wider text-cyan-400 drop-shadow-[0_0_10px_rgba(0,212,255,0.5)]">
            NDIM
          </h1>
          <p className="text-[10px] tracking-widest text-gray-400 mt-0.5">
             NETWORK DEVICE INVENTORY MANAGER
          </p>
        </div>

        <nav className="flex items-center rounded-lg gap-2 px-2 py-1">
        {([
          ['dashboard', 'dashboard', LayoutDashboard],
          ['network', 'network', Network],
          ['activity', 'activity', Activity],
          ['settings', 'settings', Settings],
        ] as const).map(([pageKey, widgetKey, Icon]) => (
            <button
              key={pageKey}
              onClick={() => toggleWidget(widgetKey)}
              className={`group relative w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                isActive(widgetKey)
                  ? 'text-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-cyan-500/10'
              }`}
              title={WIDGET_LABELS[widgetKey]}
            >
              <Icon size={18} />
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-gray-700">
                {WIDGET_LABELS[widgetKey]}
              </span>
            </button>
          ))}
        </nav>
        <div className="text-xs tracking-widest text-gray-400" style={{ fontFamily: 'var(--font-data)' }}>
          {WIDGET_LABELS[activeWidgets.find((key) => LEFT_WIDGET_KEYS.includes(key)) ?? 'dashboard']}
        </div>
      </div>

      {/* Floating right tools rail */}
      <nav className="fixed right-[12rem] top-4 z-40 flex items-center gap-3">
        {([
          ['layers', 'layers', Layers],
          ['analytics', 'analytics', BarChart3],
          ['threats', 'threats', Shield],
          ['live', 'live', Radio],
          ['security', 'security', Lock],
        ] as const).map(([pageKey, widgetKey, Icon]) => {
          const active = isActive(widgetKey)
          return (
            <button
              key={pageKey}
              onClick={() => toggleWidget(widgetKey)}
              className={`flex items-center gap-2 rounded-full transition-all ${
                active
                  ? 'text-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-cyan-500/10'
              }`}
              title={WIDGET_LABELS[widgetKey]}
            >
              {active && (
                <span className="text-[10px] font-semibold tracking-wider text-cyan-300 whitespace-nowrap" style={{ fontFamily: 'var(--font-data)' }}>
                  {WIDGET_LABELS[widgetKey]}
                </span>
              )}
              <span className="flex h-10 w-10 items-center justify-center rounded-full">
                <Icon size={20} />
              </span>
            </button>
          )
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 relative overflow-hidden">
        <GlobeMap
          flyToLocation={flyToLocation}
          selectedDevice={selectedDevice}
          selectedSite={selectedSite}
          securityEvents={securityEvents}
          transitionSpeed="fast"
        />

        {isActive('dashboard') && (
          <>
            <div className="absolute left-4 top-24 z-30 pt-10 flex flex-col gap-4">
              <NycPerformanceCard onLocationSelect={(coords) => {
                setFlyToLocation(coords)
                setSelectedSite(coords?.site ?? null)
              }} onOpenAddModal={() => setIsAddModalOpen(true)} />
              {selectedSite && (
                <div key={selectedSite} className="hud-panel rounded-lg p-4 w-[380px]">
                  <div className="text-xs font-semibold text-cyan-300 mb-3" style={{ fontFamily: 'var(--font-data)' }}>
                    DEVICES — {selectedSite}
                  </div>
                  <div className="max-h-[220px] overflow-y-auto pr-1 performance-scroll">
                    {devicesLoading && (
                      <div className="flex flex-col gap-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="h-4 w-24 bg-cyan-500/10 rounded" />
                            <div className="h-3 w-16 bg-cyan-500/10 rounded" />
                          </div>
                        ))}
                      </div>
                    )}
                    {devicesError && (
                      <div className="text-xs text-red-400">Failed to load devices</div>
                    )}
                    {!devicesLoading && !devicesError && (
                      <div className="flex flex-col gap-1">
                        {devices.filter((device) => device.site === selectedSite).map((device) => {
                          const isSelected = selectedDevice?.id === device.id
                          return (
                            <button
                              key={device.id}
                              onClick={() => handleSelectDeviceWithoutFly(device)}
                              className={`w-full text-left rounded border px-3 py-2 transition-colors ${
                                isSelected
                                  ? 'border-cyan-400/40 bg-cyan-500/10'
                                  : 'border-cyan-500/10 hover:border-cyan-400/30 hover:bg-cyan-500/5'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-200" style={{ fontFamily: 'var(--font-data)' }}>
                                  {device.hostname}
                                </span>
                                <div className="flex items-center gap-2">
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
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
                                <span>{device.ip}</span>
                                <div className="flex items-center gap-2">
                                  
                                  <span
                                    className="text-[10px] px-1 py-0.5 rounded border"
                                    style={{
                                      fontFamily: 'var(--font-data)',
                                      borderColor: COMPLIANCE_COLOR[device.compliance_status],
                                      color: COMPLIANCE_COLOR[device.compliance_status],
                                    }}
                                  >
                                    {device.compliance_status.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                        {devices.filter((device) => device.site === selectedSite).length === 0 && (
                          <div className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
                            No matching devices.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <AddDatacenterModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              onAdd={(dc) => {
                fetch(`${API_URL}/api/devices`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(dc),
                }).then(() => {
                  window.location.reload()
                })
              }}
            />
          </>
        )}

        {isActive('network') && (
          <>
             <div className="absolute left-4 top-24 z-30 flex flex-col gap-4 w-[420px]">
              <div className="hud-panel border border-cyan-500/30 rounded-lg p-4">
                 <div className="flex items-center justify-between mb-3">
                   <h2 className="text-sm font-bold text-cyan-300 tracking-wider">NETWORK TOPOLOGY</h2>
                   <span className="text-[10px] text-cyber-muted" style={{ fontFamily: 'var(--font-data)' }}>
                     {TOPOLOGY_LABELS[topologyType]} · {siteDevices.length} DEVICE{siteDevices.length !== 1 ? 'S' : ''}
                   </span>
                 </div>
                 <div className="flex flex-col gap-2 mb-3">
                   <div className="flex items-center justify-between gap-2">
                     <button
                       onClick={() => {
                         const idx = sites.indexOf(activeSite)
                         const prev = idx <= 0 ? sites[sites.length - 1] : sites[idx - 1]
                         setSelectedSiteForTopology(prev)
                         setSearchQuery('')
                         setStatusFilter('all')
                       }}
                       className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/10"
                     >
                       ‹
                     </button>
                     <div className="flex-1 text-center text-xs text-gray-200" style={{ fontFamily: 'var(--font-data)' }}>
                       {activeSite ?? 'SELECT DATACENTER'}
                     </div>
                     <button
                       onClick={() => {
                         const idx = sites.indexOf(activeSite)
                         const next = idx >= sites.length - 1 ? sites[0] : sites[idx + 1]
                         setSelectedSiteForTopology(next)
                         setSearchQuery('')
                         setStatusFilter('all')
                       }}
                       className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/10"
                     >
                       ›
                     </button>
                   </div>
                   <div className="flex items-center gap-2 text-[10px]" style={{ fontFamily: 'var(--font-data)' }}>
                     {(['all', 'online', 'warning', 'offline'] as const).map((status) => (
                       <button
                         key={status}
                         onClick={() => setStatusFilter(status)}
                         className={`px-2 py-1 rounded border transition-colors ${
                           statusFilter === status
                             ? 'border-cyan-400/60 text-cyan-300 bg-cyan-500/10'
                             : 'border-cyan-500/10 text-gray-400 hover:text-white'
                         }`}
                       >
                         {status.toUpperCase()}
                       </button>
                     ))}
                   </div>
                 </div>
                 <div className="relative w-full rounded border border-cyan-500/10 bg-black/20 overflow-hidden" style={{ height: 260 }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 380 220" preserveAspectRatio="xMidYMid meet">
                     <defs>
                       <filter id="glow">
                         <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                         <feMerge>
                           <feMergeNode in="coloredBlur" />
                           <feMergeNode in="SourceGraphic" />
                         </feMerge>
                       </filter>
                     </defs>
                     {siteDevices.length === 0 ? (
                       <text x="50%" y="50%" textAnchor="middle" fill="#6b7280" fontSize="10" style={{ fontFamily: 'var(--font-data)' }}>
                         NO DEVICES FOR THIS SITE
                       </text>
                      ) : (
                         renderTopology('glow', setSelectedDevice)
                      )}
                   </svg>
                 </div>
                 <button
                    onClick={() => {
                      setModalSelectedDevice(null)
                      setShowNetworkModal(true)
                    }}
                   className="w-full rounded border border-cyan-500/20 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10"
                   style={{ fontFamily: 'var(--font-data)' }}
                 >
                   ORGANIZE NETWORK
                  </button>
                 </div>
              </div>
          </>
        )}

         {displayedDevice && (
           <div
             key={displayedDevice.id}
             className={`absolute right-4 top-24 z-30 w-80 ${isExiting ? 'animate-slideOutRight' : 'animate-slideInRight'}`}
             onAnimationEnd={handleDeviceAnimationEnd}
           >
             <div className="hud-panel rounded-lg p-4" style={{ height: '50vh' }}>
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-sm font-bold text-cyan-400 tracking-wider">DEVICE DETAIL</h3>
                 <button
                   onClick={() => {
                     setDisplayedDevice(null)
                     setSelectedDevice(null)
                     setPendingDevice(null)
                     setIsExiting(false)
                   }}
                   className="text-[10px] text-gray-400 hover:text-white"
                   style={{ fontFamily: 'var(--font-data)' }}
                 >
                   CLOSE
                 </button>
               </div>
                   <div className="space-y-2 text-xs overflow-y-auto pr-2 performance-scroll" style={{ fontFamily: 'var(--font-data)', height: 'calc(50vh - 60px)', overflowY: 'scroll' }}>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-500">HOSTNAME</span>
                       <span className="text-gray-200">{displayedDevice.hostname}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-500">IP</span>
                       <span className="text-gray-200">{displayedDevice.ip}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-500">VENDOR</span>
                       <span className="text-gray-200">{displayedDevice.vendor}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-500">MODEL</span>
                       <span className="text-gray-200">{displayedDevice.model}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-500">SITE</span>
                       <span className="text-gray-200">{displayedDevice.site}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-500">COORDINATES</span>
                       <span className="text-gray-200">{displayedDevice.lat.toFixed(4)}, {displayedDevice.lng.toFixed(4)}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-500">STATUS</span>
                       <span
                         className="font-semibold"
                         style={{ color: STATUS_COLOR[displayedDevice.status] }}
                       >
                         {displayedDevice.status.toUpperCase()}
                       </span>
                     </div>
                     <div className="mt-4 border-t border-cyan-500/10 pt-3">
                       <div className="text-[10px] text-gray-500 mb-2" style={{ fontFamily: 'var(--font-data)' }}>
                         SECURITY
                       </div>
                       <div className="space-y-2">
                         <div className="flex items-center justify-between">
                           <span className="text-gray-500">SECURITY SCORE</span>
                           <span className="font-semibold" style={{ color: SECURITY_SCORE_COLOR(displayedDevice.security_score) }}>
                             {displayedDevice.security_score}/100
                           </span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span className="text-gray-500">COMPLIANCE</span>
                           <span
                             className="font-semibold"
                             style={{ color: COMPLIANCE_COLOR[displayedDevice.compliance_status] }}
                           >
                             {displayedDevice.compliance_status.toUpperCase()}
                           </span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span className="text-gray-500">SECURITY ZONE</span>
                           <span className="text-gray-200">{displayedDevice.security_zone.toUpperCase()}</span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span className="text-gray-500">FIRMWARE</span>
                           <span className="text-gray-200">{displayedDevice.firmware_version}</span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span className="text-gray-500">ACTIVE SESSIONS</span>
                           <span className="text-gray-200">{displayedDevice.active_sessions}</span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span className="text-gray-500">FAILED LOGINS</span>
                           <span className="text-gray-200">{displayedDevice.failed_logins}</span>
                         </div>
                       </div>
                     </div>
                    <div className="mt-4 border-t border-cyan-500/10 pt-3">
                      <div className="text-[10px] text-gray-500 mb-2" style={{ fontFamily: 'var(--font-data)' }}>
                        INTERFACES
                      </div>
                      <div className="space-y-1">
                        {['Gi0/0', 'Gi0/1', 'Gi0/2', 'Gi0/3'].map((iface) => (
                          <div key={iface} className="flex items-center justify-between rounded border border-cyan-500/10 px-3 py-1.5">
                            <span className="text-[10px] text-gray-300" style={{ fontFamily: 'var(--font-data)' }}>{iface}</span>
                            <span className="text-[10px] text-green-400" style={{ fontFamily: 'var(--font-data)' }}>UP</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-cyan-500/10 pt-3">
                      <div className="text-[10px] text-gray-500 mb-2" style={{ fontFamily: 'var(--font-data)' }}>
                        VULNERABILITY SCANNER
                      </div>
                      <VulnerabilityScanner deviceId={displayedDevice.id} />
                    </div>
                  </div>
                </div>
            </div>
        )}

         {displayedDevice && (
           <div
             key={`perf-${displayedDevice.id}`}
             className={`absolute right-4 z-30 w-80 ${isExiting ? 'animate-slideOutRight' : 'animate-slideInRight delay-150'}`}
             style={{ top: 'calc(94px + 50vh + 16px)' }}
             onAnimationEnd={handleDeviceAnimationEnd}
           >
             <div className="hud-panel rounded-lg p-4">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-sm font-bold text-cyan-400 tracking-wider">DEVICE PERFORMANCE</h3>
                 <button
                   onClick={() => {}}
                   className="text-[10px] text-gray-400 hover:text-white"
                   style={{ fontFamily: 'var(--font-data)' }}
                 >
                   LIVE
                 </button>
               </div>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <svg width="60" height="60" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="#00d4ff"
                      strokeWidth="6"
                      strokeDasharray={`${(deviceHealth.overall / 100) * 201} 201`}
                      transform="rotate(-90 40 40)"
                      strokeLinecap="round"
                    />
                    <text x="40" y="40" textAnchor="middle" dy="0.35em" fill="#e8e6de" fontSize="16" fontWeight="700" fontFamily="var(--font-data)">
                      {Math.round(deviceHealth.overall)}%
                    </text>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-200 truncate" style={{ fontFamily: 'var(--font-data)' }}>
                    {displayedDevice.hostname}
                  </div>
                  <div className="text-[10px] text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
                    {displayedDevice.site}
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1" style={{ fontFamily: 'var(--font-data)' }}>
                        <span className="text-gray-500">CPU</span>
                        <span className="text-gray-300">{Math.round(deviceHealth.cpu)}%</span>
                      </div>
                      <div className="h-1 bg-cyan-500/10 rounded overflow-hidden">
                        <div className="h-full rounded bg-cyan-400 transition-all" style={{ width: `${deviceHealth.cpu}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1" style={{ fontFamily: 'var(--font-data)' }}>
                        <span className="text-gray-500">RAM</span>
                        <span className="text-gray-300">{Math.round(deviceHealth.ram)}%</span>
                      </div>
                      <div className="h-1 bg-cyan-500/10 rounded overflow-hidden">
                        <div className="h-full rounded bg-cyan-400 transition-all" style={{ width: `${deviceHealth.ram}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1" style={{ fontFamily: 'var(--font-data)' }}>
                        <span className="text-gray-500">UPLOAD</span>
                        <span className="text-gray-300">{Math.round(deviceHealth.upload)}%</span>
                      </div>
                      <div className="h-1 bg-cyan-500/10 rounded overflow-hidden">
                        <div className="h-full rounded bg-cyan-400 transition-all" style={{ width: `${deviceHealth.upload}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1" style={{ fontFamily: 'var(--font-data)' }}>
                        <span className="text-gray-500">DOWNLOAD</span>
                        <span className="text-gray-300">{Math.round(deviceHealth.download)}%</span>
                      </div>
                      <div className="h-1 bg-cyan-500/10 rounded overflow-hidden">
                        <div className="h-full rounded bg-cyan-400 transition-all" style={{ width: `${deviceHealth.download}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isActive('activity') && (
          <div className="absolute left-4 top-24 z-30 flex flex-col gap-4 w-[420px]">
            <div className="hud-panel border border-cyan-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-cyan-300 tracking-wider">FEEDS</h2>
                  <p className="text-[10px] text-cyber-muted" style={{ fontFamily: 'var(--font-data)' }}>
                    {activities.length} EVENTS · {activities.filter((a) => a.severity === 'high').length} HIGH · {activities.filter((a) => a.severity === 'medium').length} MEDIUM · {activities.filter((a) => a.severity === 'low').length} LOW
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {(['all', 'high', 'medium', 'low'] as const).map((severity) => (
                    <button
                      key={severity}
                      onClick={() => setActivityFilter(severity)}
                      className={`px-2 py-1 rounded border text-[10px] transition-colors ${
                        activityFilter === severity
                          ? 'border-cyan-400/60 text-cyan-300 bg-cyan-500/10'
                          : 'border-cyan-500/10 text-gray-400 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-data)' }}
                    >
                      {severity.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 performance-scroll">
                {activities
                  .filter((activity) => activityFilter === 'all' || activity.severity === activityFilter)
                  .map((activity) => {
                    const isAcknowledged = acknowledgedActivities.has(activity.id)
                    return (
                      <div
                        key={activity.id}
                        className={`flex items-start justify-between gap-3 rounded border px-3 py-2 transition-colors ${
                          isAcknowledged ? 'border-cyan-500/10 opacity-60' : 'border-cyan-500/20'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded"
                              style={{
                                fontFamily: 'var(--font-data)',
                                backgroundColor: activity.severity === 'high' ? '#ff475720' : activity.severity === 'medium' ? '#ff9f4320' : '#00ff9d20',
                                color: activity.severity === 'high' ? '#ff4757' : activity.severity === 'medium' ? '#ff9f43' : '#00ff9d',
                              }}
                            >
                              {activity.severity.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>{activity.timestamp}</span>
                          </div>
                          <div className="text-xs text-gray-200" style={{ fontFamily: 'var(--font-data)' }}>{activity.message}</div>
                        </div>
                        {!isAcknowledged && (
                          <button
                            onClick={() => setAcknowledgedActivities((prev) => new Set(prev).add(activity.id))}
                            className="text-[10px] text-cyan-300 hover:text-white whitespace-nowrap"
                            style={{ fontFamily: 'var(--font-data)' }}
                          >
                            ACK
                          </button>
                        )}
                      </div>
                    )
                  })}
                {activities.length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-8" style={{ fontFamily: 'var(--font-data)' }}>
                    NO ACTIVITY EVENTS YET
                  </div>
                )}
              </div>
              <button
                onClick={() => setActivities([])}
                className="mt-3 w-full rounded border border-cyan-500/20 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10"
                style={{ fontFamily: 'var(--font-data)' }}
              >
                CLEAR ALL
              </button>
            </div>
          </div>
        )}

        {isActive('settings') && (
          <div className="h-full w-full flex items-center justify-center pointer-events-none">
            <div className="hud-panel rounded-lg p-8 text-center pointer-events-auto">
              <Settings size={48} className="text-cyber-accent mx-auto mb-4" />
              <h2 className="text-2xl font-bold cyber-text mb-2">SETTINGS</h2>
              <p className="text-cyber-muted">System configuration panel coming soon...</p>
            </div>
          </div>
        )}

        <div className={`absolute right-4 top-24 z-30 w-72 right-widget-panel ${isActive('layers') ? 'is-active' : ''}`}>
          <div className="absolute -inset-4" onClick={() => toggleWidget('layers')} />
          <div className="hud-panel rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-cyan-400 tracking-wider">LAYERS</h3>
              <button onClick={() => toggleWidget('layers')} className="text-[10px] text-gray-400 hover:text-white">CLOSE</button>
            </div>
            <div className="space-y-2">
              {['Devices', 'Arcs', 'Grid', 'Heatmap', 'Satellite'].map((layer) => (
                <label key={layer} className="flex items-center justify-between text-xs text-cyber-muted cursor-pointer">
                  <span>{layer}</span>
                  <input type="checkbox" defaultChecked className="accent-cyan-400" />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className={`absolute right-[1em] top-24 z-30 w-80 right-widget-panel ${isActive('analytics') ? 'is-active' : ''}`}>
          <div className="absolute -inset-4" onClick={() => toggleWidget('analytics')} />
          <div className="hud-panel rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-cyan-400 tracking-wider">ANALYTICS</h3>
              <button onClick={() => toggleWidget('analytics')} className="text-[10px] text-gray-400 hover:text-white">CLOSE</button>
            </div>
            <div className="space-y-3">
              <div className="relative h-24 rounded border border-cyan-500/20 bg-black/20 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 100" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#00ff9d"
                    strokeWidth="1.5"
                    points={waveformHistory.map((y, i) => `${(i / (waveformHistory.length - 1)) * 320},${y}`).join(' ')}
                  />
                </svg>
                <div className="absolute top-2 left-2 text-[10px] text-cyan-300" style={{ fontFamily: 'var(--font-data)' }}>LIVE SIGNAL</div>
                <div className="absolute bottom-2 right-2 text-[10px] text-gray-400" style={{ fontFamily: 'var(--font-data)' }}>LIVE</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'CPU', value: Math.round(analyticsMetrics.cpu), unit: '%', color: '#00ff9d' },
                  { label: 'MEM', value: Math.round(analyticsMetrics.mem), unit: '%', color: '#00d4ff' },
                  { label: 'TEMP', value: Math.round(analyticsMetrics.temp), unit: '°C', color: '#ff9f43' },
                  { label: 'LAT', value: Math.round(analyticsMetrics.lat), unit: 'ms', color: '#ff4757' },
                ].map((metric) => (
                  <div key={metric.label} className="rounded border border-cyan-500/20 p-2 text-center">
                    <div className="text-[10px] text-gray-400 mb-1" style={{ fontFamily: 'var(--font-data)' }}>{metric.label}</div>
                    <div className="text-sm font-bold" style={{ color: metric.color }}>{metric.value}{metric.unit}</div>
                    <div className="mt-1 h-1 bg-cyan-500/10 rounded overflow-hidden">
                      <div className="h-full rounded transition-all" style={{ width: `${Math.min(100, Math.max(0, metric.value))}%`, backgroundColor: metric.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded border border-cyan-500/20 p-2">
                <div className="text-[10px] text-gray-400 mb-2" style={{ fontFamily: 'var(--font-data)' }}>BANDWIDTH</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">IN</span>
                  <span className="text-cyan-300" style={{ fontFamily: 'var(--font-data)' }}>{analyticsMetrics.inBw.toFixed(1)} MB/s</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">OUT</span>
                  <span className="text-cyan-300" style={{ fontFamily: 'var(--font-data)' }}>{analyticsMetrics.outBw.toFixed(1)} MB/s</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`absolute right-4 top-24 z-30 w-80 right-widget-panel ${isActive('threats') ? 'is-active' : ''}`}>
          <div className="absolute -inset-4" onClick={() => toggleWidget('threats')} />
          <div className="hud-panel rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-cyan-400 tracking-wider">THREATS</h3>
              <button onClick={() => toggleWidget('threats')} className="text-[10px] text-gray-400 hover:text-white">CLOSE</button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((severity) => (
                <button
                  key={severity}
                  onClick={() => setThreatSeverityFilter(severity)}
                  className={`px-2 py-1 rounded border text-[10px] transition-colors ${
                    threatSeverityFilter === severity
                      ? 'border-cyan-400/60 text-cyan-300 bg-cyan-500/10'
                      : 'border-cyan-500/10 text-gray-400 hover:text-white'
                  }`}
                  style={{ fontFamily: 'var(--font-data)' }}
                >
                  {severity.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 performance-scroll">
              {threatsLoading && (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-4 w-24 bg-cyan-500/10 rounded" />
                      <div className="h-3 w-16 bg-cyan-500/10 rounded" />
                    </div>
                  ))}
                </div>
              )}
              {threatsError && (
                <div className="text-xs text-red-400">Failed to load threats</div>
              )}
              {!threatsLoading && !threatsError && (
                <>
                  {securityEvents
                    .filter((event) => threatSeverityFilter === 'all' || event.severity === threatSeverityFilter)
                    .map((event) => {
                      const isAcknowledged = acknowledgedThreats.has(event.id)
                      return (
                        <div
                          key={event.id}
                          className={`flex items-start justify-between gap-3 rounded border px-3 py-2 transition-colors ${
                            isAcknowledged ? 'border-cyan-500/10 opacity-60' : 'border-cyan-500/20'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded"
                                style={{
                                  fontFamily: 'var(--font-data)',
                                  backgroundColor: event.severity === 'critical' ? '#ff475720' : event.severity === 'high' ? '#ff9f4320' : event.severity === 'medium' ? '#f1c40f20' : '#00ff9d20',
                                  color: event.severity === 'critical' ? '#ff4757' : event.severity === 'high' ? '#ff9f43' : event.severity === 'medium' ? '#f1c40f' : '#00ff9d',
                                }}
                              >
                                {event.severity.toUpperCase()}
                              </span>
                              <span className="text-[10px] text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-xs text-gray-200 mb-1" style={{ fontFamily: 'var(--font-data)' }}>
                              {event.description}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
                              <span>{event.device_id}</span>
                              {event.source_ip && <span>• {event.source_ip}</span>}
                            </div>
                          </div>
                          {!isAcknowledged && (
                            <button
                              onClick={() => setAcknowledgedThreats((prev) => new Set(prev).add(event.id))}
                              className="text-[10px] text-cyan-300 hover:text-white whitespace-nowrap"
                              style={{ fontFamily: 'var(--font-data)' }}
                            >
                              ACK
                            </button>
                          )}
                        </div>
                      )
                    })}
                  {securityEvents.filter((event) => threatSeverityFilter === 'all' || event.severity === threatSeverityFilter).length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-4" style={{ fontFamily: 'var(--font-data)' }}>
                      No threats found
                    </div>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => setAcknowledgedThreats(new Set())}
              className="mt-3 w-full rounded border border-cyan-500/20 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10"
              style={{ fontFamily: 'var(--font-data)' }}
            >
              CLEAR ACKNOWLEDGED
            </button>
          </div>
        </div>

        <div className={`absolute right-4 top-24 z-30 w-80 right-widget-panel ${isActive('live') ? 'is-active' : ''}`}>
          <div className="absolute -inset-4" onClick={() => toggleWidget('live')} />
          <div className="hud-panel rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-cyan-400 tracking-wider">LIVE FEEDS</h3>
              <button onClick={() => toggleWidget('live')} className="text-[10px] text-gray-400 hover:text-white">CLOSE</button>
            </div>
            <div className="space-y-2">
              {[
                'New device registered: nyc-dc-07',
                'Interface flapping: Gi0/1',
                'BGP peer down: 192.168.1.1',
                'CPU spike: 94% on router-02',
                'Backup completed successfully',
              ].map((item) => (
                <div key={item} className="rounded border border-cyan-500/10 px-3 py-2 text-xs text-cyber-muted">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`absolute right-4 top-24 z-30 w-80 right-widget-panel ${isActive('security') ? 'is-active' : ''}`}>
          <div className="absolute -inset-4" onClick={() => toggleWidget('security')} />
          <SecurityDashboard onClose={() => toggleWidget('security')} />
        </div>
      </main>

      {showNetworkModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowNetworkModal(false)} />
          <div className="hud-panel border border-cyan-500/30 rounded-xl w-[90vw] max-w-6xl max-h-[85vh] relative flex flex-col">
            <div className="flex items-center justify-between mb-4 px-5 pt-5">
              <div>
                <h2 className="text-sm font-bold text-cyan-300 tracking-wider">ORGANIZED NETWORK</h2>
              </div>
              <button
                onClick={() => {
                  setShowNetworkModal(false)
                  setModalSelectedDevice(null)
                }}
                className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/10"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-1 min-h-0">
              <div className="w-[440px] border-r border-cyan-500/20 p-4 flex flex-col gap-3 overflow-y-auto">
                <div className="hud-panel rounded-lg p-4">
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          const idx = sites.indexOf(activeSite)
                          const prev = idx <= 0 ? sites[sites.length - 1] : sites[idx - 1]
                          setSelectedSiteForTopology(prev)
                          setSearchQuery('')
                          setStatusFilter('all')
                          setModalSelectedDevice(null)
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/10"
                      >
                        ‹
                      </button>
                      <div className="flex-1 text-center text-xs text-gray-200" style={{ fontFamily: 'var(--font-data)' }}>
                        {activeSite ?? 'SELECT DATACENTER'}
                      </div>
                      <button
                        onClick={() => {
                          const idx = sites.indexOf(activeSite)
                          const next = idx >= sites.length - 1 ? sites[0] : sites[idx + 1]
                          setSelectedSiteForTopology(next)
                          setSearchQuery('')
                          setStatusFilter('all')
                          setModalSelectedDevice(null)
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/10"
                      >
                        ›
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]" style={{ fontFamily: 'var(--font-data)' }}>
                      {(['all', 'online', 'warning', 'offline'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`px-2 py-1 rounded border transition-colors ${
                            statusFilter === status
                              ? 'border-cyan-400/60 text-cyan-300 bg-cyan-500/10'
                              : 'border-cyan-500/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          {status.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative w-full rounded border border-cyan-500/10 bg-black/20 overflow-hidden" style={{ height: 260 }}>
                   <svg className="absolute inset-0 w-full h-full" viewBox="0 0 380 220" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <filter id="glow-modal">
                          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      {siteDevices.length === 0 ? (
                        <text x="50%" y="50%" textAnchor="middle" fill="#6b7280" fontSize="10" style={{ fontFamily: 'var(--font-data)' }}>
                          NO DEVICES FOR THIS SITE
                        </text>
                      ) : (
                         renderTopology('glow-modal', setModalSelectedDevice)
                      )}
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {modalSelectedDevice ? (
                  <div className="hud-panel rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-cyan-300 tracking-wider">DEVICE DETAIL</h3>
                      <button
                        onClick={() => setModalSelectedDevice(null)}
                        className="text-[10px] text-gray-400 hover:text-white"
                        style={{ fontFamily: 'var(--font-data)' }}
                      >
                        CLOSE
                      </button>
                    </div>
                    <div className="space-y-2 text-xs" style={{ fontFamily: 'var(--font-data)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">HOSTNAME</span>
                        <span className="text-gray-200">{modalSelectedDevice.hostname}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">IP ADDRESS</span>
                        <span className="text-gray-200">{modalSelectedDevice.ip}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">VENDOR</span>
                        <span className="text-gray-200">{modalSelectedDevice.vendor}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">MODEL</span>
                        <span className="text-gray-200">{modalSelectedDevice.model}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">SITE</span>
                        <span className="text-gray-200">{modalSelectedDevice.site}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">COORDINATES</span>
                        <span className="text-gray-200">{modalSelectedDevice.lat.toFixed(4)}, {modalSelectedDevice.lng.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">STATUS</span>
                        <span
                          className="font-semibold"
                          style={{ color: STATUS_COLOR[modalSelectedDevice.status] }}
                        >
                          {modalSelectedDevice.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">SECURITY SCORE</span>
                        <span className="font-semibold" style={{ color: SECURITY_SCORE_COLOR(modalSelectedDevice.security_score) }}>
                          {modalSelectedDevice.security_score}/100
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">COMPLIANCE</span>
                        <span
                          className="font-semibold"
                          style={{ color: COMPLIANCE_COLOR[modalSelectedDevice.compliance_status] }}
                        >
                          {modalSelectedDevice.compliance_status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">SECURITY ZONE</span>
                        <span className="text-gray-200">{modalSelectedDevice.security_zone.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-cyan-500/10 pt-3">
                      <div className="text-[10px] text-gray-500 mb-2" style={{ fontFamily: 'var(--font-data)' }}>
                        VULNERABILITY SCANNER
                      </div>
                      <VulnerabilityScanner deviceId={modalSelectedDevice.id} />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <button className="flex-1 rounded border border-cyan-500/20 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10" style={{ fontFamily: 'var(--font-data)' }}>
                        UPDATE
                      </button>
                      <button className="flex-1 rounded border border-red-500/20 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10" style={{ fontFamily: 'var(--font-data)' }}>
                        DELETE
                      </button>
                      <button className="flex-1 rounded border border-cyan-500/20 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10" style={{ fontFamily: 'var(--font-data)' }}>
                        NEW DEVICE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs" style={{ fontFamily: 'var(--font-data)' }}>
                    SELECT A DEVICE FROM THE TOPOLOGY TO VIEW DETAILS
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
