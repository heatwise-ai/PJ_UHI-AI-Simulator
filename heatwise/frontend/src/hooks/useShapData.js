import { useEffect, useState } from 'react'
import { api } from '../api'

/**
 * SHAP 데이터를 백엔드 /summary 에서 가져오는 hook
 * shap_top3: [{ feature, value }]
 */
export function useShapData(selectedDong, year, month, nameToCode, options = {}) {
  const [result, setResult] = useState({ shapTop3: [], shapAll: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedDong || !nameToCode || !nameToCode[selectedDong]) {
      setResult({ shapTop3: [], shapAll: [] })
      return
    }

    setLoading(true)
    const adm_cd = String(nameToCode[selectedDong])

    api
      .getSummary(adm_cd, year, month)
      .then((summary) => {
        const raw = summary.shap_top3 || []
        const shapTop3 = raw.map((item) => ({
          feature: item.feature,
          value: item.shap_value,
        }))
        setResult({ shapTop3, shapAll: shapTop3 })
        setLoading(false)
      })
      .catch((e) => {
        console.error('useShapData error:', e)
        setLoading(false)
      })
  }, [selectedDong, year, month])

  return { ...result, loading }
}
