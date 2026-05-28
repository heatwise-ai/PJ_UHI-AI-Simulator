import { createPortal } from 'react-dom'

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function fmtWon(n) {
  if (!n || n <= 0) return '—'
  if (n < 1e8) return `${(n / 1e6).toFixed(0)}백만원`
  return `${(n / 1e8).toFixed(1)}억원`
}

export default function ExportReportModal({
  open, onClose,
  dongName, year, month,
  beforeLST, afterLST, deltaLST,
  tableRows, insight, totalCost,
}) {
  if (!open) return null

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  const efficiency = deltaLST < 0 && totalCost > 0
    ? (Math.abs(deltaLST) / (totalCost / 1e8)).toFixed(3)
    : null

  const ranked = [...tableRows]
    .filter((r) => r.deltaLST != null && r.deltaLST < 0)
    .sort((a, b) => a.deltaLST - b.deltaLST)
    .slice(0, 3)

  return createPortal(
    <div className="export-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="export-wrapper">

        {/* 상단 컨트롤 바 */}
        <div className="export-controls">
          <span className="export-hint">
            미리보기 · PDF 저장은 아래 버튼 클릭 후 인쇄 대화상자에서 "PDF로 저장"을 선택하세요
          </span>
          <div className="export-btns">
            <button className="export-btn-pdf" onClick={() => window.print()}>
              📄 PDF 다운로드
            </button>
            <button className="export-btn-close" onClick={onClose}>닫기</button>
          </div>
        </div>

        {/* A4 페이지들 */}
        <div id="export-print-area">

          {/* ─── PAGE 1 ─── */}
          <div className="export-page">
            <div className="rpt-header">
              <div>
                <div className="rpt-logo">🌡 서울시 UHI AI 시뮬레이터</div>
                <div className="rpt-subtitle-sm">Urban Heat Island 정책 효과 분석 시스템</div>
              </div>
              <div className="rpt-meta-right">
                <div>{today} 생성</div>
                <div className="rpt-page-label">1 / 2</div>
              </div>
            </div>

            <div className="rpt-title">행정동별 도시 열섬 정책 시뮬레이션 결과</div>

            {/* 분석 조건 */}
            <div className="rpt-section">
              <div className="rpt-section-title">분석 조건</div>
              <div className="rpt-cond-row">
                <div className="rpt-cond-cell">
                  <div className="rpt-cond-label">행정동</div>
                  <div className="rpt-cond-value">{dongName || '—'}</div>
                </div>
                <div className="rpt-cond-cell">
                  <div className="rpt-cond-label">기준 연도</div>
                  <div className="rpt-cond-value">{year}년</div>
                </div>
                <div className="rpt-cond-cell">
                  <div className="rpt-cond-label">기준 월</div>
                  <div className="rpt-cond-value">{MONTHS[(month ?? 1) - 1]}</div>
                </div>
                <div className="rpt-cond-cell">
                  <div className="rpt-cond-label">조정 변수 수</div>
                  <div className="rpt-cond-value">{tableRows.length}개</div>
                </div>
              </div>
            </div>

            {/* 핵심 예측 결과 */}
            <div className="rpt-section">
              <div className="rpt-section-title">핵심 예측 결과</div>
              <div className="rpt-result-row">
                <div className="rpt-result-cell">
                  <div className="rpt-result-label">기존 LST</div>
                  <div className="rpt-result-val">{beforeLST?.toFixed(1) ?? '—'}°C</div>
                </div>
                <div className="rpt-result-arrow">→</div>
                <div className="rpt-result-cell">
                  <div className="rpt-result-label">정책 적용 후</div>
                  <div className="rpt-result-val">{afterLST?.toFixed(1) ?? '—'}°C</div>
                </div>
                <div className="rpt-result-arrow">=</div>
                <div className="rpt-result-cell">
                  <div className="rpt-result-label">예상 변화량</div>
                  <div className={`rpt-result-val rpt-delta ${deltaLST < 0 ? 'cool' : deltaLST > 0 ? 'warm' : ''}`}>
                    {deltaLST > 0 ? '+' : ''}{deltaLST?.toFixed(2) ?? '0.00'}°C
                  </div>
                </div>
                <div className="rpt-result-cell">
                  <div className="rpt-result-label">오차 범위</div>
                  <div className="rpt-result-val rpt-small">±0.4°C</div>
                </div>
              </div>
            </div>

            {/* 사업비 요약 */}
            <div className="rpt-section">
              <div className="rpt-section-title">사업비 요약</div>
              <div className="rpt-cond-row">
                <div className="rpt-cond-cell">
                  <div className="rpt-cond-label">총 예상 사업비</div>
                  <div className="rpt-cond-value">{totalCost > 0 ? totalCost.toLocaleString() + '원' : '—'}</div>
                </div>
                {efficiency && (
                  <div className="rpt-cond-cell">
                    <div className="rpt-cond-label">1억원당 냉각효과</div>
                    <div className="rpt-cond-value">{efficiency}°C / 억원</div>
                  </div>
                )}
                <div className="rpt-cond-cell">
                  <div className="rpt-cond-label">면적 기반 비용 포함</div>
                  <div className="rpt-cond-value">
                    {tableRows.some((r) => r.needsArea) ? '일부 미산정' : '전체 산정'}
                  </div>
                </div>
              </div>
            </div>

            {/* 변수별 조정 현황 테이블 */}
            {tableRows.length > 0 && (
              <div className="rpt-section">
                <div className="rpt-section-title">변수별 조정 현황</div>
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th>정책 변수</th>
                      <th>기존값</th>
                      <th>조정값</th>
                      <th>ΔLST</th>
                      <th>관련 정책</th>
                      <th>예상 사업비</th>
                      <th>난이도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => {
                      const dLst = row.deltaLST
                      return (
                        <tr key={row.key}>
                          <td className="rpt-td-bold">{row.label}</td>
                          <td className="rpt-td-num">{row.baseline}</td>
                          <td className="rpt-td-num">{row.adjusted}</td>
                          <td className={`rpt-td-num ${dLst < 0 ? 'cool' : dLst > 0 ? 'warm' : ''}`}>
                            {dLst != null
                              ? `${dLst > 0 ? '+' : ''}${dLst.toFixed(2)}°C`
                              : '—'}
                          </td>
                          <td>{row.relatedPolicy}</td>
                          <td className="rpt-td-num">{row.cost}</td>
                          <td>
                            <span className={`difficulty difficulty-${row.difficulty?.level}`}>
                              {row.difficulty?.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {tableRows.length === 0 && (
              <div className="rpt-empty">조정된 정책 변수가 없습니다. Step 2에서 슬라이더를 조정해 주세요.</div>
            )}
          </div>

          {/* ─── PAGE 2 ─── */}
          <div className="export-page">
            <div className="rpt-header">
              <div>
                <div className="rpt-logo">🌡 서울시 UHI AI 시뮬레이터</div>
                <div className="rpt-subtitle-sm">Urban Heat Island 정책 효과 분석 시스템</div>
              </div>
              <div className="rpt-meta-right">
                <div>{today} 생성</div>
                <div className="rpt-page-label">2 / 2</div>
              </div>
            </div>

            <div className="rpt-title">추천 인사이트 리포트</div>
            <div className="rpt-subtitle-main">{dongName} 정책 효과 분석 인사이트</div>

            {/* 핵심 인사이트 */}
            <div className="rpt-section">
              <div className="rpt-section-title">
                핵심 인사이트
                {insight?.ai_generated && (
                  <span className="rpt-ai-badge">
                    {insight.ai_provider === 'claude' ? 'AI(Claude)' : 'AI(Gemini)'}
                  </span>
                )}
              </div>
              <div className="rpt-insight-box">
                {insight?.summary || '시뮬레이션 결과를 분석 중입니다. Step 3로 이동한 후 분석이 완료되면 다시 내보내기 해주세요.'}
              </div>
            </div>

            {/* 비용 효율 분석 */}
            {totalCost > 0 && (
              <div className="rpt-section">
                <div className="rpt-section-title">비용 효율 분석</div>
                <div className="rpt-cond-row">
                  <div className="rpt-cond-cell">
                    <div className="rpt-cond-label">총 LST 저감</div>
                    <div className="rpt-cond-value cool">
                      {deltaLST < 0 ? `${Math.abs(deltaLST).toFixed(2)}°C` : '—'}
                    </div>
                  </div>
                  <div className="rpt-cond-cell">
                    <div className="rpt-cond-label">총 예상 사업비</div>
                    <div className="rpt-cond-value">{totalCost.toLocaleString()}원</div>
                  </div>
                  {efficiency && (
                    <div className="rpt-cond-cell">
                      <div className="rpt-cond-label">1억원당 냉각효과</div>
                      <div className="rpt-cond-value cool">{efficiency}°C / 억원</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 추천 정책 순위 */}
            {ranked.length > 0 && (
              <div className="rpt-section">
                <div className="rpt-section-title">추천 정책 순위 (LST 저감 효과 기준)</div>
                <div className="rpt-ranking">
                  {ranked.map((row, i) => (
                    <div key={row.key} className="rpt-rank-row">
                      <div className={`rpt-rank-badge rpt-rank-${i + 1}`}>{i + 1}순위</div>
                      <div className="rpt-rank-body">
                        <div className="rpt-rank-name">{row.label}</div>
                        <div className="rpt-rank-detail">
                          {row.relatedPolicy}
                          {row.deltaLST != null && ` · ΔLST ${row.deltaLST.toFixed(2)}°C`}
                          {row.costNum > 0 && ` · ${fmtWon(row.costNum)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 정책 적용 방향 */}
            <div className="rpt-section">
              <div className="rpt-section-title">정책 적용 방향</div>
              <p className="rpt-text">
                {insight?.outlook ||
                  '단기적으로 그늘막 설치와 쿨루프 도색이 즉시 효과를 볼 수 있으며, 중장기적으로는 녹지 확대와 건물 밀도 관리가 지속적 LST 저감에 효과적입니다.'}
              </p>
            </div>

            {/* 유의사항 */}
            <div className="rpt-section">
              <div className="rpt-section-title">유의사항</div>
              <p className="rpt-caution">
                {insight?.caution ||
                  '본 시뮬레이션은 LightGBM 머신러닝 모델 기반 추정치이며, 실제 정책 효과와 차이가 있을 수 있습니다. 변수 간 상호작용 효과는 일부만 반영되어 있으며, 현장 실사 및 전문가 검토를 병행하여 정책 의사결정에 활용하시기 바랍니다.'}
              </p>
            </div>

            {/* 푸터 */}
            <div className="rpt-footer">
              <div>서울시 UHI AI 시뮬레이터 · {today}</div>
              <div>본 보고서는 LightGBM 모델 기반 예측 결과이며 행정 참고용입니다.</div>
            </div>
          </div>

        </div>{/* /export-print-area */}
      </div>
    </div>,
    document.body
  )
}
