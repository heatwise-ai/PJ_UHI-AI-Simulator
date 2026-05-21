/**
 * 가짜 LST 예측 함수
 *
 * ⚠️ 이 파일은 최적 조합 모달(OptimalCombinationModal)에서만 사용됩니다.
 * 실제 시뮬레이션은 백엔드 POST /simulate 를 사용합니다.
 */

const MOCK_COEFFICIENTS = {
    Albedo: -15,
    '녹지율': -3.5,
    '총_가로수_개수': -0.0008,
    '누적_조성면적합계(m^2)': -0.00015,
    '그늘막 개수': -0.05,
    '에너지사용량_전기': 0.00005,
    '에너지사용량_가스': 0.0008,
    '차량밀도': 0.00008,
    '인구밀도': 0.00003,
    '용적률_행정동별': 0.005,
  }

  export function simulateLST({ baseLST, adjustments = {} }) {
    if (baseLST == null) {
      return { predictedLST: null, deltaLST: 0, uncertainty: 0.4 }
    }

    let deltaLST = 0
    Object.entries(adjustments).forEach(([key, deltaValue]) => {
      const coef = MOCK_COEFFICIENTS[key]
      if (coef != null && deltaValue != null) {
        deltaLST += coef * deltaValue
      }
    })

    if (deltaLST < -10) deltaLST = -10
    if (deltaLST > 5) deltaLST = 5

    const predictedLST = baseLST + deltaLST

    return {
      predictedLST,
      deltaLST,
      uncertainty: 0.4,
    }
  }

  export function simulateSingleVariable(variableKey, deltaValue, baseLST) {
    return simulateLST({
      baseLST,
      adjustments: { [variableKey]: deltaValue },
    })
  }
