import { useState } from 'react'
import MapView from './components/MapView'
import SidePanelStep1 from './components/SidePanelStep1'
import SidePanelStep2 from './components/SidePanelStep2'
import SidePanelStep3 from './components/SidePanelStep3'
import StepNavigator from './components/StepNavigator'
import TopControls from './components/TopControls'
import Spinner from './components/Spinner'
import EmptyState from './components/EmptyState'
import MapLegend from './components/MapLegend'
import PeriodPicker from './components/PeriodPicker'
import DataSourceFooter from './components/DataSourceFooter'
import { useLSTData } from './hooks/useLSTData'
import { useDongFeatures } from './hooks/useDongFeatures'
import './App.css'

function App() {
  const [selectedDong, setSelectedDong] = useState(null)
  const [year, setYear] = useState(2024)
  const [month, setMonth] = useState(8)
  const [adjustments, setAdjustments] = useState({})
  const [projectArea, setProjectArea] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [panelOpen, setPanelOpen] = useState(true)

  const { lstByDong, dongInfo, dongsByGu, nameToCode, seoulAvg, lstRange, loading } = useLSTData(year, month)
  const { features, sliderBounds } = useDongFeatures(selectedDong, year, month, nameToCode)

  const handleSelectDong = (dongName) => {
    setSelectedDong(dongName)
    setAdjustments({})
    setProjectArea(null)
    setCurrentStep(1)
    setPanelOpen(true)
  }

  const updateAdjustment = (key, newValue) => {
    setAdjustments((prev) => ({ ...prev, [key]: newValue }))
  }

  const handleChangeYear = (y) => {
    setYear(y)
    setAdjustments({})
    setProjectArea(null)
  }
  const handleChangeMonth = (m) => {
    setMonth(m)
    setAdjustments({})
    setProjectArea(null)
  }

  return (
    <div className="app">
      <div className="map-area">
        <MapView
          selectedDong={selectedDong}
          onSelectDong={handleSelectDong}
          lstByDong={lstByDong}
          lstRange={lstRange}
        />
        <MapLegend lstRange={lstRange} year={year} month={month} />
      </div>

      <TopControls
        year={year}
        month={month}
        onChangeYear={handleChangeYear}
        onChangeMonth={handleChangeMonth}
        dongInfo={dongInfo}
        onSelectDong={handleSelectDong}
      />

      {!panelOpen && (
        <button className="panel-reopen" onClick={() => setPanelOpen(true)}>
          ▶
        </button>
      )}

      {panelOpen && (
        <div className="side-panel">
          <div className="panel-header">
            <PeriodPicker
              year={year}
              month={month}
              onChangeYear={handleChangeYear}
              onChangeMonth={handleChangeMonth}
            />
            <button
              className="panel-close"
              onClick={() => setPanelOpen(false)}
              title="패널 닫기"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <Spinner size={36} label="데이터 불러오는 중..." />
          ) : !selectedDong ? (
            <EmptyState />
          ) : (
            <>
              <StepNavigator
                currentStep={currentStep}
                onChange={setCurrentStep}
              />

              {currentStep === 1 && (
                <SidePanelStep1
                  selectedDong={selectedDong}
                  year={year}
                  month={month}
                  lstByDong={lstByDong}
                  dongInfo={dongInfo}
                  dongsByGu={dongsByGu}
                  seoulAvg={seoulAvg}
                  nameToCode={nameToCode}
                />
              )}

              {currentStep === 2 && (
                <SidePanelStep2
                  selectedDong={selectedDong}
                  year={year}
                  month={month}
                  nameToCode={nameToCode}
                  features={features}
                  sliderBounds={sliderBounds}
                  adjustments={adjustments}
                  onAdjust={updateAdjustment}
                  projectArea={projectArea}
                  onProjectAreaChange={setProjectArea}
                />
              )}

              {currentStep === 3 && (
                <SidePanelStep3
                  selectedDong={selectedDong}
                  features={features}
                  adjustments={adjustments}
                  projectArea={projectArea}
                  year={year}
                  month={month}
                  dongInfo={dongInfo}
                  onAdjust={updateAdjustment}
                />
              )}

              <div className="step-nav-buttons">
                <button
                  className="step-btn step-btn-prev"
                  onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                  disabled={currentStep === 1}
                >
                  ← 이전
                </button>
                {currentStep < 3 ? (
                  <button
                    className="step-btn step-btn-next"
                    onClick={() => setCurrentStep((s) => s + 1)}
                  >
                    다음 →
                  </button>
                ) : (
                  <button
                    className="step-btn step-btn-next"
                    onClick={() => {
                      setCurrentStep(1)
                      setAdjustments({})
                      setProjectArea(null)
                    }}
                  >
                    처음으로 ↺
                  </button>
                )}
              </div>

              <DataSourceFooter />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App
