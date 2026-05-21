import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'

const BUDGET_PRESETS = [
  { label: '1천만', value: 10_000_000 },
  { label: '5천만', value: 50_000_000 },
  { label: '1억', value: 100_000_000 },
  { label: '5억', value: 500_000_000 },
  { label: '무제한', value: 0 },
]

const PACKAGE_OPTIONS = [
  { value: '전체', label: '전체' },
  { value: '녹지', label: '녹지' },
  { value: '건축포장', label: '건축·포장' },
  { value: '에너지', label: '에너지' },
  { value: '폭염저감', label: '폭염 저감' },
]

const AREA_PACKAGES = new Set(['전체', '녹지', '건축포장'])

function OptimalCombinationModal({ open, features, selectedDong, year, month, projectArea, onClose, onApply }) {
  const [budget, setBudget] = useState(50_000_000)
  const [budgetInput, setBudgetInput] = useState('')
  const [pkg, setPkg] = useState('전체')
  const [areaInput, setAreaInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setResult(null)
      setError(null)
      setBudgetInput('')
      setAreaInput(projectArea > 0 ? String(projectArea) : '')
    }
  }, [open, projectArea])

  const showAreaInput = AREA_PACKAGES.has(pkg)
  const resolvedArea = parseFloat(areaInput) > 0
    ? parseFloat(areaInput)
    : projectArea > 0 ? projectArea : 10000

  const runOptimize = () => {
    if (!selectedDong) return
    setLoading(true)
    setResult(null)
    setError(null)

    api.optimize({
      adm_cd: selectedDong,
      year: year || 2024,
      month: month || 8,
      budget,
      package: pkg,
      dong_area_m2: showAreaInput ? resolvedArea : undefined,
    })
      .then((res) => {
        setResult(res)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message || '오류 발생')
        setLoading(false)
      })
  }

  const handleBudgetPreset = (val) => {
    setBudget(val)
    setBudgetInput('')
  }

  const handleBudgetInput = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setBudgetInput(raw)
    if (raw) setBudget(parseInt(raw, 10))
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleApply = () => {
    if (!result?.recommended) return
    const finalAdjustments = {}
    result.recommended.forEach((r) => {
      finalAdjustments[r.feature_col] = r.recommended_value
    })
    onApply(finalAdjustments)
    onClose()
  }

  const formatBudget = (v) => {
    if (v === 0) return '무제한'
    if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(0)}억원`
    if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(0)}천만원`
    return `${v.toLocaleString()}원`
  }

  if (!open) return null

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>💰 예산별 최적 조합 추천</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Budget & package inputs */}
        <div className="modal-inputs">
          <div className="modal-input-group">
            <div className="modal-input-label">예산</div>
            <div className="modal-preset-row">
              {BUDGET_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className={`modal-preset-btn ${budget === p.value && !budgetInput ? 'active' : ''}`}
                  onClick={() => handleBudgetPreset(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="modal-budget-input-row">
              <input
                type="text"
                className="modal-budget-input"
                placeholder="직접 입력 (원)"
                value={budgetInput}
                onChange={handleBudgetInput}
              />
              <span className="modal-budget-unit">원</span>
            </div>
            <div className="modal-budget-display">선택: {formatBudget(budget)}</div>
          </div>

          <div className="modal-input-group">
            <div className="modal-input-label">패키지</div>
            <div className="modal-preset-row">
              {PACKAGE_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  className={`modal-preset-btn ${pkg === p.value ? 'active' : ''}`}
                  onClick={() => setPkg(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {showAreaInput && (
            <div className="modal-input-group">
              <div className="modal-input-label">사업 시행 면적 (녹지·반사율 비용 계산용)</div>
              <div className="modal-budget-input-row">
                <input
                  type="number"
                  className="modal-budget-input"
                  placeholder={`미입력 시 ${(resolvedArea).toLocaleString()}㎡ 기본 적용`}
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value.replace(/[^0-9]/g, ''))}
                  min="0"
                />
                <span className="modal-budget-unit">㎡</span>
              </div>
            </div>
          )}

          <button
            className="modal-run-btn"
            onClick={runOptimize}
            disabled={loading || !selectedDong}
          >
            {loading ? '탐색 중...' : '최적 조합 탐색'}
          </button>
        </div>

        {/* Results */}
        {loading && (
          <div className="modal-loading">
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p>예산 내 최적 조합 탐색 중...</p>
          </div>
        )}

        {error && (
          <div className="modal-error">{error}</div>
        )}

        {result && !loading && (
          <>
            <div className="modal-summary">
              <div className="modal-summary-label">예상 효과</div>
              <div className="modal-summary-value">
                <span className="big-temp">{Math.abs(result.expected_delta_T).toFixed(1)}°C</span>
                {' '}저감 기대
              </div>
              <div className="modal-summary-sub">
                사용 예산: {result.used_budget.toLocaleString()}원
                {result.input_budget > 0 && ` / ${result.input_budget.toLocaleString()}원`}
              </div>
            </div>

            {result.recommended?.length === 0 ? (
              <div className="modal-empty">
                <p>예산 내 추천 조합을 찾지 못했습니다.</p>
                <p className="empty-sub">예산을 늘리거나 패키지를 변경해 보세요.</p>
              </div>
            ) : (
              <div className="modal-steps">
                <div className="modal-steps-title">추천 변수 조정</div>
                {result.recommended.map((r, i) => (
                  <div key={r.feature_col} className="modal-step">
                    <div className="step-number">{i + 1}</div>
                    <div className="step-content">
                      <div className="step-row">
                        <span className="step-name">{r.feature_label}</span>
                        <span className="step-impact">
                          {r.delta > 0 ? '+' : ''}{r.delta.toFixed ? r.delta.toFixed(2) : r.delta}
                        </span>
                      </div>
                      <div className="step-detail">
                        {r.current_value} → {r.recommended_value}
                        {r.cost > 0 ? ` · ${r.cost.toLocaleString()}원` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.recommended?.length > 0 && (
              <div className="modal-footer">
                <button className="modal-btn modal-btn-secondary" onClick={onClose}>닫기</button>
                <button className="modal-btn modal-btn-primary" onClick={handleApply}>
                  이 조합 적용하기
                </button>
              </div>
            )}
          </>
        )}

        {!result && !loading && !error && (
          <div className="modal-empty">
            <p>예산과 패키지를 선택한 후 탐색을 시작하세요.</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default OptimalCombinationModal
