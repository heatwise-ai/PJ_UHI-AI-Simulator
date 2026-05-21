/**
 * LST 값 → 색상
 * 뜨거울수록 빨강, 시원할수록 초록
 */
export function lstToColor(lst, min = 15, max = 35) {
    if (lst == null || isNaN(lst)) return '#cccccc'

    const t = Math.max(0, Math.min(1, (lst - min) / (max - min)))

    let r, g, b
    if (t < 0.5) {
      const k = t * 2
      r = Math.round(120 + (255 - 120) * k)
      g = Math.round(200)
      b = Math.round(120 - 120 * k)
    } else {
      const k = (t - 0.5) * 2
      r = 255
      g = Math.round(200 - 200 * k)
      b = 0
    }

    return `rgb(${r}, ${g}, ${b})`
  }

  /**
   * LST 배열에서 동적 색상 범위 계산
   * - 5%~95% 분위수로 outlier 제거 (양 끝 5%는 클리핑)
   * - 너무 좁은 범위는 최소 5°C 폭 보장
   * - 0.5°C 단위로 round-down/up
   */
  export function computeLSTRange(lstValues) {
    if (!lstValues || lstValues.length === 0) {
      return { min: 15, max: 35 }
    }

    const sorted = [...lstValues].sort((a, b) => a - b)
    const p5 = sorted[Math.floor(sorted.length * 0.05)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]

    // 0.5 단위로 정리
    let min = Math.floor(p5 * 2) / 2
    let max = Math.ceil(p95 * 2) / 2

    // 너무 좁으면 강제로 5°C 폭
    if (max - min < 5) {
      const center = (min + max) / 2
      min = center - 2.5
      max = center + 2.5
    }

    return { min, max }
  }
