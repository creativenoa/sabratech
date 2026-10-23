import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pin = color => new L.DivIcon({
  className: '',
  html: `<div style="background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(40,49,94,.45)"></div>`,
  iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -28],
})
const PINS = { company: pin('#1F327A'), individual: pin('#00A5E0') }

export default function MapView({ talents, height = '46vh' }) {
  const withCoords = talents.filter(t => t.lat && t.lng)
  return (
    <div className="overflow-hidden rounded-md border border-navy/15 bg-white">
      <MapContainer center={[33.89, -84.3]} zoom={10} style={{ height, width: '100%' }} scrollWheelZoom={false} className="map-brand">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withCoords.map(t => (
          <Marker key={t.id} position={[t.lat, t.lng]} icon={PINS[t.type] || PINS.individual}>
            <Popup>
              <div style={{ fontFamily: 'Assistant, sans-serif' }}>
                <strong style={{ color: '#28315E' }}>{t.name}</strong><br />
                <span>{t.category}</span><br />
                <Link to={`/individual/${t.id}`}>View profile →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="flex items-center gap-5 border-t border-navy/10 px-4 py-2 text-xs font-semibold text-ink/50">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-cyan" /> Individuals</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-royal" /> Startups</span>
        {withCoords.length === 0 && <span className="ml-auto font-normal">No mapped locations yet — addresses added at enrollment appear here.</span>}
      </div>
    </div>
  )
}
