import type { VehicleStatus } from './types'

export const STATUS_META: Record<
  VehicleStatus,
  { label: string; color: string; dot: string }
> = {
  moving: {
    label: 'В движении',
    color: 'text-status-moving',
    dot: 'bg-status-moving',
  },
  idle: { label: 'На холостом', color: 'text-status-idle', dot: 'bg-status-idle' },
  parked: {
    label: 'На стоянке',
    color: 'text-status-parked',
    dot: 'bg-status-parked',
  },
  offline: {
    label: 'Нет связи',
    color: 'text-status-offline',
    dot: 'bg-status-offline',
  },
  alarm: { label: 'Тревога', color: 'text-status-alarm', dot: 'bg-status-alarm' },
}

/** "5 мин назад", "2 ч назад" и т.п. */
export function timeAgo(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (diff < 5) return 'только что'
  if (diff < 60) return `${diff} сек назад`
  const min = Math.floor(diff / 60)
  if (min < 60) return `${min} мин назад`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  return `${days} дн назад`
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const COMPASS = [
  'С',
  'СВ',
  'В',
  'ЮВ',
  'Ю',
  'ЮЗ',
  'З',
  'СЗ',
] as const

export function courseToCompass(course: number): string {
  const index = Math.round(course / 45) % 8
  return COMPASS[index]
}
