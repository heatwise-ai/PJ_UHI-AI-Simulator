function EmptyState() {
    return (
      <div className="empty-state">
        <div className="empty-hero-title">
          <div className="empty-hero-sub">열섬 예측 및 진단 AI시뮬레이터(heatwise)를 통한</div>
          <div className="empty-hero-main">서울시 행정동별 열섬 완화 정책 지원</div>
        </div>
        <div className="empty-title">행정동을 선택하세요</div>
        <div className="empty-desc">
          지도에서 클릭하거나<br />
          상단 검색바를 이용해보세요
        </div>
        <div className="empty-tips">
          <div className="empty-tip-title">이 시뮬레이터로 할 수 있는 것</div>
          <ol>
            <li>현재 LST와 핵심 영향 변수 분석</li>
            <li>정책 변수를 조정해 효과 시뮬레이션</li>
            <li>비용·난이도까지 함께 검토</li>
          </ol>
        </div>
      </div>
    )
  }

  export default EmptyState
