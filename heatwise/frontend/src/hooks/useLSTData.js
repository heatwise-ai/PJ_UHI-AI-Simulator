import { useEffect, useState } from 'react'
import { computeLSTRange } from '../utils/colorScale'
import { api } from '../api'

/**
 * 행정동별 LST + 메타 데이터 로드 (백엔드 API 사용)
 * - 키: adm_cd 8자리 (예: '11010530')
 * - dongInfo: { '11010530': { guName: '종로구', dongName: '사직동' } }
 */
export function useLSTData(year, month) {
  const [data, setData] = useState({
    lstByDong: {},
    dongInfo: {},
    dongsByGu: {},
    nameToCode: {},
    seoulAvg: null,
    lstRange: { min: 15, max: 35 },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    Promise.all([
      api.getDongList(),
      api.getAllLst(year, month),
    ])
      .then(([dongList, lstList]) => {
        const dongInfo = {}
        const dongsByGu = {}

        dongList.forEach((d) => {
          const code = String(d.adm_cd)
          dongInfo[code] = { guName: d.gu_nm, dongName: d.adm_nm }
          if (!dongsByGu[d.gu_nm]) dongsByGu[d.gu_nm] = []
          dongsByGu[d.gu_nm].push(code)
        })

        const lstByDong = {}
        const lstValues = []
        lstList.forEach((item) => {
          const code = String(item.adm_cd)
          if (item.lst != null) {
            lstByDong[code] = item.lst
            lstValues.push(item.lst)
          }
        })

        const seoulAvg =
          lstValues.length > 0
            ? lstValues.reduce((a, b) => a + b, 0) / lstValues.length
            : null

        const lstRange = computeLSTRange(lstValues)

        // nameToCode: selectedDong is already adm_cd, so identity mapping
        const nameToCode = {}
        Object.keys(dongInfo).forEach((code) => {
          nameToCode[code] = code
        })

        console.log(
          `[LST 매핑] ${year}년 ${month}월: ${Object.keys(lstByDong).length}개 행정동, ` +
            `서울평균 ${seoulAvg?.toFixed(1)}°C, 범위 ${lstRange.min}~${lstRange.max}°C`
        )

        setData({ lstByDong, dongInfo, dongsByGu, nameToCode, seoulAvg, lstRange })
        setLoading(false)
      })
      .catch((e) => {
        console.error('useLSTData error:', e)
        setLoading(false)
      })
  }, [year, month])

  return { ...data, loading }
}
