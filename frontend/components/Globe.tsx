'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Map, { MapRef, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@/styles/theme.css';
import type { FeatureCollection, Feature, Point, LineString } from 'geojson';

const VECTOR_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const SATELLITE_STYLE: any = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'esri-imagery', type: 'raster', source: 'esri' }],
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001';

type BaseStyle = 'map' | 'sat';
type ProjectionMode = 'globe' | 'mercator';
type TopologyType = 'star' | 'bus' | 'ring' | 'mesh' | 'tree' | 'hybrid';

interface Device {
  id: string;
  hostname: string;
  ip: string;
  vendor: string;
  model: string;
  site: string;
  lat: number;
  lng: number;
  status: 'online' | 'warning' | 'offline';
  security_score: number;
  last_vulnerability_scan: string | null;
  compliance_status: 'compliant' | 'non-compliant' | 'pending';
  firmware_version: string;
  last_config_change: string | null;
  active_sessions: number;
  failed_logins: number;
  security_zone: 'trusted' | 'dmz' | 'untrusted';
}

interface SecurityEvent {
  id: string;
  device_id: string;
  event_type: 'brute_force' | 'port_scan' | 'config_change' | 'anomaly';
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  description: string;
  source_ip: string | null;
}

const STATUS_COLOR: Record<Device['status'], string> = {
  online: '#00ff9d',
  warning: '#ff9f43',
  offline: '#ff4757',
};

const SECURITY_SCORE_COLOR = (score: number): string => {
  if (score >= 90) return '#00ff9d';
  if (score >= 70) return '#ff9f43';
  return '#ff4757';
};

const SECURITY_ZONE_COLOR: Record<Device['security_zone'], string> = {
  trusted: 'rgba(0, 255, 157, 0.15)',
  dmz: 'rgba(255, 159, 67, 0.15)',
  untrusted: 'rgba(255, 71, 87, 0.15)',
};

const DEFAULT_DEVICES: Device[] = [
  { id: 'dev-002', hostname: 'core-sw-nyc01', ip: '10.0.0.2', vendor: 'Juniper', model: 'QFX5120', site: 'New York DC', lat: 40.7128, lng: -74.006, status: 'online', security_score: 95, last_vulnerability_scan: '2026-09-25T10:30:00Z', compliance_status: 'compliant', firmware_version: '20.4R1', last_config_change: '2026-09-20T14:22:00Z', active_sessions: 2, failed_logins: 0, security_zone: 'trusted' },
  { id: 'dev-004', hostname: 'fw-lon01', ip: '10.0.1.4', vendor: 'Fortinet', model: 'FortiGate 600E', site: 'London DC', lat: 51.5074, lng: -0.1278, status: 'online', security_score: 78, last_vulnerability_scan: '2026-09-23T10:10:00Z', compliance_status: 'pending', firmware_version: '7.2.5', last_config_change: '2026-09-16T08:55:00Z', active_sessions: 4, failed_logins: 8, security_zone: 'dmz' },
  { id: 'dev-012', hostname: 'core-sw-tky01', ip: '10.0.2.12', vendor: 'Cisco', model: 'Nexus 9300', site: 'Tokyo DC', lat: 35.6762, lng: 139.6503, status: 'online', security_score: 94, last_vulnerability_scan: '2026-09-25T08:00:00Z', compliance_status: 'compliant', firmware_version: '17.3.5', last_config_change: '2026-09-22T10:20:00Z', active_sessions: 2, failed_logins: 0, security_zone: 'trusted' },
  { id: 'dev-016', hostname: 'core-sw-syd01', ip: '10.0.3.16', vendor: 'Arista', model: '7280R', site: 'Sydney DC', lat: -33.8688, lng: 151.2093, status: 'online', security_score: 93, last_vulnerability_scan: '2026-09-25T07:30:00Z', compliance_status: 'compliant', firmware_version: '4.29.1F', last_config_change: '2026-09-21T12:15:00Z', active_sessions: 3, failed_logins: 0, security_zone: 'trusted' },
  { id: 'dev-021', hostname: 'core-sw-par01', ip: '10.0.4.21', vendor: 'Cisco', model: 'Catalyst 9500', site: 'Paris DC', lat: 48.8566, lng: 2.3522, status: 'online', security_score: 96, last_vulnerability_scan: '2026-09-25T09:45:00Z', compliance_status: 'compliant', firmware_version: '17.9.4a', last_config_change: '2026-09-22T14:10:00Z', active_sessions: 2, failed_logins: 0, security_zone: 'trusted' },
  { id: 'dev-029', hostname: 'core-sw-ber01', ip: '10.0.5.29', vendor: 'Cisco', model: 'Nexus 9300', site: 'Berlin DC', lat: 52.52, lng: 13.405, status: 'online', security_score: 95, last_vulnerability_scan: '2026-09-25T08:30:00Z', compliance_status: 'compliant', firmware_version: '17.3.5', last_config_change: '2026-09-22T11:35:00Z', active_sessions: 2, failed_logins: 0, security_zone: 'trusted' },
  { id: 'dev-003', hostname: 'fw-nyc01', ip: '10.0.0.3', vendor: 'Palo Alto', model: 'PA-5200', site: 'New York DC', lat: 40.7128, lng: -74.006, status: 'warning', security_score: 72, last_vulnerability_scan: '2026-09-23T16:30:00Z', compliance_status: 'non-compliant', firmware_version: '10.1.8', last_config_change: '2026-09-15T09:20:00Z', active_sessions: 5, failed_logins: 15, security_zone: 'dmz' },
];

const HUB_DEVICE: Device = {
  id: 'dev-hub-001',
  hostname: 'core-sw-central',
  ip: '10.255.0.1',
  vendor: 'Cisco',
  model: 'Catalyst 9300',
  site: 'Central Hub',
  lat: 3.83,
  lng: 11.491428,
  status: 'online',
  security_score: 100,
  last_vulnerability_scan: null,
  compliance_status: 'compliant',
  firmware_version: '17.9.4a',
  last_config_change: null,
  active_sessions: 0,
  failed_logins: 0,
  security_zone: 'trusted',
};

function devicesToGeoJSON(devices: Device[]): FeatureCollection<Point, any> {
  return {
    type: 'FeatureCollection',
    features: devices.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
      properties: {
        site: d.site,
        security_score: d.security_score,
        security_zone: d.security_zone,
      },
    })),
  };
}

function arcsToGeoJSON(devices: Device[]): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = [];
  const sourceDevices = devices.find((d) => d.id === HUB_DEVICE.id) ? devices : [...DEFAULT_DEVICES, HUB_DEVICE];
  const hub = sourceDevices.find((d) => d.id === HUB_DEVICE.id);
  if (!hub) return { type: 'FeatureCollection', features };

  const targets = sourceDevices.filter((d) => d.id !== hub.id && d.site.trim().toLowerCase().endsWith('dc'));
  for (const device of targets) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [hub.lng, hub.lat],
          [device.lng, device.lat],
        ],
      },
      properties: {},
    });
  }
  return { type: 'FeatureCollection', features };
}

function arcsToDeckGL(devices: Device[]) {
  const sourceDevices = devices.find((d) => d.id === HUB_DEVICE.id) ? devices : [...DEFAULT_DEVICES, HUB_DEVICE];
  const hub = sourceDevices.find((d) => d.id === HUB_DEVICE.id);
  if (!hub) return [];
  const targets = sourceDevices.filter((d) => d.id !== hub.id && d.site.trim().toLowerCase().endsWith('dc'));
  return targets.map((device) => ({
    source: [hub.lng, hub.lat],
    target: [device.lng, device.lat],
  }));
}

function hubToGeoJSON(): FeatureCollection<Point, any> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [HUB_DEVICE.lng, HUB_DEVICE.lat] },
        properties: {},
      },
    ],
  };
}

function nightHemisphereGeoJSON(): FeatureCollection<Point> {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const features: Feature<Point>[] = [];
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const lng = -180 + (360 * i) / steps;
    const lat = 23.44 * Math.sin(((dayOfYear - 81) / 365) * 2 * Math.PI) * Math.cos((hour / 12) * Math.PI);
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {},
    });
  }
  return { type: 'FeatureCollection', features };
}

function computeScaleBar(zoom: number, lat: number): { widthPx: number; label: string } {
  const circumference = 40075017;
  const metersPerPx = (circumference * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
  const targetMeters = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000].find(
    (m) => m / metersPerPx >= 60
  ) || 1000000;
  return {
    widthPx: Math.max(40, Math.min(160, targetMeters / metersPerPx)),
    label: targetMeters >= 1000 ? `${targetMeters / 1000} km` : `${targetMeters} m`,
  };
}

function setMapProjection(map: any, mode: ProjectionMode) {
  if (!map || typeof map.setProjection !== 'function') return;

  if (mode === 'globe') {
    map.setProjection({ type: 'globe' });
    map.setPitch(0);
  } else {
    map.setProjection({ type: 'mercator' });
    map.setPitch(0);
  }
}

interface GlobeMapProps {
  initialProjection?: ProjectionMode;
  showDayNight?: boolean;
  onProjectionChange?: (mode: ProjectionMode) => void;
  flyToLocation?: { lat: number; lng: number; site?: string } | null;
  selectedDevice?: Device | null;
  selectedSite?: string | null;
  securityEvents?: SecurityEvent[];
  transitionSpeed?: 'slow' | 'medium' | 'fast';
  siteDevices?: Device[];
  topologyType?: TopologyType;
  onTopologyNodeClick?: (device: Device) => void;
  onSiteDeselect?: () => void;
  renderTopologyDialog?: (filterId: string, onNodeClick?: (device: Device) => void, forceTopology?: TopologyType) => React.ReactNode;
  onFlyToComplete?: () => void;
  isTopologyExiting?: boolean;
}

const TRANSITION_SPEEDS = {
  slow: { zoomOutDuration: 9000, intermediateDelay: 7500, zoomInDuration: 8000, finalDelay: 7500 },
  medium: { zoomOutDuration: 5000, intermediateDelay: 3000, zoomInDuration: 4000, finalDelay: 3000 },
  fast: { zoomOutDuration: 2500, intermediateDelay: 1500, zoomInDuration: 2000, finalDelay: 1500 },
};

export default function GlobeMap({
  initialProjection = 'globe',
  showDayNight = true,
  onProjectionChange,
  flyToLocation,
  selectedDevice,
  selectedSite,
  securityEvents = [],
  transitionSpeed = 'medium',
  siteDevices = [],
  topologyType = 'star',
  onTopologyNodeClick,
  onSiteDeselect,
  renderTopologyDialog,
  onFlyToComplete,
  isTopologyExiting = false,
  }: GlobeMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [ready, setReady] = useState(false);
  const [projection, setProjection] = useState<ProjectionMode>(initialProjection);
  const [baseStyle, setBaseStyle] = useState<BaseStyle>('map');
  const [view, setView] = useState({ lat: 0, lng: 20, zoom: 3 });
  const [cursor, setCursor] = useState<{ lat: number; lng: number } | null>(null);
  const [devices, setDevices] = useState<Device[]>(DEFAULT_DEVICES);
  const [devicesError, setDevicesError] = useState(false);
  const rafRef = useRef<number | null>(null);
  const phiRef = useRef(0);
  const previousFlyToRef = useRef<{ lat: number; lng: number; site?: string } | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const pulseRef = useRef<number | null>(null);
  const speedConfig = TRANSITION_SPEEDS[transitionSpeed];
  const [topologyLine, setTopologyLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [dialogPosition, setDialogPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/devices`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          const apiDevices = data.devices ?? [];
           const merged = apiDevices.some((d: Device) => d.id === HUB_DEVICE.id) ? apiDevices : [...apiDevices, HUB_DEVICE];
          setDevices(merged);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDevicesError(true);
          setDevices(DEFAULT_DEVICES);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready) return;

    const start = () => setIsInteracting(true);
    const end = () => setIsInteracting(false);

    map.on('mousedown', start);
    map.on('touchstart', start);
    map.on('mouseup', end);
    map.on('touchend', end);

    return () => {
      map.off('mousedown', start);
      map.off('touchstart', start);
      map.off('mouseup', end);
      map.off('touchend', end);
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready) return;

    setIsFlying(true);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const cleanup = () => {
      map.off('moveend', handleMoveEnd);
      map.off('moveend', handleFinalMoveEnd);
      setIsFlying(false);
    };

    const handleMoveEnd = () => {
      map.off('moveend', handleMoveEnd);
      onFlyToComplete?.();
    };

    const handleFinalMoveEnd = () => {
      map.off('moveend', handleFinalMoveEnd);
      setIsFlying(false);
      onFlyToComplete?.();
    };

    const resetAfterFallback = setTimeout(() => {
      cleanup();
    }, 3000);

    if (!flyToLocation) {
      const nextCenter: [number, number] = [20, 0];
      if (typeof (map as any).easeTo === 'function') {
        (map as any).easeTo({
          center: nextCenter,
          zoom: 3,
          bearing: 0,
          pitch: 0,
          duration: speedConfig.zoomOutDuration,
          essential: true,
        });
      } else {
        map.setCenter(nextCenter);
        map.setZoom(3);
        map.setBearing(0);
        map.setPitch(0);
        cleanup();
      }
      previousFlyToRef.current = null;
      return () => {
        clearTimeout(resetAfterFallback);
        cleanup();
      };
    }

    const prev = previousFlyToRef.current;
    const nextCenter: [number, number] = [flyToLocation.lng, flyToLocation.lat];

    if (prev && flyToLocation) {
      const currentCenter = (map as any).getCenter();
      const currentLng = Number((currentCenter as any)?.lng ?? 0);
      const currentLat = Number((currentCenter as any)?.lat ?? 0);

      const handleStep1End = () => {
        map.off('moveend', handleStep1End);
        setTimeout(() => {
          map.on('moveend', handleStep2End);

          if (typeof (map as any).easeTo === 'function') {
            (map as any).easeTo({
              center: nextCenter,
              zoom: 8,
              bearing: 0,
              pitch: 0,
              duration: speedConfig.zoomOutDuration,
              essential: true,
            });
          } else {
            map.setCenter(nextCenter);
            map.setZoom(8);
            map.setBearing(0);
            map.setPitch(0);
            handleStep2End();
          }
        }, speedConfig.intermediateDelay);
      };

      const handleStep2End = () => {
        map.off('moveend', handleStep2End);
        setTimeout(() => {
          map.on('moveend', handleFinalMoveEnd);

          if (typeof (map as any).easeTo === 'function') {
            (map as any).easeTo({
              center: nextCenter,
              zoom: 18,
              bearing: 0,
              pitch: 0,
              duration: speedConfig.zoomInDuration,
              essential: true,
            });
          } else {
            map.setCenter(nextCenter);
            map.setZoom(18);
            map.setBearing(0);
            map.setPitch(0);
            handleFinalMoveEnd();
          }
        }, speedConfig.finalDelay);
      };

      map.on('moveend', handleStep1End);

      if (typeof (map as any).easeTo === 'function') {
        (map as any).easeTo({
          center: [currentLng, currentLat],
          zoom: 12,
          bearing: 0,
          pitch: 0,
          duration: 9500,
          essential: true,
        });
      } else {
        map.setZoom(12);
        handleStep1End();
      }

      return () => {
        clearTimeout(resetAfterFallback);
        cleanup();
      };
    }

    map.on('moveend', handleMoveEnd);

    if (typeof (map as any).easeTo === 'function') {
      (map as any).easeTo({
        center: nextCenter,
        zoom: 18,
        bearing: 0,
        pitch: 20,
        duration: speedConfig.zoomInDuration,
        essential: true,
      });
    } else {
      map.setCenter(nextCenter);
      map.setZoom(18);
      map.setBearing(0);
      map.setPitch(20);
      handleMoveEnd();
    }

    previousFlyToRef.current = flyToLocation;

    return () => {
      clearTimeout(resetAfterFallback);
      cleanup();
    };
  }, [flyToLocation, ready]);

  const handleMove = useCallback((evt: any) => {
    const vs = evt.viewState || evt;
    if (vs && typeof vs.latitude === 'number') {
      setView({ lat: vs.latitude, lng: vs.longitude, zoom: vs.zoom });
    }
  }, []);

  const toggleProjection = useCallback((mode: ProjectionMode) => {
    const map = mapRef.current;
    if (!map || mode === projection) return;
    setMapProjection(map.getMap(), mode);
    setProjection(mode);
    onProjectionChange?.(mode);
  }, [projection, onProjectionChange]);

  const switchBaseStyle = useCallback((next: BaseStyle) => {
    const map = mapRef.current;
    if (!map || next === baseStyle) return;
    setBaseStyle(next);
    const inner = map.getMap();
    if (inner && typeof inner.setStyle === 'function') {
      inner.setStyle(next === 'map' ? VECTOR_STYLE_URL : SATELLITE_STYLE);
    }
  }, [baseStyle]);

  useEffect(() => {
    if (!ready || projection !== 'globe' || isFlying || isInteracting || flyToLocation) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const map = mapRef.current?.getMap();
    if (!map) return;

    phiRef.current = map.getCenter().lng;
    map.jumpTo({ bearing: 0, pitch: 0 });

    const animate = () => {
      phiRef.current += 0.12;
      if (phiRef.current > 180) phiRef.current -= 360;
      map.jumpTo({
        center: [phiRef.current, 0],
        bearing: 0,
        pitch: 0,
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [ready, projection, isFlying, isInteracting]);

  const selectedDeviceRef = useRef(selectedDevice);
  const selectedSiteRef = useRef(selectedSite);
  useEffect(() => { selectedDeviceRef.current = selectedDevice }, [selectedDevice]);
  useEffect(() => { selectedSiteRef.current = selectedSite }, [selectedSite]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready) return;

    const deviceLayerId = 'selected-device-circle';
    const siteLayerId = 'selected-site-circle';

    let phase = 0;
    const animate = () => {
      phase += 0.05;
      const radius = 10 + Math.sin(phase) * 4;
      const opacity = 0.2 + Math.sin(phase) * 0.15;
      if (selectedDeviceRef.current && map.getLayer(deviceLayerId)) {
        map.setPaintProperty(deviceLayerId, 'circle-radius', radius);
        map.setPaintProperty(deviceLayerId, 'circle-opacity', opacity);
      }
      if (selectedSiteRef.current && map.getLayer(siteLayerId)) {
        map.setPaintProperty(siteLayerId, 'circle-radius', radius);
        map.setPaintProperty(siteLayerId, 'circle-opacity', opacity);
      }
      pulseRef.current = requestAnimationFrame(animate);
    };

    pulseRef.current = requestAnimationFrame(animate);
    return () => {
      if (pulseRef.current) {
        cancelAnimationFrame(pulseRef.current);
        pulseRef.current = null;
      }
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready) {
      setTopologyLine(null);
      setDialogPosition(null);
      return;
    }

    if (!selectedSite) {
      setTopologyLine(null);
      setDialogPosition(null);
      return;
    }

    const updatePosition = () => {
      const siteDevices = devices.filter((d) => d.site === selectedSite);
      if (siteDevices.length === 0) {
        setTopologyLine(null);
        setDialogPosition(null);
        return;
      }

      const avgLat = siteDevices.reduce((sum, d) => sum + d.lat, 0) / siteDevices.length;
      const avgLng = siteDevices.reduce((sum, d) => sum + d.lng, 0) / siteDevices.length;

      try {
        const point = map.project([avgLng, avgLat]);
        const container = map.getContainer();
        const rect = container.getBoundingClientRect();
        const dialogWidth = 380;
        const dialogHeight = 320;
        const spacing = 18;

        let dialogX = point.x + spacing;
        let dialogY = point.y - dialogHeight / 2;

        if (dialogX + dialogWidth > rect.width - 12) {
          dialogX = point.x - dialogWidth - spacing;
        }
        if (dialogY < 12) {
          dialogY = 12;
        } else if (dialogY + dialogHeight > rect.height - 12) {
          dialogY = rect.height - dialogHeight - 12;
        }

        const anchorX = dialogX <= point.x ? dialogX + dialogWidth : dialogX;
        const anchorY = dialogY + dialogHeight / 2;

        setTopologyLine({
          x1: point.x,
          y1: point.y,
          x2: anchorX,
          y2: anchorY,
        });
        setDialogPosition({ x: dialogX, y: dialogY });
      } catch {
        // Keep the last known topology position instead of clearing it during transient map errors.
      }
    };

    updatePosition();
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);
    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
    };
  }, [ready, selectedSite, devices]);

  const scaleBar = computeScaleBar(view.zoom, view.lat);
  const onlineCount = devices.filter((d) => d.status === 'online').length;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1 }} className="hud-viewport">
         <Map
           ref={mapRef}
           initialViewState={{ latitude: 0, longitude: 20, zoom: 3 }}
           style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
           mapStyle={VECTOR_STYLE_URL}
           onMove={handleMove}
           onLoad={() => {
             setReady(true);
           }}
           reuseMaps
           attributionControl={false}
         >
          <NavigationControl position="bottom-right" />

          <Source id="devices" type="geojson" data={devicesToGeoJSON(devices)}>
            <Layer
              id="devices-circle"
              type="circle"
              paint={{
                 'circle-radius': [
                   'case',
                   ['==', ['get', 'site'], 'New York DC'],
                   14,
                   8,
                 ],
                 'circle-color': [
                   'case',
                   ['>=', ['get', 'security_score'], 90],
                   '#00ff9d',
                   ['>=', ['get', 'security_score'], 70],
                   '#ff9f43',
                   '#ff4757',
                 ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#0a0a0f',
                'circle-opacity': 0.95,
              }}
            />
          </Source>
          <Source id="hub" type="geojson" data={hubToGeoJSON()}>
            <Layer
              id="hub-symbol"
              type="symbol"
              layout={{
                'text-field': '◆',
                'text-size': 22,
                'text-allow-overlap': true,
                'text-ignore-placement': true,
              }}
              paint={{
                'text-color': '#00d4ff',
                'text-halo-color': '#0a0a0f',
                'text-halo-width': 2,
              }}
            />
          </Source>
            {selectedDevice && (
              <Source id="selected-device" type="geojson" data={{
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [selectedDevice.lng, selectedDevice.lat] },
                  properties: {},
                }],
              }}>
                <Layer
                  id="selected-device-circle"
                  type="circle"
                  paint={{
                    'circle-radius': 12,
                    'circle-color': '#00d4ff',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#0a0a0f',
                    'circle-opacity': 0.3,
                  }}
                />
              </Source>
            )}
            {selectedSite && (
              <Source id="selected-site" type="geojson" data={{
                type: 'FeatureCollection',
                features: devices
                  .filter((d) => d.site === selectedSite)
                  .map((device) => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [device.lng, device.lat] },
                    properties: {},
                  })),
              }}>
                <Layer
                  id="selected-site-circle"
                  type="circle"
                  paint={{
                    'circle-radius': 16,
                    'circle-color': '#00d4ff',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#0a0a0f',
                    'circle-opacity': 0.25,
                  }}
                />
              </Source>
            )}
          </Map>

          {topologyLine && (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
              <line
                x1={topologyLine.x1}
                y1={topologyLine.y1}
                x2={topologyLine.x2}
                y2={topologyLine.y2}
                stroke="rgba(0, 212, 255, 0.6)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <circle cx={topologyLine.x2} cy={topologyLine.y2} r="4" fill="#00d4ff" opacity="0.9" />
            </svg>
          )}

          {selectedSite && dialogPosition && renderTopologyDialog && (
            <div style={{ position: 'absolute', left: dialogPosition.x, top: dialogPosition.y, zIndex: 30, width: 400 }} className={isTopologyExiting ? 'animate-slideOutRight' : 'animate-slideInRight'}>
              <div className="hud-panel border border-cyan-500/40 rounded-lg shadow-[0_0_25px_rgba(0,212,255,0.12)]">
                <div className="px-3 py-2 border-b border-cyan-500/10">
                  <div className="text-[11px] font-bold text-cyan-300 tracking-wider">NETWORK TOPOLOGY</div>
                  <div className="text-[9px] text-gray-400" style={{ fontFamily: 'var(--font-data)' }}>
                    {selectedSite}
                  </div>
                </div>
                <div className="p-2">
                  <svg width="100%" height="220" viewBox="0 0 380 220" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <filter id="glow-dialog">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {renderTopologyDialog('glow-dialog', onTopologyNodeClick, topologyType)}
                  </svg>
                </div>
              </div>
            </div>
          )}

        <div
          className="hud-panel"
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 30,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 6, fontSize: 12, letterSpacing: '0.04em',
          }}
        >
          <span className={`hud-status-dot ${ready ? 'hud-status-dot--live' : ''}`} />
          {devicesError ? 'API OFFLINE' : `${devices.length} DEVICES · ${onlineCount} ONLINE`}
        </div>

        <div style={{ position: 'absolute', bottom: 14, left: 52, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="hud-segmented" role="group" aria-label="View mode">
            <button type="button" className="hud-segment" data-active={projection === 'globe'} onClick={() => toggleProjection('globe')}>3D</button>
            <button type="button" className="hud-segment" data-active={projection === 'mercator'} onClick={() => toggleProjection('mercator')}>2D</button>
            <button type="button" className="hud-segment" data-active={baseStyle === 'map'} onClick={() => switchBaseStyle('map')}>MAP</button>
            <button type="button" className="hud-segment" data-active={baseStyle === 'sat'} onClick={() => switchBaseStyle('sat')}>SAT</button>
          </div>
          <div className="hud-scalebar">
            <div className="hud-scalebar-line" style={{ width: scaleBar.widthPx }} />
            {scaleBar.label}
          </div>
        </div>
      </div>

      <div className="hud-cursorbar">
        <span>CURSOR <b>{cursor ? `${cursor.lat.toFixed(4)}, ${cursor.lng.toFixed(4)}` : '—, —'}</b></span>
        <span>CENTER <b>{view.lat.toFixed(4)}, {view.lng.toFixed(4)}</b></span>
        <span>ZOOM <b>{view.zoom.toFixed(1)}</b></span>
      </div>
    </div>
  );
}
