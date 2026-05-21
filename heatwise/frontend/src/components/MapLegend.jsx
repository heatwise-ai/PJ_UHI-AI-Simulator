function MapLegend({ lstRange, year, month }) {
    const min = lstRange?.min ?? 15
    const max = lstRange?.max ?? 35

    const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const v = min + (max - min) * t
      return `${v.toFixed(1)}°C`
    })

    return (
      <div className="map-legend">
        <div className="legend-header">
          <span className="legend-title">지표면 온도 (LST)</span>
          {year && month && (
            <span className="legend-period">{year}.{String(month).padStart(2, '0')}</span>
          )}
        </div>
        <div className="legend-bar" />
        <div className="legend-labels">
          {stops.map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
        <div className="legend-note">데이터 없음 = 회색</div>
      </div>
    )
  }

  export default MapLegend
