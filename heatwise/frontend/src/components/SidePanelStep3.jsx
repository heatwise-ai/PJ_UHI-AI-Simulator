import { useState, useEffect } from 'react'
import { POLICY_VARIABLES } from '../utils/policyMeta'
import { api } from '../api'
import BudgetScenarioModal from './BudgetScenarioModal'

const RELATED_LINKS = {
  Albedo: { label: '쿨루프 보급사업', url: 'https://www.seoul.go.kr/' },
  '녹지율': { label: '서울시 녹지조성 지원사업', url: 'https://parks.seoul.go.kr/' },
  '총_가로수_개수': { label: '가로수 식재 사업', url: 'https://parks.seoul.go.kr/' },
  '그늘막 개수': { label: '폭염 그늘막 설치사업', url: 'https://news.seoul.go.kr/' },
}

function SidePanelStep3({ selectedDong, features, adjustments, projectArea, year, month, dongInfo }) {
  const [simResult, setSimResult] = useState(null)
  const [simLoading, setSimLoading] = useState(false)
  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [perVarDeltas, setPerVarDeltas] = useState({})
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)

  const baseLST = features?.LST
  const dongName = dongInfo?.[selectedDong]?.dongName || ''
  const adjKey = JSON.stringify(adjustments)

  useEffect(() => {
    if (!selectedDong || !baseLST) return

    const area_ratio = projectArea > 0 ? Math.min(projectArea / 10000, 1.0) : 1.0

    setSimLoading(true)
    setSimResult(null)
    setInsight(null)
    setPerVarDeltas({})

    api
      .simulate({
        adm_cd: selectedDong,
        year,
        month,
        features: adjustments,
        albedo_area_ratio: area_ratio,
      })
      .then((result) => {
        setSimResult(result)
        setSimLoading(false)
        setInsightLoading(true)

        // Per-variable simulations in parallel
        const adjustedKeys = Object.keys(adjustments).filter((k) => {
          const cur = features[k]
          return cur != null && adjustments[k] != null && Math.abs(adjustments[k] - cur) > 0
        })
        if (adjustedKeys.length > 0) {
          Promise.all(
            adjustedKeys.map((key) =>
              api.simulate({
                adm_cd: selectedDong,
                year,
                month,
                features: { [key]: adjustments[key] },
                albedo_area_ratio: key === 'Albedo' ? area_ratio : 1.0,
              }).then((r) => ({ key, delta: r.delta_T }))
            )
          ).then((results) => {
            const deltas = {}
            results.forEach(({ key, delta }) => { deltas[key] = delta })
            setPerVarDeltas(deltas)
          }).catch(() => {})
        }

        return api.insight({
          delta_T: result.delta_T,
          features: result.adjusted_features,
          adm_nm: dongName,
          month,
          background: null,
        })
      })
      .then((ins) => {
        setInsight(ins)
        setInsightLoading(false)
      })
      .catch((e) => {
        console.error('simulate/insight error:', e)
        setSimLoading(false)
        setInsightLoading(false)
      })
  }, [selectedDong, year, month, adjKey, baseLST])

  if (!baseLST) return null

  const deltaLST = simResult?.delta_T ?? 0
  const predictedLST = simResult?.after_lst ?? baseLST
  const uncertainty = 0.4

  // Build table rows from adjustments
  const adjustedKeys = Object.keys(adjustments).filter((k) => {
    const cur = features[k]
    return cur != null && adjustments[k] != null && Math.abs(adjustments[k] - cur) > 0
  })

  const tableRows = adjustedKeys
    .map((key) => {
      const variable = POLICY_VARIABLES.find((v) => v.key === key)
      if (!variable) return null
      const delta = adjustments[key] - (features[key] || 0)
      const { cost: costNum, needsArea } = calcCostNum(variable, delta, projectArea)
      return {
        key,
        label: variable.label,
        relatedPolicy: variable.relatedPolicy || '—',
        cost: needsArea ? '면적 미입력' : formatCostStr(costNum),
        costNum,
        needsArea,
        difficulty: estimateDifficulty(variable.package),
        deltaLST: perVarDeltas[key],
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.deltaLST != null && b.deltaLST != null) return a.deltaLST - b.deltaLST
      return 0
    })

  return (
    <div className="step3">
      {/* 1. 예측 결과 */}
      {simLoading ? (
        <div className="prediction-row">
          <span className="prediction-label">예상 LST</span>
          <span className="prediction-value" style={{ fontSize: 16, color: '#888' }}>계산 중...</span>
        </div>
      ) : (
        <div className="prediction-row">
          <span className="prediction-label">예상 LST</span>
          <span className="prediction-value">{predictedLST.toFixed(1)}°C</span>
          {Math.abs(deltaLST) > 0.01 && (
            <span className={`prediction-delta ${deltaLST < 0 ? 'cool' : 'warm'}`}>
              ({deltaLST > 0 ? '+' : ''}{deltaLST.toFixed(1)})
            </span>
          )}
          <span className="prediction-uncertainty">| 오차범위 ±{uncertainty.toFixed(1)}°C</span>
        </div>
      )}

      {/* 2. 인사이트 */}
      {insightLoading && (
        <div className="insight-box">
          <div className="insight-tag">정책 완화 인사이트 [AI 분석 중...]</div>
          <p className="insight-text" style={{ color: '#888' }}>분석 중...</p>
        </div>
      )}

      {!insightLoading && insight && (
        <div className="insight-box">
          <div className="insight-tag">
            정책 완화 인사이트 [{insight.ai_generated
              ? (insight.ai_provider === 'claude' ? 'AI(Claude) 생성' : 'AI(Gemini) 생성')
              : '자동 요약'}]
          </div>
          <p className="insight-text">{insight.summary}</p>
          {adjustedKeys.length > 0 && (
            <InsightLinks adjustedKeys={adjustedKeys} />
          )}
        </div>
      )}

      {!insightLoading && !insight && !simLoading && (
        <InsightBox
          deltaLST={deltaLST}
          adjustedKeys={adjustedKeys}
          dongName={dongName}
        />
      )}

      {/* 3. 정책 효과 비교 테이블 */}
      <div className="effect-table-section">
        <div className="section-title-row">
          <h3 className="section-title">정책 효과 비교</h3>
          <a
            className="cost-table-link"
            href="https://www.notion.so"
            target="_blank"
            rel="noopener noreferrer"
          >
            단위 비용 환산표 →
          </a>
        </div>
        {tableRows.length === 0 ? (
          <div className="effect-empty">
            슬라이더를 조정하면 변수별 효과가 표시됩니다
          </div>
        ) : (
          <table className="effect-table">
            <thead>
              <tr>
                <th>정책 변수</th>
                <th>ΔLST</th>
                <th>관련 정책</th>
                <th>사업비</th>
                <th>난이도</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const dLst = row.deltaLST
                const dStr = dLst != null
                  ? `${dLst > 0 ? '+' : ''}${dLst.toFixed(2)}°C`
                  : Object.keys(perVarDeltas).length === 0 ? '...' : '—'
                return (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td className={dLst != null ? (dLst < 0 ? 'cool' : 'warm') : ''}>
                      {dStr}
                    </td>
                    <td className="related-policy">{row.relatedPolicy}</td>
                    <td>{row.cost}</td>
                    <td>
                      <span className={`difficulty difficulty-${row.difficulty.level}`}>
                        {row.difficulty.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. 액션 버튼 */}
      <div className="action-row">
        <button className="action-btn" onClick={() => alert('시트 내보내기 (구현 예정)')}>
          시트 내보내기
        </button>
        <button className="action-btn action-btn-primary" onClick={() => setBudgetModalOpen(true)}>
          💰 사업비 시나리오
        </button>
      </div>

      <BudgetScenarioModal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        tableRows={tableRows}
        deltaLST={deltaLST}
      />

      {/* 5. 주의요망 */}
      <Disclosure title="주의요망">
        <p>
          {insight?.caution ||
            '본 시뮬레이션은 LightGBM 모델 기반 추정이며 실제 정책 효과와 차이가 있을 수 있습니다. 변수 간 상호작용 효과는 일부만 반영되어 있으며, 극단적 조합 시 예측 신뢰도가 저하될 수 있습니다.'}
        </p>
      </Disclosure>

      {/* 6. 전망 */}
      <Disclosure title="전망">
        <p>
          {insight?.outlook ||
            '단기적으로는 그늘막 설치와 쿨루프 도색이 즉시 효과를 볼 수 있으며, 중장기적으로는 녹지 확대와 건물 밀도 관리가 지속적 LST 저감에 효과적입니다.'}
        </p>
      </Disclosure>
    </div>
  )
}

function InsightBox({ deltaLST, adjustedKeys, dongName }) {
  let message
  if (adjustedKeys.length === 0) {
    message = '슬라이더를 조정하거나 "최적 조합 보기"를 통해 정책별 효과를 분석해드립니다.'
  } else if (deltaLST < -1) {
    message = `${dongName}에서 ${adjustedKeys.length}개 변수 조정으로 약 ${Math.abs(deltaLST).toFixed(1)}°C 저감이 기대됩니다.`
  } else if (deltaLST < -0.3) {
    message = `${dongName}에서 약 ${Math.abs(deltaLST).toFixed(1)}°C 저감이 예상됩니다. 효과를 키우려면 추가 변수 조정을 고려하세요.`
  } else if (deltaLST > 0.3) {
    message = `현재 조정값으로는 LST가 오히려 ${deltaLST.toFixed(1)}°C 상승할 수 있습니다. 변수 조정 방향을 점검해주세요.`
  } else {
    message = '현재 조정값의 LST 변화는 미미합니다. 더 큰 효과를 보려면 SHAP 영향력이 큰 변수를 우선 조정해보세요.'
  }

  return (
    <div className="insight-box">
      <div className="insight-tag">정책 완화 인사이트 [자동 요약]</div>
      <p className="insight-text">{message}</p>
      {adjustedKeys.length > 0 && <InsightLinks adjustedKeys={adjustedKeys} />}
    </div>
  )
}

function InsightLinks({ adjustedKeys }) {
  const relatedLinks = adjustedKeys
    .map((k) => RELATED_LINKS[k] && { key: k, ...RELATED_LINKS[k] })
    .filter(Boolean)

  if (relatedLinks.length === 0) return null

  return (
    <div className="insight-links">
      <div className="insight-links-label">관련 정책 자료</div>
      {relatedLinks.map((link) => (
        <a
          key={link.key}
          className="insight-link"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

function Disclosure({ title, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`disclosure ${open ? 'open' : ''}`}>
      <button className="disclosure-header" onClick={() => setOpen(!open)}>
        <span className="disclosure-arrow">{open ? '▼' : '▶'}</span>
        <span className="disclosure-title">{title}</span>
      </button>
      {open && <div className="disclosure-body">{children}</div>}
    </div>
  )
}

function calcCostNum(variable, delta, projectArea) {
  if (!delta || delta === 0) return { cost: 0, needsArea: false }
  if (variable.appliesToArea && variable.costPerArea != null) {
    if (!projectArea || projectArea <= 0) return { cost: 0, needsArea: true }
    const intensity = Math.abs(delta / (variable.recommendedUpper || 1))
    const cost = projectArea * variable.costPerArea * Math.max(0.5, Math.min(2, intensity))
    return { cost: Math.round(cost), needsArea: false }
  }
  if (variable.costPerStep != null) {
    const stepCount = Math.abs(delta / variable.step)
    return { cost: Math.round(stepCount * variable.costPerStep), needsArea: false }
  }
  return { cost: 0, needsArea: false }
}

function formatCostStr(cost) {
  if (!cost || cost === 0) return '-'
  if (cost < 1e8) return `${(cost / 1e6).toFixed(0)}백만`
  if (cost < 1e12) return `${(cost / 1e8).toFixed(1)}억`
  return `${(cost / 1e12).toFixed(1)}조`
}

function estimateDifficulty(packageId) {
  const map = {
    facility: { level: 'low', label: '하' },
    surface: { level: 'mid', label: '중' },
    energy: { level: 'mid', label: '중' },
    green: { level: 'mid', label: '중' },
    mobility: { level: 'high', label: '상' },
    urban_structure: { level: 'high', label: '상' },
  }
  return map[packageId] || { level: 'mid', label: '중' }
}

export default SidePanelStep3
