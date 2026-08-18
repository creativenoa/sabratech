import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'

const icon = new L.DivIcon({
  className: '',
  html: '<div style="background:#1F327A;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
  iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30],
})

export default function MapView({ businesses }) {
  const withCoords = businesses.filter(b => b.lat && b.lng)
  return (
    <div className="overflow-hidden rounded-md border border-navy/15">
      {withCoords.length === 0 && (
        <div className="border-b border-navy/10 bg-white p-4 text-center text-sm font-semibold text-ink/60">
          עדיין אין עסקים עם כתובת על המפה — בעלות עסקים מוזמנות לעדכן כתובת דרך טופס ההצטרפות
        </div>
      )}
      <MapContainer center={[33.95, -84.25]} zoom={10} style={{ height: '65vh', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withCoords.map(b => (
          <Marker key={b.id} position={[b.lat, b.lng]} icon={icon}>
            <Popup>
              <div style={{ direction: 'rtl', textAlign: 'right', fontFamily: 'Heebo' }}>
                <strong>{b.name}</strong><br />
                <span>{b.category}</span><br />
                <Link to={`/business/${b.id}`}>לדף העסק ←</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
