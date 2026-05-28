import { useState } from 'react'
import { PACKAGES, getVariablesByPackage } from '../utils/policyMeta'
import PolicySlider from './PolicySlider'
import OptimalCombinationModal from './OptimalCombinationModal'

function SidePanelStep2({ selectedDong, year, month, nameToCode, features, sliderBounds, adjustments, onAdjust, projectArea, onProjectAreaChange }) {
  const [activePackage, setActivePackage] = useState('green')
  const [modalOpen, setModalOpen] = useState(false)

  const variablesInPackage = getVariablesByPackage(activePackage)

  // Merge API bounds into variable meta
  const getVariable = (variable) => {
    const bounds = sliderBounds?.[variable.key]
    if (!bounds) return variable
    return {
      ...variable,
      safeLow: bounds.safeLow,
      safeHigh: bounds.safeHigh,
      step: bounds.step,
      direction: bounds.direction,
    }
  }

  return (
    <div className="step2">
      <div className="step-tag-row">
        <button className="optimal-btn" onClick={() => setModalOpen(true)}>
          💰 예산별 최적 조합 추천 보기
        </button>
      </div>

      <div className="package-tabs">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            className={`package-tab ${activePackage === pkg.id ? 'active' : ''}`}
            onClick={() => setActivePackage(pkg.id)}
          >
            {pkg.label}
          </button>
        ))}
      </div>

      <div className="slider-list">
        {variablesInPackage.length === 0 ? (
          <div className="slider-empty">이 패키지에 변수가 없습니다</div>
        ) : (
          variablesInPackage.map((variable) => {
            const v = getVariable(variable)
            return (
              <PolicySlider
                key={v.key}
                variable={v}
                currentValue={features[v.key]}
                adjustedValue={adjustments[v.key]}
                onChange={(newVal) => onAdjust(v.key, newVal)}
              />
            )
          })
        )}
      </div>

      <BackgroundConditions features={features} year={year} />

      <OptimalCombinationModal
        open={modalOpen}
        features={features}
        selectedDong={selectedDong}
        year={year}
        month={month}
        projectArea={projectArea}
        onClose={() => setModalOpen(false)}
        onApply={(finalAdjustments) => {
          Object.entries(finalAdjustments).forEach(([key, value]) => {
            onAdjust(key, value)
          })
        }}
        onAreaChange={onProjectAreaChange}
      />
    </div>
  )
}

const SEASON_SHORT = { DJF: '겨울(DJF)', MAM: '봄(MAM)', JJA: '여름(JJA)', SON: '가을(SON)' }

function BackgroundConditions({ features, year }) {
  const tempVal = features['avg_temp (℃)']
  const seasonCode = features.season
  const seasonLabel = SEASON_SHORT[seasonCode] || seasonCode

  const parts = []
  if (tempVal != null) parts.push(`기온 ${tempVal.toFixed(1)}°C`)
  if (seasonLabel) parts.push(`계절 ${seasonLabel}`)
  if (year) parts.push(`${year}년`)

  if (parts.length === 0) return null

  return (
    <div className="bg-conditions-simple">
      배경 조건: {parts.join(' · ')}
    </div>
  )
}

export default SidePanelStep2
