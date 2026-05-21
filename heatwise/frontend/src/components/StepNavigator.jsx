const STEPS = [
    { num: 1, label: '현황 진단' },
    { num: 2, label: '정책 시뮬레이션' },
    { num: 3, label: '효과 분석' },
  ]

  function StepNavigator({ currentStep, onChange }) {
    return (
      <div className="step-nav">
        {STEPS.map((step, i) => (
          <div key={step.num} className="step-nav-item-wrap">
            <button
              className={`step-nav-item ${
                currentStep === step.num ? 'active' :
                currentStep > step.num ? 'done' : ''
              }`}
              onClick={() => onChange(step.num)}
            >
              <span className="step-nav-circle">
                {currentStep > step.num ? '✓' : step.num}
              </span>
              <span className="step-nav-label">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`step-nav-line ${currentStep > step.num ? 'done' : ''}`} />
            )}
          </div>
        ))}
      </div>
    )
  }

  export default StepNavigator
