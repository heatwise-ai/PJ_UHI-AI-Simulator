const BASE = import.meta.env.VITE_API_BASE_URL || ''

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const d = await res.json(); msg = d.detail || JSON.stringify(d) } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  getDongList: () => req('GET', '/summary/dong-list'),
  getYearsMonths: () => req('GET', '/summary/years-months'),
  getAllLst: (year, month) => req('GET', `/summary/all-lst?year=${year}&month=${month}`),
  getSummary: (adm_cd, year, month) => req('GET', `/summary?adm_cd=${adm_cd}&year=${year}&month=${month}`),
  getSliderConfig: (adm_cd, year, month) => req('GET', `/summary/slider-config?adm_cd=${adm_cd}&year=${year}&month=${month}`),
  simulate: (body) => req('POST', '/simulate', body),
  optimize: (body) => req('POST', '/optimize', body),
  insight: (body) => req('POST', '/insight', body),
}
