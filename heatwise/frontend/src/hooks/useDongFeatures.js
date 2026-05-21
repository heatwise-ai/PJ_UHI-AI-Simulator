import { useEffect, useState } from 'react'
import { api } from '../api'

/**
 * 선택된 동·연·월의 모든 변수 현재값 + 슬라이더 범위
 * features[col] = current_value
 * sliderBounds[col] = { safeLow, safeHigh, step, direction }
 */
export function useDongFeatures(selectedDong, year, month, nameToCode) {
  const [features, setFeatures] = useState({})
  const [sliderBounds, setSliderBounds] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedDong || !nameToCode[selectedDong]) {
      setFeatures({})
      setSliderBounds({})
      return
    }

    setLoading(true)
    const adm_cd = String(nameToCode[selectedDong])

    Promise.all([
      api.getSummary(adm_cd, year, month),
      api.getSliderConfig(adm_cd, year, month),
    ])
      .then(([summary, sliderConfig]) => {
        const feats = {}
        const bounds = {}

        sliderConfig.forEach((s) => {
          feats[s.col] = s.current_value
          bounds[s.col] = {
            safeLow: s.safe_low,
            safeHigh: s.safe_high,
            step: s.step,
            direction: s.direction === 'up' ? 'increase' : 'decrease',
          }
        })

        feats['LST'] = summary.current_lst
        feats['avg_temp (℃)'] = summary.background?.avg_temp ?? null
        feats['season'] = summary.background?.season ?? null

        setFeatures(feats)
        setSliderBounds(bounds)
        setLoading(false)
      })
      .catch((e) => {
        console.error('useDongFeatures error:', e)
        setLoading(false)
      })
  }, [selectedDong, year, month])

  return { features, sliderBounds, loading }
}
