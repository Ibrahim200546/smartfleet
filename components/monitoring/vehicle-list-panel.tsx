'use client'

import { Gauge, MapPin, Star, Truck, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { STATUS_META, timeAgo } from '@/lib/format'
import type { Vehicle, VehicleStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | VehicleStatus | 'favorite'

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'moving', label: 'В движении' },
  { id: 'idle', label: 'Холостой' },
  { id: 'parked', label: 'Стоянка' },
  { id: 'offline', label: 'Нет связи' },
  { id: 'favorite', label: 'Избранное' },
]

interface VehicleListPanelProps {
  vehicles: Vehicle[]
  query: string
  selectedId: string | null
  now: number
  onSelect: (id: string) => void
  onToggleFavorite: (id: string) => void
}

export function VehicleListPanel({
  vehicles,
  query,
  selectedId,
  now,
  onSelect,
  onToggleFavorite,
}: VehicleListPanelProps) {
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vehicles.filter((v) => {
      if (filter === 'favorite' && !v.favorite) return false
      if (filter !== 'all' && filter !== 'favorite' && v.status !== filter)
        return false
      if (!q) return true
      return (
        v.name.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        (v.driver?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [vehicles, query, filter])

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
    <div className="hidden w-full flex-col overflow-hidden border-r border-border bg-card/40 md:flex md:w-80">
      <div className="border-b border-border px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Truck className="size-4 text-primary" />
            Транспорт
            <span className="text-muted-foreground">· {vehicles.length}</span>
          </h2>
        </div>
        <div className="thin-scroll -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
          {FILTERS.map((f) => {
            const count =
              f.id === 'all'
                ? vehicles.length
                : f.id === 'favorite'
                  ? vehicles.filter((v) => v.favorite).length
                  : (counts[f.id as VehicleStatus] ?? 0)
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  filter === f.id
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border bg-background/40 text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
                <span className="opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <ul className="thin-scroll flex-1 overflow-y-auto p-1.5">
        {filtered.length === 0 ? (
          <li className="flex flex-col items-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <MapPin className="size-7 opacity-40" />
            <p className="text-sm">Ничего не найдено</p>
            <p className="text-xs">Измените фильтр или поисковый запрос</p>
          </li>
        ) : (
          filtered.map((v) => {
            const meta = STATUS_META[v.status]
            const selected = v.id === selectedId
            return (
              <li key={v.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(v.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(v.id)
                    }
                  }}
                  className={cn(
                    'group mb-1 flex w-full cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-transparent hover:border-border hover:bg-accent/40',
                  )}
                >
                  <span className="relative mt-1 flex size-2.5 shrink-0">
                    {v.status === 'moving' || v.status === 'alarm' ? (
                      <span
                        className={cn(
                          'marker-pulse absolute inline-flex size-full rounded-full',
                          meta.dot,
                        )}
                      />
                    ) : null}
                    <span
                      className={cn(
                        'relative inline-flex size-2.5 rounded-full',
                        meta.dot,
                      )}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {v.name}
                      </span>
                      <span className="ml-auto shrink-0 rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {v.plate}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn('font-medium', meta.color)}>
                        {meta.label}
                      </span>
                      {v.status === 'moving' || v.status === 'idle' ? (
                        <span className="flex items-center gap-0.5">
                          <Gauge className="size-3" />
                          {v.speed} км/ч
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                      <User className="size-3 shrink-0" />
                      <span className="truncate">{v.driver ?? 'Без водителя'}</span>
                      <span className="ml-auto shrink-0">
                        {timeAgo(v.lastUpdate, now)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="В избранное"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(v.id)
                    }}
                    className="mt-0.5 rounded p-0.5 text-muted-foreground transition-colors hover:text-status-idle"
                  >
                    <Star
                      className={cn(
                        'size-3.5',
                        v.favorite && 'fill-status-idle text-status-idle',
                      )}
                    />
                  </button>
                </div>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
