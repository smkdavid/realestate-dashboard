export interface RebPriceIndex {
  id: number
  survey_date: string
  region_code: string
  region_name: string
  price_type: 'buy' | 'rent'
  index_value: number
  weekly_change: number
  monthly_change: number
}

export interface KbPriceIndex {
  id: number
  survey_date: string
  region_code: string
  region_name: string
  buy_index: number
  rent_index: number
  jeonse_ratio: number
  weekly_change_buy: number
  weekly_change_rent: number
}

export interface KbSentiment {
  id: number
  survey_date: string
  region_code: string
  region_name: string
  buy_sell_index: number
  jeonse_supply_index: number
}

export interface LivingIndex {
  id: number
  calc_date: string
  region_code: string
  region_name: string
  buy_index: number
  rent_index: number
  jeonse_ratio: number
  conversion_rate: number
  mortgage_rate: number
  living_index: number
  monthly_saving: number
}

export interface EconomyIndex {
  id: number
  stat_date: string
  indicator: string
  value: number
  unit: string
  source: string
}

export interface LatestLivingIndex {
  region_code: string
  region_name: string
  living_index: number
  mortgage_rate: number
  jeonse_ratio: number
  calc_date: string
}
