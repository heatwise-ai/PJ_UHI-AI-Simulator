/**
 * GeoJSON ↔ API 매핑
 *
 * GeoJSON properties:
 *   - adm_cd: '11010530' (8자리, 백엔드 ADM_CD와 일치)
 *   - adm_nm: '사직동'
 *   - gu_nm: '종로구'
 */

/**
 * GeoJSON feature → 매칭 키 (8자리 코드)
 */
export function getMatchKey(feature) {
    const props = feature.properties || {}
    // adm_cd8 fallback for legacy GeoJSON, then adm_cd
    return props.adm_cd8 ? String(props.adm_cd8) : props.adm_cd ? String(props.adm_cd) : null
  }

  /**
   * 자치구 이름
   */
  export function getGuName(feature) {
    const props = feature.properties || {}
    return props.gu_nm || props.sggnm || ''
  }

  /**
   * 동 이름 추출
   */
  export function getDongName(feature) {
    const props = feature.properties || {}
    if (props.adm_nm) {
      // Handle both '사직동' and '서울특별시 종로구 사직동'
      const parts = props.adm_nm.split(' ')
      return parts[parts.length - 1]
    }
    return ''
  }

  /**
   * 서울 행정동 필터링 (이 GeoJSON은 서울만 포함)
   */
  export function isSeoul(feature) {
    const props = feature.properties || {}
    if (props.sidonm) return props.sidonm === '서울특별시'
    // GeoJSON with only Seoul data: always true
    return true
  }

  /**
   * adm_cd8 키 → 표시용 이름 (동만)
   * App에서 selectedDong은 코드(예: '11010530')가 됨
   */
  export function keyToDongName(key, lookupTable) {
    if (!key) return ''
    return lookupTable?.[key]?.dongName || key
  }

  export function keyToGuName(key, lookupTable) {
    if (!key) return ''
    return lookupTable?.[key]?.guName || ''
  }

  export function keyToDisplayName(key, lookupTable) {
    if (!key) return ''
    const info = lookupTable?.[key]
    if (info) return `${info.guName} ${info.dongName}`
    return key
  }
