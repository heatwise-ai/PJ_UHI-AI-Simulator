function PolicySlider({ variable, currentValue, adjustedValue, onChange }) {
  const baseline = currentValue != null ? currentValue : (variable.safeLow + variable.safeHigh) / 2
  const value = adjustedValue != null ? adjustedValue : baseline
  const delta = value - baseline

  const min = variable.safeLow
  const max = variable.safeHigh
  const range = max - min || 1

  const basePct = Math.max(0, Math.min(100, ((baseline - min) / range) * 100))
  const thumbPct = Math.max(0, Math.min(100, ((value - min) / range) * 100))

  const trackGradient =
    variable.direction === 'increase'
      ? 'linear-gradient(to right, #fca5a5, #fde047, #86efac)'
      : 'linear-gradient(to right, #86efac, #fde047, #fca5a5)'

  const deltaSign =
    delta < 0 ? (variable.direction === 'decrease' ? 'good' : 'bad')
    : delta > 0 ? (variable.direction === 'increase' ? 'good' : 'bad')
    : 'none'

  const changed = Math.abs(delta) >= variable.step / 2

  const handleChange = (e) => onChange(parseFloat(e.target.value))

  const formatValue = (v) => {
    if (v == null) return '-'
    if (variable.step >= 1) return Math.round(v).toLocaleString()
    return v.toFixed(2)
  }

  const formatDelta = (d) => {
    const sign = d > 0 ? '+' : ''
    if (variable.step >= 1) return `${sign}${Math.round(d).toLocaleString()}`
    return `${sign}${d.toFixed(2)}`
  }

  const unitStr = variable.unit || ''

  return (
    <div className="policy-slider">
      <div className="slider-header">
        <span className="slider-label">
          {variable.label}
          {variable.description && (
            <span className="slider-info" title={variable.description}>ⓘ</span>
          )}
        </span>
        <span className="slider-current-wrap">
          <span className="slider-current-val">현재 {formatValue(baseline)}{unitStr}</span>
          {changed && (
            <span className={`slider-delta-badge ${deltaSign}`}>
              {formatDelta(delta)}{unitStr}
            </span>
          )}
        </span>
      </div>

      <div className="slider-track-wrap">
        <div className="slider-color-track" style={{ background: trackGradient }} />
        <div
          className="slider-baseline-marker"
          style={{ left: `${basePct}%` }}
          title={`현재값: ${formatValue(baseline)}${unitStr}`}
        />
        {changed && (
          <div className="slider-thumb-label" style={{ left: `${thumbPct}%` }}>
            {formatValue(value)}
          </div>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={variable.step}
          value={value}
          onChange={handleChange}
          className="slider-input"
        />
      </div>

      <div className="slider-footer">
        <span className="slider-range">
          조정범위: {formatValue(min)} ~ {formatValue(max)}
          {unitStr ? ` · 단위: ${variable.step}${unitStr}` : ''}
        </span>
      </div>
    </div>
  )
}

export default PolicySlider
