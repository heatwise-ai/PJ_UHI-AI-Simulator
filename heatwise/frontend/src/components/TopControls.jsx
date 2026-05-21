import { useState, useMemo } from 'react'

function TopControls({
  year,
  month,
  onChangeYear,
  onChangeMonth,
  dongInfo,
  onSelectDong,
}) {
  const [searchInput, setSearchInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const allCodes = useMemo(() => Object.keys(dongInfo), [dongInfo])

  const matched = useMemo(() => {
    if (!searchInput.trim()) return []
    const q = searchInput.trim()
    return allCodes
      .filter((code) => {
        const info = dongInfo[code]
        return info.dongName.includes(q) || info.guName.includes(q)
      })
      .slice(0, 10)
  }, [searchInput, allCodes, dongInfo])

  const handlePick = (code) => {
    onSelectDong(code)
    setSearchInput('')
    setShowDropdown(false)
  }

  return (
    <div className="top-controls">
      <div className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 자치구 또는 동 검색"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        />
        {showDropdown && matched.length > 0 && (
          <div className="search-dropdown">
            {matched.map((code) => (
              <div
                key={code}
                className="search-item"
                onMouseDown={() => handlePick(code)}
              >
                <span className="search-item-name">{dongInfo[code].dongName}</span>
                <span className="search-item-gu">{dongInfo[code].guName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="period-selector">
        <select value={year} onChange={(e) => onChangeYear(parseInt(e.target.value))}>
          {[2020, 2021, 2022, 2023, 2024].map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        <select value={month} onChange={(e) => onChangeMonth(parseInt(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m}월</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default TopControls
