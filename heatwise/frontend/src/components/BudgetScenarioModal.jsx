import { useState } from 'react'
import { createPortal } from 'react-dom'

function BudgetScenarioModal({ open, onClose, tableRows, deltaLST }) {
  const [budgetRaw, setBudgetRaw] = useState('')

  const budget = parseInt(budgetRaw.replace(/,/g, ''), 10) || 0
  const costRows = tableRows.filter((r) => r.costNum > 0)
  const totalCost = costRows.reduce((s, r) => s + r.costNum, 0)
  const remaining = budget - totalCost
  const overBudget = budget > 0 && totalCost > budget
  const usagePct = budget > 0 ? (totalCost / budget) * 100 : 0
  const barPct = Math.min(usagePct, 100)
  const barClass = overBudget ? 'over' : usagePct > 80 ? 'warning' : 'ok'
  const efficiency =
    deltaLST < 0 && totalCost > 0
      ? Math.abs(deltaLST) / (totalCost / 1e8)
      : null

  const handleBudgetChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setBudgetRaw(raw ? parseInt(raw, 10).toLocaleString() : '')
  }

  if (!open) return null

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
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

          <div className="budget-summary-cell">
            <div className="budget-summary-label">예측 LST 변화량</div>
            <div className={`budget-summary-value${deltaLST < 0 ? ' budget-cool' : deltaLST > 0 ? ' budget-warm' : ''}`}>
              {deltaLST > 0 ? '+' : ''}{deltaLST.toFixed(2)}°C
            </div>
          </div>

          {efficiency != null && (
            <div className="budget-summary-cell">
              <div className="budget-summary-label">1억원당 냉각효과</div>
              <div className="budget-summary-value budget-cool">
                {efficiency.toFixed(3)}°C/억
              </div>
            </div>
          )}
        </div>

        {/* 예산 사용률 바 */}
        {budget > 0 && (
          <div className="budget-usage-wrap">
            <div className="budget-usage-header">
              <span>예산 사용률</span>
              <span className={overBudget ? 'budget-warm' : ''}>
                {barPct.toFixed(1)}%{overBudget ? ' ⚠ 예산 초과' : ''}
              </span>
            </div>
            <div className="budget-bar-track">
              <div className={`budget-bar-fill ${barClass}`} style={{ width: `${barPct}%` }} />
            </div>
          </div>
        )}

        {/* 변수별 사업비 */}
        {costRows.length > 0 ? (
          <div className="budget-breakdown">
            <div className="budget-breakdown-title">변수별 사업비</div>
            {costRows.map((row) => (
              <div key={row.key} className="budget-breakdown-row">
                <span className="breakdown-label">{row.label}</span>
                <span className="breakdown-cost">{row.costNum.toLocaleString()}원</span>
              </div>
            ))}
            {tableRows.filter((r) => r.needsArea).length > 0 && (
              <div className="budget-area-notice">
                * 면적 미입력 변수의 사업비는 미포함 (최적 조합 모달에서 면적 입력)
              </div>
            )}
          </div>
        ) : (
          <div className="modal-empty">
            <p>사업비를 계산할 수 있는 변수가 없습니다.</p>
            <p className="empty-sub">슬라이더 조정 후 면적 정보를 입력해 주세요.</p>
          </div>
        )}

        <div className="modal-footer">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default BudgetScenarioModal
