import { MapContainer, TileLayer, GeoJSON, ZoomControl } from 'react-leaflet'
import { useEffect, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { lstToColor } from '../utils/colorScale'
import { getMatchKey, getGuName, getDongName, isSeoul } from '../utils/dongMapping'

function MapView({ selectedDong, onSelectDong, lstByDong, lstRange }) {
  const [geoData, setGeoData] = useState(null)

  useEffect(() => {
    fetch('/data/seoul_dong.geojson')
      .then((res) => res.json())
      .then((data) => {
        const seoulOnly = {
          ...data,
          features: data.features.filter(isSeoul),
        }
        setGeoData(seoulOnly)
      })
      .catch((err) => console.error('GeoJSON 로딩 실패:', err))
  }, [])

  const getStyle = (feature) => {
    const matchKey = getMatchKey(feature)
    const isSelected = selectedDong === matchKey
    const lstValue = matchKey ? lstByDong[matchKey] : null
    const hasData = lstValue != null

    return {
      color: isSelected ? '#1565c0' : '#222',
      weight: isSelected ? 5 : 1.2,
      fillColor: hasData ? lstToColor(lstValue, lstRange?.min, lstRange?.max) : '#cccccc',
      fillOpacity: isSelected ? 0.92 : 0.7,
      dashArray: isSelected ? '' : null,
    }
  }

  const onEachFeature = (feature, layer) => {
    const matchKey = getMatchKey(feature)
    const guName = getGuName(feature)
    const dongName = getDongName(feature)
    const lstValue = matchKey ? lstByDong[matchKey] : null

    layer.on({
      click: () => {
        if (matchKey) onSelectDong(matchKey)
      },
      mouseover: (e) => {
        e.target.setStyle({ weight: 3, fillOpacity: 0.88 })
      },
      mouseout: (e) => {
        e.target.setStyle({
          weight: selectedDong === matchKey ? 5 : 1.2,
          fillOpacity: selectedDong === matchKey ? 0.92 : 0.7,
        })
      },
    })

    const displayName = `${guName} ${dongName}`
    const tooltipText = lstValue != null
      ? `${displayName}: ${lstValue.toFixed(1)}°C`
      : `${displayName}: 데이터 없음`
    layer.bindTooltip(tooltipText, { sticky: true })
  }

  return (
    <MapContainer
      center={[37.5665, 126.9780]}
      zoom={12}
      minZoom={11}
      maxZoom={16}
      maxBounds={[[37.40, 126.75], [37.72, 127.20]]}
      maxBoundsViscosity={1.0}
      zoomControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {geoData && (
        <GeoJSON
          key={`${selectedDong}-${Object.keys(lstByDong).length}-${lstRange?.min}-${lstRange?.max}`}
          data={geoData}
          style={getStyle}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  )
}

export default MapView
