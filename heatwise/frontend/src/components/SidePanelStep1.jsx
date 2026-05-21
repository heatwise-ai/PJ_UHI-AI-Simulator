import { useShapData } from '../hooks/useShapData'

const FEATURE_LABELS = {
  NDBI: '건물밀집도',
  NDVI: '녹지지수',
  NDWI: '수분지수',
  Albedo: '반사율',
  SAVI: '식생지수',
  '불투수면지수': '불투수면지수',
  '녹지율': '녹지율',
  '총_가로수_개수': '가로수',
  '그늘막 개수': '그늘막',
  '누적_조성면적합계(m^2)': '녹지조성면적',
  '에너지사용량_전기': '전기사용량',
  '에너지사용량_가스': '가스사용량',
  '인구밀도': '인구밀도',
  '차량밀도': '차량밀도',
  '용적률_행정동별': '용적률',
  'avg_temp (℃)': '평균기온',
  'avg_humi (%)': '평균습도',
  'avg_inte_illu (lux)': '조도',
  'avg_noise (dB )': '소음',
  'avg_ultra_rays (UV)': '자외선',
  'avg_elevation': '고도',
  'Albedo_x_avg_temp': '반사율×기온',
}

function SidePanelStep1({ selectedDong, year, month, lstByDong, dongInfo, dongsByGu, seoulAvg, nameToCode }) {
    const { shapTop3 } = useShapData(selectedDong, year, month, nameToCode)

    if (!selectedDong) return null

    const info = dongInfo[selectedDong]
    if (!info) return null

    const currentLST = lstByDong[selectedDong]
    const gu = info.guName
    const dongName = info.dongName
  const dongsInGu = (dongsByGu[gu] || [])
    .filter((d) => lstByDong[d] != null)
    .sort((a, b) => lstByDong[b] - lstByDong[a])
  const rank = dongsInGu.indexOf(selectedDong) + 1
  const totalInGu = dongsInGu.length

  const allDongs = Object.keys(lstByDong)
    .filter((d) => lstByDong[d] != null)
    .sort((a, b) => lstByDong[b] - lstByDong[a])
  const seoulRank = allDongs.indexOf(selectedDong) + 1
  const seoulTotal = allDongs.length

  return (
    <div className="step1">
      <div className="step1-header">
        <span className="gu-label">{gu}</span>
        <h2>{dongName} 열환경 시뮬레이터</h2>
      </div>

      <div className="stat-row">
        <div className="stat-cell">
          <div className="stat-cell-label">현재 LST</div>
          <div className="stat-cell-value highlight">
            {currentLST != null ? `${currentLST.toFixed(1)}°C` : '-'}
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">서울 평균</div>
          <div className="stat-cell-value">
            {seoulAvg != null ? `${seoulAvg.toFixed(1)}°C` : '-'}
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">서울 내</div>
          <div className="stat-cell-value">
            {seoulRank > 0 ? `${seoulRank}위` : '-'}
            {seoulTotal > 0 && <span className="rank-suffix">/ {seoulTotal}</span>}
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">{gu} 내</div>
          <div className="stat-cell-value">
            {rank > 0 ? `${rank}위` : '-'}
            {totalInGu > 0 && <span className="rank-suffix">/ {totalInGu}</span>}
          </div>
        </div>
      </div>

      <div className="shap-section">
        <div className="shap-header">
          <span className="shap-title">이 동네 핵심 변수 TOP 3 (SHAP)</span>
          <span className="shap-tooltip" title="모델 기반 추정으로 실제와 차이가 있을 수 있음">ⓘ 모델 기반 추정</span>
        </div>
        {shapTop3.length === 0 ? (
          <div className="shap-empty">데이터 없음</div>
        ) : (
          <div className="shap-list">
            {shapTop3.map((item, i) => (
              <div key={i} className="shap-item">
                <span className="shap-rank">{i + 1}.</span>
                <span className="shap-name">{FEATURE_LABELS[item.feature] || item.feature}</span>
                <span className={`shap-value ${item.value > 0 ? 'positive' : 'negative'}`}>
                  {item.value > 0 ? '+' : ''}{item.value.toFixed(2)}°C
                </span>
              </div>
            ))}
          </div>
        )}

        {shapTop3.length > 0 && (
          <p className="shap-summary">
            {generateSummary(shapTop3)}
          </p>
        )}
      </div>
    </div>
  )
}

function generateSummary(top3) {
  const positives = top3.filter((x) => x.value > 0).map((x) => FEATURE_LABELS[x.feature] || x.feature)
  const negatives = top3.filter((x) => x.value < 0).map((x) => FEATURE_LABELS[x.feature] || x.feature)
  let parts = []
  if (positives.length > 0) parts.push(`${positives.join(', ')}이(가) 주요 원인`)
  if (negatives.length > 0) parts.push(`${negatives.join(', ')}이(가) 일부 완화 중`)
  return parts.join(', ') + '입니다.'
}

export default SidePanelStep1
