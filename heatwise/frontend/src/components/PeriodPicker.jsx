import { useState, useRef, useEffect } from 'react'

function PeriodPicker({ year, month, onChangeYear, onChangeMonth }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="period-picker" ref={ref}>
      <button
        className="period-picker-trigger"
        onClick={() => setOpen(!open)}
      >
        <span>{year}년 {month}월</span>
        <span className="period-picker-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="period-picker-popup">
          <div className="period-picker-section">
            <div className="period-picker-label">연도</div>
            <div className="period-picker-grid">
              {[2020, 2021, 2022, 2023, 2024].map((y) => (
                <button
                  key={y}
                  className={`period-picker-cell ${y === year ? 'active' : ''}`}
                  onClick={() => onChangeYear(y)}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div className="period-picker-section">
            <div className="period-picker-label">월</div>
            <div className="period-picker-grid grid-month">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <button
                  key={m}
                  className={`period-picker-cell ${m === month ? 'active' : ''}`}
                  onClick={() => onChangeMonth(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PeriodPicker
