'use client'

import { Activity, Clock, Wifi, WifiOff } from 'lucide-react'
import { useMemo } from 'react'
import { STATUS_META, formatTime } from '@/lib/format'
import type { Vehicle, VehicleStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatusBarProps {
  vehicles: Vehicle[]
  live: boolean
  now: number
}

const ORDER: VehicleStatus[] = ['moving', 'idle', 'parked', 'offline', 'alarm']

export function StatusBar({ vehicles, live, now }: StatusBarProps) {
  const counts = useMemo(() => {
    return vehicles.reduce(
      (acc, v) => {
        acc[v.status] = (acc[v.status] ?? 0) + 1
        return acc
      },
      {} as Record<VehicleStatus, number>,
    )
  }, [vehicles])

  return (
    <footer className="flex h-9 shrink-0 items-center gap-4 overflow-x-auto border-t border-border bg-card/60 px-3 text-xs backdrop-blur-md md:px-4">
      <div className="flex items-center gap-1.5 font-medium">
        <Activity className="size-3.5 text-primary" />
        Всего: {vehicles.length}
      </div>

      <div className="h-3.5 w-px bg-border" />

      <div className="flex items-center gap-3">
        {ORDER.map((s) => (
          <div key={s} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={cn('size-2 rounded-full', STATUS_META[s].dot)} />
            <span className="text-muted-foreground">{STATUS_META[s].label}</span>
            <span className="font-medium tabular-nums">{counts[s] ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
          <Clock className="size-3.5" />
          Обновлено: {formatTime(now)}
        </span>
        <span
          className={cn(
            'flex items-center gap-1.5 font-medium',
            live ? 'text-status-moving' : 'text-muted-foreground',
          )}
        >
          {live ? (
            <Wifi className="size-3.5" />
          ) : (
            <WifiOff className="size-3.5" />
          )}
          {live ? 'Онлайн' : 'Пауза'}
        </span>
      </div>
    </footer>
  )
}
