/**
 * 정책 변수 메타데이터
 * - stat_cost_unit.csv 기반 + 임시 safe_low/safe_high (나중에 팀원 데이터로 교체)
 * - 임시 추천 상한 (recommended_upper_bound)도 포함 — 나중에 PDF 12p 표로 교체
 *
 * 향후 교체 포인트:
 * - safeLow/safeHigh: 팀원이 행정동·월별 q5/q95 테이블 주면 거기서 lookup
 * - recommendedUpperBound: 팀원이 월별 권장 상한값 주면 거기서 lookup
 */

export const POLICY_VARIABLES = [
    // ===== 녹지 패키지 =====
    // ===== 녹지 패키지 =====
    {
      key: '녹지율',
      label: '녹지율',
      package: 'green',
      direction: 'increase',
      unit: '',
      step: 0.001,
      safeLow: 0.0058,
      safeHigh: 0.0508,
      costPerArea: 150000,
      appliesToArea: true,
      relatedPolicy: '도시숲 조성',
      description: '단위 면적당 녹지 비율 (0~1). 가로공원·소공원·녹지대 등. 증발산 효과로 LST 낮춤.',
    },
    {
      key: '총_가로수_개수',
      label: '가로수 개수',
      package: 'green',
      direction: 'increase',
      unit: '본',
      step: 10,
      safeLow: 0,
      safeHigh: 6911,
      costPerStep: 10000000,
      relatedPolicy: '가로수 식재',
      description: '행정동 내 가로수 총 개수. 그늘 + 증산작용으로 도시 열섬 완화.',
    },
    {
      key: '누적_조성면적합계(m^2)',
      label: '옥상녹화 면적',
      package: 'green',
      direction: 'increase',
      unit: '㎡',
      step: 500,
      safeLow: 0,
      safeHigh: 18678,
      costPerStep: 61500000,
      relatedPolicy: '옥상녹화 지원',
      description: '누적 옥상녹화 조성 면적. 건물 표면 온도 직접 저감.',
    },

    // ===== 건축·포장 패키지 =====
    {
      key: 'Albedo',
      label: '반사율 (Albedo)',
      package: 'surface',
      direction: 'increase',
      unit: '',
      step: 0.02,
      safeLow: 0.0071,
      safeHigh: 0.9662,
      costPerArea: 25000,
      appliesToArea: true,
      relatedPolicy: '쿨루프 보급',
      description: '지표면 햇빛 반사율 (0~1). 높을수록 흡수 적어 시원해짐. 쿨루프 도색이 대표 사업.',
    },
    {
      key: '용적률_행정동별',
      label: '용적률',
      package: 'surface',
      direction: 'decrease',
      unit: '%p',
      step: 20,
      safeLow: 2.29,
      safeHigh: 3502,
      costPerStep: 4440000000,
      relatedPolicy: '도시개발규제',
    },

    // ===== 에너지 패키지 =====
    {
      key: '에너지사용량_전기',
      label: '전기 사용량',
      package: 'energy',
      direction: 'decrease',
      unit: 'kWh',
      step: 100,
      safeLow: 93,
      safeHigh: 106167,
      costPerStep: 30000,
      relatedPolicy: '에너지 효율화',
    },
    {
      key: '에너지사용량_가스',
      label: '가스 사용량',
      package: 'energy',
      direction: 'decrease',
      unit: 'MJ',
      step: 50,
      safeLow: 0,
      safeHigh: 20280,
      costPerStep: 30000,
      relatedPolicy: '에너지 효율화',
    },

    // ===== 폭염 저감 패키지 =====
    {
      key: '그늘막 개수',
      label: '그늘막 개수',
      package: 'facility',
      direction: 'increase',
      unit: '개',
      step: 1,
      safeLow: 0,
      safeHigh: 43,
      costPerStep: 8500000,
      relatedPolicy: '그늘막 설치',
      description: '폭염 대비 인공 그늘막. 보행자 체감온도에 즉각 효과.',
    },
  ]

  // 패키지 메타데이터
  export const PACKAGES = [
    { id: 'green', label: '녹지 패키지', icon: '🌳' },
    { id: 'surface', label: '건축·포장', icon: '🏢' },
    { id: 'energy', label: '에너지', icon: '⚡' },
    { id: 'facility', label: '폭염 저감', icon: '⛱️' },
  ]

  // 패키지별로 변수 묶어서 가져오기
  export function getVariablesByPackage(packageId) {
    return POLICY_VARIABLES.filter((v) => v.package === packageId)
  }

  // 키로 변수 찾기
  export function findVariable(key) {
    return POLICY_VARIABLES.find((v) => v.key === key)
  }
