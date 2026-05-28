import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { POLICY_VARIABLES, PACKAGES } from '../utils/policyMeta'

const AREA_PACKAGES = new Set(['green', 'surface'])

function calcCostNum(variable, delta, area) {
  if (Math.abs(delta ?? 0) < 1e-9) return { cost: 0, needsArea: false }
  if (variable.appliesToArea && variable.costPerArea != null) {
    if (!area || area <= 0) return { cost: 0, needsArea: true }
    return { cost: Math.round(area * variable.costPerArea * Math.abs(delta)), needsArea: false }
  }
  if (variable.costPerStep != null) {
    return { cost: Math.round((Math.abs(delta) / variable.step) * variable.costPerStep), needsArea: false }
  }
  return { cost: 0, needsArea: false }
}

function formatCostShort(cost) {
  if (!cost || cost <= 0) return '—'
  if (cost < 1e8) return `${(cost / 1e6).toFixed(0)}백만원`
  return `${(cost / 1e8).toFixed(1)}억원`
}

export default function BudgetScenarioModal({ open, onClose, onApply, features, adjustments, projectArea, deltaLST }) {
  const [budgetRaw, setBudgetRaw] = useState('')
  const [activePackage, setActivePackage] = useState('green')
  const [localAdj, setLocalAdj] = useState({})
  const [areaRaw, setAreaRaw] = useState('')

  useEffect(() => {
    if (!open) return
    setBudgetRaw('')
    setAreaRaw(projectArea > 0 ? String(projectArea) : '')
    const init = {}
    POLICY_VARIABLES.forEach((v) => {
      const cur = features?.[v.key]
      const adj = adjustments?.[v.key]
      if (adj != null && cur != null && Math.abs(adj - cur) > 1e-9) {
        init[v.key] = adj
      }
    })
    setLocalAdj(init)
  }, [open])

  const budget = parseInt(budgetRaw.replace(/,/g, ''), 10) || 0
  const area = parseFloat(areaRaw) || 0

  const baseline = (v) => features?.[v.key] ?? (v.safeLow + v.safeHigh) / 2
  const adjValue = (v) => localAdj[v.key] ?? baseline(v)

  const allCosts = useMemo(() => {
    const map = {}
    POLICY_VARIABLES.forEach((v) => {
      const delta = adjValue(v) - baseline(v)
      map[v.key] = calcCostNum(v, delta, area)
    })
    return map
  }, [localAdj, features, area])

  const totalCost = Object.values(allCosts).reduce((s, { cost }) => s + cost, 0)
  const remaining = budget - totalCost
  const overBudget = budget > 0 && totalCost > budget
  const usagePct = budget > 0 ? (totalCost / budget) * 100 : 0
  const barPct = Math.min(usagePct, 100)
  const barClass = overBudget ? 'over' : usagePct > 80 ? 'warning' : 'ok'

  const handleApply = () => {
    const result = {}
    POLICY_VARIABLES.forEach((v) => {
      const base = features?.[v.key]
      const val = localAdj[v.key]
      if (val != null && base != null && Math.abs(val - base) > v.step * 0.01) {
        result[v.key] = val
      }
    })
    onApply?.(result)
    onClose()
  }

  const handleBudgetChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setBudgetRaw(raw ? parseInt(raw, 10).toLocaleString() : '')
  }

  const handleSliderChange = (key, val) => {
    setLocalAdj((prev) => ({ ...prev, [key]: val }))
  }

  const showAreaInput = AREA_PACKAGES.has(activePackage)
  const variablesInPackage = POLICY_VARIABLES.filter((v) => v.package === activePackage)

  // Breakdown grouped by package
  const pkgCosts = PACKAGES.map((pkg) => {
    const vars = POLICY_VARIABLES.filter((v) => v.package === pkg.id)
    const rows = vars.map((v) => ({
      v,
      delta: adjValue(v) - baseline(v),
      ...allCosts[v.key],
    })).filter((r) => r.cost > 0)
    const pkgTotal = rows.reduce((s, r) => s + r.cost, 0)
    return { pkg, rows, pkgTotal }
  }).filter((g) => g.pkgTotal > 0)

  if (!open) return null

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card budget-modal-card">
        <div className="modal-header">
          <h3>💰 사업비 기반 시나리오</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* 총 예산 입력 */}
        <div className="budget-input-section">
          <div className="modal-input-label">총 예산</div>
          <div className="modal-budget-input-row">
            <input
              type="text"
              className="modal-budget-input"
              placeholder="예: 500,000,000"
              value={budgetRaw}
              onChange={handleBudgetChange}
              inputMode="numeric"
            />
            <span className="modal-budget-unit">원</span>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="budget-summary-grid">
          <div className="budget-summary-cell">
            <div className="budget-summary-label">예상 소요 비용</div>
            <div className={`budget-summary-value${overBudget ? ' budget-warm' : ''}`}>
              {totalCost > 0 ? totalCost.toLocaleString() + '원' : '—'}
            </div>
          </div>
          {budget > 0 && (
            <div className="budget-summary-cell">
              <div className="budget-summary-label">남은 예산</div>
              <div className={`budget-summary-value${overBudget ? ' budget-warm' : ' budget-cool'}`}>
                {overBudget
                  ? `초과 ${Math.abs(remaining).toLocaleString()}원`
                  : `${remaining.toLocaleString()}원`}
              </div>
            </div>
          )}
        </div>

        {/* 예산 사용률 */}
        {budget > 0 && (
          <div className="budget-usage-wrap">
            <div className="budget-usage-header">
              <span>예산 사용률</span>
              <span className={overBudget ? 'budget-warm' : ''}>
                {barPct.toFixed(1)}%{overBudget ? ' ⚠ 초과' : ''}
              </span>
            </div>
            <div className="budget-bar-track">
              <div className={`budget-bar-fill ${barClass}`} style={{ width: `${barPct}%` }} />
            </div>
          </div>
        )}

        <div className="budget-divider" />

        {/* 패키지 탭 */}
        <div className="package-tabs">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              className={`package-tab${activePackage === pkg.id ? ' active' : ''}`}
              onClick={() => setActivePackage(pkg.id)}
            >
              {pkg.label}
            </button>
          ))}
        </div>

        {/* 면적 입력 */}
        {showAreaInput && (
          <div className="budget-area-row">
            <span className="budget-area-label">사업 면적</span>
            <div className="modal-budget-input-row" style={{ flex: 1 }}>
              <input
                type="number"
                className="modal-budget-input"
                placeholder="미입력 시 비용 계산 제외"
                value={areaRaw}
                onChange={(e) => setAreaRaw(e.target.value.replace(/[^0-9.]/g, ''))}
                min="0"
              />
              <span className="modal-budget-unit">㎡</span>
            </div>
          </div>
        )}

        {/* 변수별 슬라이더 */}
        <div className="budget-sliders">
          {variablesInPackage.map((v) => {
            const base = baseline(v)
            const val = adjValue(v)
            const delta = val - base
            const { cost, needsArea } = allCosts[v.key]
            const changed = Math.abs(delta) > v.step * 0.4
            return (
              <BudgetSliderRow
                key={v.key}
                variable={v}
                baseline={base}
                value={val}
                cost={cost}
                needsArea={needsArea}
                changed={changed}
                delta={delta}
                onChange={(newVal) => handleSliderChange(v.key, newVal)}
              />
            )
          })}
        </div>

        {/* 전체 변수별 사업비 요약 */}
        {pkgCosts.length > 0 && (
          <div className="budget-breakdown">
            <div className="budget-breakdown-title">전체 변수별 사업비</div>
            {pkgCosts.map(({ pkg, rows, pkgTotal }) => (
              <div key={pkg.id} className="budget-pkg-group">
                <div className="budget-pkg-header">
                  <span>{pkg.label}</span>
                  <span className="budget-pkg-total">{pkgTotal.toLocaleString()}원</span>
                </div>
                {rows.map(({ v, cost }) => (
                  <div key={v.key} className="budget-breakdown-row budget-breakdown-sub">
                    <span className="breakdown-label">{v.label}</span>
                    <span className="breakdown-cost">{cost.toLocaleString()}원</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {pkgCosts.length === 0 && (
          <div className="modal-empty" style={{ padding: '16px 0' }}>
            <p>슬라이더를 움직이면 사업비가 계산됩니다.</p>
          </div>
        )}

        <div className="modal-footer">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>닫기</button>
          <button className="modal-btn modal-btn-primary" onClick={handleApply}>이 정책 적용하기</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function BudgetSliderRow({ variable: v, baseline, value, cost, needsArea, changed, delta, onChange }) {
  const fmt = (n) => {
    if (v.step >= 1) return Math.round(n).toLocaleString()
    return n.toFixed(3)
  }

  return (
    <div className="bslider-item">
      <div className="bslider-header">
        <span className="bslider-label">{v.label}</span>
        <span className={`bslider-cost${changed && !needsArea && cost > 0 ? ' bslider-cost-active' : ''}`}>
          {needsArea ? '면적 필요' : changed && cost > 0 ? formatCostShort(cost) : '—'}
        </span>
      </div>
      <div className="bslider-values">
        <span className="bslider-base">현재: {fmt(baseline)}</span>
        {changed && (
          <span className={`bslider-delta ${delta < 0 ? 'budget-cool' : 'budget-warm'}`}>
            → {fmt(value)}{' '}
            <span className="bslider-delta-sign">({delta > 0 ? '+' : ''}{fmt(delta)})</span>
          </span>
        )}
      </div>
      <input
        type="range"
        className="bslider-range"
        min={v.safeLow}
        max={v.safeHigh}
        step={v.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <div className="bslider-minmax">
        <span>{fmt(v.safeLow)}</span>
        <span>{fmt(v.safeHigh)}</span>
      </div>
    </div>
  )
}
