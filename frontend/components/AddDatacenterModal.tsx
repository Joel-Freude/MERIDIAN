'use client'

import { useState, useEffect } from 'react'
import Map, { Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

const VECTOR_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001'

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Eritrea', 'Estonia', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'São Tomé and Príncipe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen',
  'Zambia', 'Zimbabwe',
]

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Afghanistan: { lat: 33.9391, lng: 67.7100 },
  Albania: { lat: 41.1533, lng: 20.1683 },
  Algeria: { lat: 28.0339, lng: 1.6596 },
  Andorra: { lat: 42.5063, lng: 1.5218 },
  Angola: { lat: -11.2027, lng: 17.8739 },
  Argentina: { lat: -38.4161, lng: -63.6167 },
  Armenia: { lat: 40.0691, lng: 45.0382 },
  Australia: { lat: -25.2744, lng: 133.7751 },
  Austria: { lat: 47.5162, lng: 14.5501 },
  Azerbaijan: { lat: 40.1431, lng: 47.5769 },
  Bahamas: { lat: 25.0343, lng: -77.3963 },
  Bangladesh: { lat: 23.6850, lng: 90.3563 },
  Barbados: { lat: 13.1939, lng: -59.5432 },
  Belarus: { lat: 53.7098, lng: 27.9534 },
  Belgium: { lat: 50.5039, lng: 4.4699 },
  Belize: { lat: 17.1899, lng: -88.4976 },
  Benin: { lat: 9.3077, lng: 2.3158 },
  Bhutan: { lat: 27.5142, lng: 90.4336 },
  Bolivia: { lat: -16.2902, lng: -63.5887 },
  'Bosnia and Herzegovina': { lat: 43.9159, lng: 17.6791 },
  Botswana: { lat: -22.3285, lng: 24.6849 },
  Brazil: { lat: -14.2350, lng: -51.9253 },
  Brunei: { lat: 4.5353, lng: 114.7277 },
  Bulgaria: { lat: 42.7339, lng: 25.4858 },
  'Burkina Faso': { lat: 12.2383, lng: -1.5616 },
  Burundi: { lat: -3.3731, lng: 29.9189 },
  Cambodia: { lat: 12.5657, lng: 104.9910 },
  Cameroon: { lat: 7.3697, lng: 12.3547 },
  Canada: { lat: 56.1304, lng: -106.3468 },
  'Cape Verde': { lat: 16.5388, lng: -23.0418 },
  'Central African Republic': { lat: 6.6111, lng: 20.9394 },
  Chad: { lat: 15.4542, lng: 18.7322 },
  Chile: { lat: -35.6751, lng: -71.5430 },
  China: { lat: 35.8617, lng: 104.1954 },
  Colombia: { lat: 4.5709, lng: -74.2973 },
  Comoros: { lat: -11.6455, lng: 43.3333 },
  Congo: { lat: -0.2280, lng: 15.8277 },
  'Costa Rica': { lat: 9.7489, lng: -83.7534 },
  Croatia: { lat: 45.1000, lng: 15.2000 },
  Cuba: { lat: 21.5218, lng: -77.7812 },
  Cyprus: { lat: 35.1264, lng: 33.4299 },
  'Czech Republic': { lat: 49.7951, lng: 15.1919 },
  Denmark: { lat: 56.2639, lng: 9.5018 },
  Djibouti: { lat: 11.8251, lng: 42.5903 },
  Dominica: { lat: 15.4150, lng: -61.3710 },
  'Dominican Republic': { lat: 18.7357, lng: -70.1627 },
  Ecuador: { lat: -1.8312, lng: -78.1834 },
  Egypt: { lat: 26.8206, lng: 30.8025 },
  'El Salvador': { lat: 13.7942, lng: -88.8965 },
  Eritrea: { lat: 15.1794, lng: 39.7823 },
  Estonia: { lat: 58.5953, lng: 25.0136 },
  Ethiopia: { lat: 9.1450, lng: 40.4897 },
  Fiji: { lat: -17.7134, lng: 178.0650 },
  Finland: { lat: 61.9241, lng: 25.7482 },
  France: { lat: 46.2276, lng: 2.2137 },
  Gabon: { lat: -0.8037, lng: 11.6094 },
  Gambia: { lat: 13.4432, lng: -15.3101 },
  Georgia: { lat: 42.3154, lng: 43.3569 },
  Germany: { lat: 51.1657, lng: 10.4515 },
  Ghana: { lat: 7.9465, lng: -1.0232 },
  Greece: { lat: 39.0742, lng: 21.8243 },
  Grenada: { lat: 12.1165, lng: -61.6790 },
  Guatemala: { lat: 15.7835, lng: -90.2308 },
  Guinea: { lat: 9.9456, lng: -9.6966 },
  'Guinea-Bissau': { lat: 11.8037, lng: -15.1804 },
  Guyana: { lat: 4.8604, lng: -58.9302 },
  Haiti: { lat: 18.9712, lng: -72.2852 },
  Honduras: { lat: 15.2000, lng: -86.2419 },
  Hungary: { lat: 47.1625, lng: 19.5033 },
  Iceland: { lat: 64.9631, lng: -19.0208 },
  India: { lat: 20.5937, lng: 78.9629 },
  Indonesia: { lat: -0.7893, lng: 113.9213 },
  Iran: { lat: 32.4279, lng: 53.6880 },
  Iraq: { lat: 33.2232, lng: 43.6793 },
  Ireland: { lat: 53.1424, lng: -7.6921 },
  Israel: { lat: 31.0461, lng: 34.8516 },
  Italy: { lat: 41.8719, lng: 12.5674 },
  Jamaica: { lat: 18.1096, lng: -77.2975 },
  Japan: { lat: 36.2048, lng: 138.2529 },
  Jordan: { lat: 30.5852, lng: 36.2384 },
  Kazakhstan: { lat: 48.0196, lng: 66.9237 },
  Kenya: { lat: -0.0236, lng: 37.9062 },
  Kiribati: { lat: -3.3704, lng: -168.7340 },
  Kuwait: { lat: 29.3117, lng: 47.4818 },
  Kyrgyzstan: { lat: 41.2044, lng: 74.7661 },
  Laos: { lat: 19.8563, lng: 102.4955 },
  Latvia: { lat: 56.8796, lng: 24.6032 },
  Lebanon: { lat: 33.8547, lng: 35.8623 },
  Lesotho: { lat: -29.6100, lng: 28.2336 },
  Liberia: { lat: 6.4281, lng: -9.4295 },
  Libya: { lat: 26.3351, lng: 17.2283 },
  Liechtenstein: { lat: 47.1660, lng: 9.5554 },
  Lithuania: { lat: 55.1694, lng: 23.8813 },
  Luxembourg: { lat: 49.8153, lng: 6.1296 },
  Madagascar: { lat: -18.7669, lng: 46.8691 },
  Malawi: { lat: -13.2543, lng: 34.3015 },
  Malaysia: { lat: 4.2105, lng: 101.9758 },
  Maldives: { lat: 3.2028, lng: 73.2207 },
  Mali: { lat: 17.5707, lng: -3.9962 },
  Malta: { lat: 35.9375, lng: 14.3754 },
  'Marshall Islands': { lat: 7.1315, lng: 171.1845 },
  Mauritania: { lat: 21.0079, lng: -10.9408 },
  Mauritius: { lat: -20.3484, lng: 57.5522 },
  Mexico: { lat: 23.6345, lng: -102.5528 },
  Micronesia: { lat: 7.4256, lng: 150.5508 },
  Moldova: { lat: 47.4116, lng: 28.3699 },
  Monaco: { lat: 43.7384, lng: 7.4246 },
  Mongolia: { lat: 46.8625, lng: 103.8467 },
  Montenegro: { lat: 42.7087, lng: 19.3744 },
  Morocco: { lat: 31.7917, lng: -7.0926 },
  Mozambique: { lat: -18.6657, lng: 35.5296 },
  Myanmar: { lat: 21.9162, lng: 95.9560 },
  Namibia: { lat: -22.9576, lng: 18.4904 },
  Nauru: { lat: -0.5228, lng: 166.9315 },
  Nepal: { lat: 28.3949, lng: 84.1240 },
  Netherlands: { lat: 52.1326, lng: 5.2913 },
  'New Zealand': { lat: -40.9006, lng: 174.8860 },
  Nicaragua: { lat: 12.8654, lng: -85.2072 },
  Niger: { lat: 17.6078, lng: 8.0817 },
  Nigeria: { lat: 9.0820, lng: 8.6753 },
  'North Korea': { lat: 40.3399, lng: 127.5101 },
  'North Macedonia': { lat: 41.5126, lng: 21.7453 },
  Norway: { lat: 60.4720, lng: 8.4689 },
  Oman: { lat: 21.5126, lng: 55.9233 },
  Pakistan: { lat: 30.3753, lng: 69.3451 },
  Palau: { lat: 7.5150, lng: 134.5825 },
  Palestine: { lat: 31.9522, lng: 35.2332 },
  Panama: { lat: 8.5380, lng: -80.7821 },
  'Papua New Guinea': { lat: -6.3150, lng: 143.9555 },
  Paraguay: { lat: -23.4425, lng: -58.4438 },
  Peru: { lat: -9.1900, lng: -75.0152 },
  Philippines: { lat: 12.8797, lng: 121.7740 },
  Poland: { lat: 51.9194, lng: 19.1451 },
  Portugal: { lat: 39.3999, lng: -8.2245 },
  Qatar: { lat: 25.3548, lng: 51.1839 },
  Romania: { lat: 45.9432, lng: 24.9668 },
  Russia: { lat: 61.5240, lng: 105.3188 },
  Rwanda: { lat: -1.9403, lng: 29.8739 },
  'Saint Kitts and Nevis': { lat: 17.3578, lng: -62.7830 },
  'Saint Lucia': { lat: 13.9094, lng: -60.9789 },
  'Saint Vincent and the Grenadines': { lat: 12.9843, lng: -61.2872 },
  Samoa: { lat: -13.7590, lng: -172.1046 },
  'San Marino': { lat: 43.9424, lng: 12.4578 },
  'São Tomé and Príncipe': { lat: 0.1864, lng: 6.6131 },
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
  Senegal: { lat: 14.4974, lng: -14.4524 },
  Serbia: { lat: 44.0165, lng: 21.0059 },
  Seychelles: { lat: -4.6796, lng: 55.4920 },
  'Sierra Leone': { lat: 8.4606, lng: -11.7799 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  Slovakia: { lat: 48.6690, lng: 19.6990 },
  Slovenia: { lat: 46.1512, lng: 14.9955 },
  'Solomon Islands': { lat: -9.6457, lng: 160.1562 },
  Somalia: { lat: 5.1521, lng: 46.1996 },
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  'South Korea': { lat: 35.9078, lng: 127.7669 },
  'South Sudan': { lat: 6.8770, lng: 31.3070 },
  Spain: { lat: 40.4637, lng: -3.7492 },
  'Sri Lanka': { lat: 7.8731, lng: 80.7718 },
  Sudan: { lat: 12.8628, lng: 30.2176 },
  Suriname: { lat: 3.9193, lng: -56.0278 },
  Sweden: { lat: 60.1282, lng: 18.6435 },
  Switzerland: { lat: 46.8182, lng: 8.2275 },
  Syria: { lat: 34.8021, lng: 38.9968 },
  Taiwan: { lat: 23.6978, lng: 120.9605 },
  Tajikistan: { lat: 38.8610, lng: 71.2761 },
  Tanzania: { lat: -6.3690, lng: 34.8888 },
  Thailand: { lat: 15.8700, lng: 100.9925 },
  Togo: { lat: 8.6195, lng: 0.8248 },
  Tonga: { lat: -21.1790, lng: -175.1982 },
  'Trinidad and Tobago': { lat: 10.6918, lng: -61.2225 },
  Tunisia: { lat: 33.8869, lng: 9.5375 },
  Turkey: { lat: 38.9637, lng: 35.2433 },
  Turkmenistan: { lat: 38.9697, lng: 59.5563 },
  Tuvalu: { lat: -7.1095, lng: 177.6493 },
  Uganda: { lat: 1.3733, lng: 32.2903 },
  Ukraine: { lat: 48.3794, lng: 31.1656 },
  'United Arab Emirates': { lat: 23.4241, lng: 53.8478 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },
  'United States': { lat: 37.0902, lng: -95.7129 },
  Uruguay: { lat: -32.5228, lng: -55.7658 },
  Uzbekistan: { lat: 41.3775, lng: 64.5853 },
  Vanuatu: { lat: -15.3767, lng: 166.9592 },
  'Vatican City': { lat: 41.9029, lng: 12.4534 },
  Venezuela: { lat: 6.4238, lng: -66.5897 },
  Vietnam: { lat: 14.0583, lng: 108.2772 },
  Yemen: { lat: 15.5527, lng: 48.5164 },
  Zambia: { lat: -13.1339, lng: 27.8493 },
  Zimbabwe: { lat: -19.0154, lng: 29.1549 },
}

interface DatacenterForm {
  name: string
  site: string
  lat: string
  lng: string
}

interface AddDatacenterModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (device: {
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
  }) => void
}

export default function AddDatacenterModal({ isOpen, onClose, onAdd }: AddDatacenterModalProps) {
  const [form, setForm] = useState<DatacenterForm>({
    name: '',
    site: '',
    lat: '',
    lng: '',
  })
  const [mapReady, setMapReady] = useState(false)
  const [mapView, setMapView] = useState<{ lat: number; lng: number; zoom: number }>({ lat: 20, lng: 0, zoom: 10 })
  const [isGeocoding, setIsGeocoding] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => setMapReady(true), 10)
    return () => {
      clearTimeout(timer)
      setMapReady(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!form.site) return
    setIsGeocoding(true)

    const fallback = COUNTRY_COORDINATES[form.site]
    if (!fallback) {
      setIsGeocoding(false)
      return
    }

    const controller = new AbortController()
    fetch(`${API_URL}/api/geocode?q=${encodeURIComponent(form.site)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        const feature = data?.features?.[0]
        const coords = feature?.geometry?.coordinates
        if (coords && Array.isArray(coords) && coords.length >= 2) {
          const lng = Number(coords[0])
          const lat = Number(coords[1])
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setMapView({ lat, lng, zoom: 10 })
            setForm((prev) => ({ ...prev, lat: String(lat), lng: String(lng) }))
            return
          }
        }
        setMapView({ lat: fallback.lat, lng: fallback.lng, zoom: 10 })
        setForm((prev) => ({ ...prev, lat: String(fallback.lat), lng: String(fallback.lng) }))
      })
      .catch(() => {
        setMapView({ lat: fallback.lat, lng: fallback.lng, zoom: 10 })
        setForm((prev) => ({ ...prev, lat: String(fallback.lat), lng: String(fallback.lng) }))
      })
      .finally(() => setIsGeocoding(false))

    return () => controller.abort()
  }, [form.site])

  if (!isOpen) return null

  const latNum = parseFloat(form.lat)
  const lngNum = parseFloat(form.lng)
  const hasValidCoords = Number.isFinite(latNum) && Number.isFinite(lngNum)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newDevice = {
      id: `dev-${Date.now()}`,
      hostname: form.name || `device-${Date.now()}`,
      ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`,
      vendor: 'Unknown',
      model: 'Unknown',
      site: form.site,
      lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0,
      status: 'online' as const,
      security_score: 100,
      last_vulnerability_scan: null,
      compliance_status: 'pending' as const,
      firmware_version: 'unknown',
      last_config_change: null,
      active_sessions: 0,
      failed_logins: 0,
      security_zone: 'trusted' as const,
    }
    onAdd(newDevice)
    setForm({ name: '', site: '', lat: '', lng: '' })
    onClose()
  }

  const handleMapClick = (evt: any) => {
    const { lng, lat } = evt.lngLat
    setForm((prev) => ({ ...prev, lat: String(lat), lng: String(lng) }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative hud-panel border border-cyan-500/30 rounded-lg overflow-hidden w-[80vw] h-[80vh] max-w-[95vw] max-h-[120vh]">
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/10">
          <h2 className="text-lg font-semibold text-cyan-300" style={{ fontFamily: 'var(--font-data)' }}>
            ADD DATACENTER
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 w-[50%] h-[50vh]">
            <div className="flex flex-col gap-1 pt-40">
              <label className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-data)' }}>
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-cyan-500/5 border border-cyan-500/20 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500/50"
                style={{ fontFamily: 'var(--font-data)' }}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-data)' }}>
                Site
              </label>
              <select
                value={form.site}
                onChange={(e) => setForm({ ...form, site: e.target.value })}
                className="hud-select w-full"
                style={{ fontFamily: 'var(--font-data)' }}
                required
              >
                <option value="">Select a country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-data)' }}>
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="bg-cyan-500/5 border border-cyan-500/20 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500/50"
                  style={{ fontFamily: 'var(--font-data)' }}
                  required
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-data)' }}>
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="bg-cyan-500/5 border border-cyan-500/20 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500/50"
                  style={{ fontFamily: 'var(--font-data)' }}
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 mt-auto pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded border border-cyan-500/20 text-gray-300 hover:bg-cyan-500/10 transition-colors text-sm"
                style={{ fontFamily: 'var(--font-data)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-colors text-sm"
                style={{ fontFamily: 'var(--font-data)' }}
              >
                Add
              </button>
            </div>
          </form>
          <div className="w-[50%] h-[75vh] border-l border-cyan-500/10 relative">
            {mapReady ? (
              <Map
                initialViewState={{ latitude: mapView.lat, longitude: mapView.lng, zoom: mapView.zoom }}
                style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
                mapStyle={VECTOR_STYLE_URL}
                reuseMaps
                cursor="crosshair"
                onClick={handleMapClick}
                attributionControl={false}
              >
                {hasValidCoords && (
                  <Source id="marker" type="geojson" data={{
                    type: 'FeatureCollection',
                    features: [{
                      type: 'Feature',
                      geometry: { type: 'Point', coordinates: [lngNum, latNum] },
                      properties: {}
                    }]
                  }}>
                    <Layer
                      id="marker-circle"
                      type="circle"
                      paint={{
                        'circle-radius': 8,
                        'circle-color': '#00d4ff',
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#0a0a0f',
                      }}
                    />
                  </Source>
                )}
              </Map>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-500" style={{ fontFamily: 'var(--font-data)' }}>
                Loading map...
              </div>
            )}
            <div className="absolute bottom-3 left-3 text-[10px] text-gray-500 bg-black/50 px-2 py-1 rounded" style={{ fontFamily: 'var(--font-data)' }}>
              Click map to pick coordinates
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
