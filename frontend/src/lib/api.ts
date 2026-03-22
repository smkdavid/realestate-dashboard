import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 15000,
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error('API error:', err.response?.data ?? err.message)
    return Promise.reject(err)
  },
)

interface DateRangeParams {
  days?: number
  start_date?: string
  end_date?: string
}

// ── 가격 지수 ──
export const fetchRebPriceIndex = (params: {
  region_code?: string
  price_type?: string
} & DateRangeParams) => api.get('/price-index/reb', { params }).then(r => r.data)

export const fetchKbPriceIndex = (params: {
  region_code?: string
  price_type?: string
} & DateRangeParams) => api.get('/price-index/kb', { params }).then(r => r.data)

export const fetchKbSentiment = (params: {
  region_code?: string
} & DateRangeParams) => api.get('/price-index/sentiment', { params }).then(r => r.data)

// ── 지역 목록 ──
export const fetchKbPriceRegions = () =>
  api.get('/price-index/kb/regions').then(r => r.data as { code: string; name: string }[])

export const fetchKbSentimentRegions = () =>
  api.get('/price-index/kb/sentiment/regions').then(r => r.data as { code: string; name: string }[])

// ── KB 상세 분석 ──
export const fetchKbAvailableDates = (price_type = 'buy') =>
  api.get('/price-index/kb/available-dates', { params: { price_type } }).then(r => r.data as string[])

export const fetchKbTopMovers = (params: {
  price_type?: string; survey_date?: string; limit?: number
}) => api.get('/price-index/kb/top-movers', { params }).then(r => r.data)

export const fetchKbTopMoversRange = (params: {
  price_type?: string; start_date: string; end_date: string; limit?: number
}) => api.get('/price-index/kb/top-movers-range', { params }).then(r => r.data)

export const fetchKbSnapshot = (params: {
  price_type?: string; survey_date?: string
}) => api.get('/price-index/kb/snapshot', { params }).then(r => r.data)

export const fetchKbHeatmap = (params: {
  price_type?: string; start_date?: string; end_date?: string
}) => api.get('/price-index/kb/heatmap', { params, timeout: 30000 }).then(r => r.data)

export const fetchKbChargingIndex = (params: {
  region_codes?: string; start_date?: string; end_date?: string
}) => api.get('/price-index/kb/charging-index', { params }).then(r => r.data)

// ── 실거주지수 ──
export const fetchLivingIndex = (params: {
  region_code?: string
  limit?: number
}) => api.get('/living-index', { params }).then(r => r.data)

export const fetchLivingIndexLatest = () =>
  api.get('/living-index/latest').then(r => r.data)

// ── 경제지표 ──
export const fetchEconomy = (params: {
  indicator?: string
  limit?: number
} & DateRangeParams) => api.get('/economy', { params }).then(r => r.data)

export const fetchEconomyLatest = () =>
  api.get('/economy/latest').then(r => r.data)
