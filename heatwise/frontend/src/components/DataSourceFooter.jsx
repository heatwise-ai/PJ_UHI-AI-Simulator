const SOURCES = [
    {
      label: 'LST·NDVI·NDBI·Albedo (위성)',
      detail: 'Landsat 8/9 (USGS) · MODIS',
      url: 'https://earthexplorer.usgs.gov/',
    },
    {
      label: '행정동 경계',
      detail: '행정안전부 (vuski/admdongkor)',
      url: 'https://github.com/vuski/admdongkor',
    },
    {
      label: '정책 변수 (녹지·가로수·그늘막 등)',
      detail: '서울 열린데이터 광장',
      url: 'https://data.seoul.go.kr/',
    },
    {
      label: '기상 변수',
      detail: '기상청 ASOS',
      url: 'https://data.kma.go.kr/',
    },
  ]

  const REFERENCES = [
    {
      label: '쿨루프 보급사업',
      detail: '서울시 환경에너지공사',
      url: 'https://www.seoul.go.kr/',
    },
    {
      label: '도시 열섬 완화 가이드라인',
      detail: '서울연구원',
      url: 'https://www.si.re.kr/',
    },
  ]

  function DataSourceFooter() {
    return (
      <details className="data-source-footer">
        <summary>📚 데이터 출처 및 참고 자료</summary>
        <div className="ds-section">
          <div className="ds-section-title">데이터 출처</div>
          <ul className="ds-list">
            {SOURCES.map((s) => (
              <li key={s.label}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
                <span className="ds-detail">{s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ds-section">
          <div className="ds-section-title">관련 정책·자료</div>
          <ul className="ds-list">
            {REFERENCES.map((r) => (
              <li key={r.label}>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.label}
                </a>
                <span className="ds-detail">{r.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ds-note">
          ※ 본 시뮬레이터는 학술 연구 목적으로 개발되었으며, 실제 정책 의사결정에는 추가 검토가 필요합니다.
        </div>
      </details>
    )
  }

  export default DataSourceFooter
