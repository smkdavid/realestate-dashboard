import { useQuery } from '@tanstack/react-query'
import {
  fetchRebPriceIndex, fetchKbPriceIndex, fetchKbSentiment,
  fetchKbPriceRegions, fetchKbSentimentRegions,
  fetchKbAvailableDates, fetchKbTopMovers, fetchKbSnapshot,
  fetchKbHeatmap, fetchKbChargingIndex,
  fetchLivingIndex, fetchLivingIndexLatest,
  fetchEconomy, fetchEconomyLatest,
} from '@/lib/api'

export const useKbPriceRegions = () =>
  useQuery({
    queryKey: ['kb-price-regions'],
    queryFn: fetchKbPriceRegions,
    staleTime: 1000 * 60 * 60,
  })

export const useKbSentimentRegions = () =>
  useQuery({
    queryKey: ['kb-sentiment-regions'],
    queryFn: fetchKbSentimentRegions,
    staleTime: 1000 * 60 * 60,
  })

interface DateRange {
  startDate?: string
  endDate?: string
}

export const useRebPriceIndex = (region_code: string, price_type: string, weeks = 52) =>
  useQuery({
    queryKey: ['reb-price', region_code, price_type, weeks],
    queryFn: () => fetchRebPriceIndex({ region_code, price_type, days: weeks * 7 }),
  })

// KB 데이터는 2023-07-10까지만 있으므로 충분히 긴 기간 기본값 사용
export const useKbPriceIndex = (
  region_code: string,
  price_type: string,
  weeks = 200,
  range?: DateRange,
) =>
  useQuery({
    queryKey: ['kb-price', region_code, price_type, weeks, range?.startDate, range?.endDate],
    queryFn: () => fetchKbPriceIndex({
      region_code,
      price_type,
      ...(range?.startDate && range?.endDate
        ? { start_date: range.startDate, end_date: range.endDate }
        : { days: weeks * 7 }),
    }),
  })

export const useKbSentiment = (region_code: string, weeks = 200, range?: DateRange) =>
  useQuery({
    queryKey: ['kb-sentiment', region_code, weeks, range?.startDate, range?.endDate],
    queryFn: () => fetchKbSentiment({
      region_code,
      ...(range?.startDate && range?.endDate
        ? { start_date: range.startDate, end_date: range.endDate }
        : { days: weeks * 7 }),
    }),
  })

export const useLivingIndex = (region_code: string, limit = 52) =>
  useQuery({
    queryKey: ['living-index', region_code],
    queryFn: () => fetchLivingIndex({ region_code, limit }),
  })

export const useLivingIndexLatest = () =>
  useQuery({
    queryKey: ['living-index-latest'],
    queryFn: fetchLivingIndexLatest,
  })

export const useEconomy = (indicator: string, weeks = 60, range?: DateRange) =>
  useQuery({
    queryKey: ['economy', indicator, weeks, range?.startDate, range?.endDate],
    queryFn: () => fetchEconomy({
      indicator,
      ...(range?.startDate && range?.endDate
        ? { start_date: range.startDate, end_date: range.endDate }
        : { days: weeks * 7 }),
    }),
  })

export const useEconomyLatest = () =>
  useQuery({
    queryKey: ['economy-latest'],
    queryFn: fetchEconomyLatest,
  })

// ── KB 상세 분석 ──
export const useKbAvailableDates = (priceType = 'buy') =>
  useQuery({
    queryKey: ['kb-available-dates', priceType],
    queryFn: () => fetchKbAvailableDates(priceType),
    staleTime: 1000 * 60 * 30,
  })

export const useKbTopMovers = (priceType = 'buy', surveyDate?: string, limit = 10) =>
  useQuery({
    queryKey: ['kb-top-movers', priceType, surveyDate, limit],
    queryFn: () => fetchKbTopMovers({ price_type: priceType, survey_date: surveyDate, limit }),
  })

export const useKbSnapshot = (priceType = 'buy', surveyDate?: string) =>
  useQuery({
    queryKey: ['kb-snapshot', priceType, surveyDate],
    queryFn: () => fetchKbSnapshot({ price_type: priceType, survey_date: surveyDate }),
  })

export const useKbHeatmap = (priceType = 'buy', startDate?: string, endDate?: string) =>
  useQuery({
    queryKey: ['kb-heatmap', priceType, startDate, endDate],
    queryFn: () => fetchKbHeatmap({ price_type: priceType, start_date: startDate, end_date: endDate }),
    staleTime: 1000 * 60 * 10,
  })

export const useKbChargingIndex = (regionCodes: string, startDate?: string, endDate?: string) =>
  useQuery({
    queryKey: ['kb-charging', regionCodes, startDate, endDate],
    queryFn: () => fetchKbChargingIndex({ region_codes: regionCodes, start_date: startDate, end_date: endDate }),
    enabled: !!regionCodes,
  })
