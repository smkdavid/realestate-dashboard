import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt2(v: number | null | undefined): string {
  if (v == null) return '-'
  return v.toFixed(2)
}

export function fmtSigned(v: number | null | undefined): string {
  if (v == null) return '-'
  const s = v.toFixed(2)
  return v >= 0 ? `+${s}` : s
}

export function changeColor(v: number | null | undefined): string {
  if (v == null) return 'text-muted-foreground'
  if (v > 0) return 'text-red-400'
  if (v < 0) return 'text-blue-400'
  return 'text-muted-foreground'
}

export function livingIndexColor(v: number | null | undefined): string {
  if (v == null) return 'text-muted-foreground'
  if (v <= 100) return 'text-blue-400'
  return 'text-amber-400'
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '-'
  return d.slice(0, 10)
}

export const REGION_NAMES: Record<string, string> = {
  '0000': '전국', '1100': '서울', '4100': '경기', '2300': '인천',
  '2600': '부산', '2700': '대구', '2900': '광주', '3000': '대전',
  '3100': '울산', '3600': '세종', '4200': '강원', '4300': '충북',
  '4400': '충남', '4500': '전북', '4600': '전남', '4700': '경북',
  '4800': '경남', '5000': '제주',
}

export const REGIONS = Object.entries(REGION_NAMES).map(([code, name]) => ({ code, name }))

/**
 * Diverging color: red(positive) ↔ white ↔ blue(negative)
 * maxAbs: 절대값 최대치 (이 이상은 가장 진한 색)
 */
export function heatColor(value: number | null | undefined, maxAbs = 0.5): string {
  if (value == null || value === 0) return '#1f2937' // neutral dark gray
  const clamped = Math.max(-maxAbs, Math.min(maxAbs, value))
  const ratio = Math.abs(clamped) / maxAbs
  if (value > 0) {
    // white → red
    const r = 220
    const g = Math.round(220 - 180 * ratio)
    const b = Math.round(220 - 190 * ratio)
    return `rgb(${r},${g},${b})`
  } else {
    // white → blue
    const r = Math.round(220 - 190 * ratio)
    const g = Math.round(220 - 140 * ratio)
    const b = 220
    return `rgb(${r},${g},${b})`
  }
}

/** Dark-mode diverging heatmap: dark bg based */
export function heatColorDark(value: number | null | undefined, maxAbs = 0.5): string {
  if (value == null || value === 0) return '#1f2937'
  const clamped = Math.max(-maxAbs, Math.min(maxAbs, value))
  const ratio = Math.abs(clamped) / maxAbs
  if (value > 0) {
    const r = Math.round(30 + 200 * ratio)
    const g = Math.round(30 + 20 * ratio)
    const b = Math.round(30 + 20 * ratio)
    return `rgb(${r},${g},${b})`
  } else {
    const r = Math.round(30 + 20 * ratio)
    const g = Math.round(30 + 40 * ratio)
    const b = Math.round(30 + 200 * ratio)
    return `rgb(${r},${g},${b})`
  }
}
