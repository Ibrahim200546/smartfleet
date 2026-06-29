'use client'

import {
  BatteryFull,
  Compass,
  Fuel,
  Gauge,
  History,
  KeyRound,
  MapPin,
  Mountain,
  Navigation,
  Plug,
  Radio,
  Route,
  Satellite,
  Thermometer,
  Truck,
  User,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  STATUS_META,
  courseToCompass,
  formatNumber,
  formatTime,
  timeAgo,
} from '@/lib/format'
import type { Vehicle, VehicleEvent } from '@/lib/types'
import { cn } from '@/lib/utils'

const SEVERITY_COLOR: Record<VehicleEvent['severity'], string> = {
  info: 'bg-primary',
  warning: 'bg-status-idle',
  critical: 'bg-status-alarm',
}

interface VehicleDetailCardProps {
  vehicle: Vehicle | null
  events: VehicleEvent[]
  now: number
  onClose: () => void
}

export function VehicleDetailCard({
  vehicle,
  events,
  now,
  onClose,
}: VehicleDetailCardProps) {
  if (!vehicle) {
    return (
      <div className="hidden w-80 shrink-0 flex-col items-center justify-center gap-3 border-l border-border bg-card/40 px-6 text-center xl:flex">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-accent/60 text-muted-foreground">
          <Truck className="size-6" />
        </div>
        <p className="text-sm font-medium">Транспорт не выбран</p>
        <p className="text-xs text-muted-foreground">
          Выберите ТС в списке или на карте, чтобы увидеть подробную телеметрию,
          датчики и историю событий.
        </p>
      </div>
    )
  }

  const meta = STATUS_META[vehicle.status]
  const vehicleEvents = events.filter((e) => e.vehicleId === vehicle.id).slice(0, 6)

  return (
    <div className="flex w-full shrink-0 flex-col overflow-hidden border-l border-border bg-card/40 xl:w-80">
      {/* Шапка */}
      <div className="relative border-b border-border bg-gradient-to-b from-accent/40 to-transparent px-4 pb-3 pt-3.5">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Закрыть карточку"
          onClick={onClose}
          className="absolute right-2.5 top-2.5"
        >
          <X className="size-4" />
        </Button>
        <div className="flex items-start gap-3 pr-7">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Truck className="size-5.5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold leading-tight">
              {vehicle.name}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {vehicle.plate}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  meta.color,
                )}
              >
                <span className={cn('size-1.5 rounded-full', meta.dot)} />
                {meta.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto">
        {/* Ключевые показатели */}
        <div className="grid grid-cols-2 gap-px bg-border">
          <BigStat
            icon={Gauge}
            label="Скорость"
            value={`${vehicle.speed}`}
            unit="км/ч"
          />
          <BigStat
            icon={Compass}
            label="Курс"
            value={courseToCompass(vehicle.course)}
            unit={`${Math.round(vehicle.course)}°`}
          />
        </div>

        {/* Топливо и заряд */}
        <div className="space-y-3 border-b border-border p-4">
          <MeterRow
            icon={Fuel}
            label="Топливо"
            value={vehicle.sensors.fuel}
            display={`${Math.round(vehicle.sensors.fuel)}%`}
            tone={vehicle.sensors.fuel < 15 ? 'alarm' : 'primary'}
          />
          <MeterRow
            icon={BatteryFull}
            label="АКБ трекера"
            value={vehicle.sensors.battery}
            display={`${vehicle.sensors.battery}%`}
            tone={vehicle.sensors.battery < 20 ? 'alarm' : 'moving'}
          />
        </div>

        {/* Телеметрия */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-b border-border p-4 text-sm">
          <InfoRow icon={KeyRound} label="Зажигание">
            <span className={vehicle.sensors.ignition ? 'text-status-moving' : 'text-muted-foreground'}>
              {vehicle.sensors.ignition ? 'Вкл' : 'Выкл'}
            </span>
          </InfoRow>
          <InfoRow icon={Plug} label="Питание">
            {vehicle.sensors.voltage} В
          </InfoRow>
          <InfoRow icon={Satellite} label="Спутники">
            {vehicle.sensors.satellites}
          </InfoRow>
          <InfoRow icon={Thermometer} label="Температура">
            {vehicle.sensors.temperature}°C
          </InfoRow>
          <InfoRow icon={Mountain} label="Высота">
            {vehicle.sensors.altitude} м
          </InfoRow>
          <InfoRow icon={Route} label="Пробег">
            {formatNumber(vehicle.odometer)} км
          </InfoRow>
        </div>

        {/* Объект и связь */}
        <div className="space-y-2.5 border-b border-border p-4 text-sm">
          <LineRow icon={User} label="Водитель">
            {vehicle.driver ?? 'Не назначен'}
          </LineRow>
          <LineRow icon={Radio} label="Трекер">
            {vehicle.protocol}
          </LineRow>
          <LineRow icon={Navigation} label="IMEI" mono>
            {vehicle.imei}
          </LineRow>
          <LineRow icon={MapPin} label="Адрес">
            {vehicle.address}
          </LineRow>
          <LineRow icon={History} label="Связь">
            {timeAgo(vehicle.lastUpdate, now)} · {formatTime(vehicle.lastUpdate)}
          </LineRow>
          <div className="pt-0.5 font-mono text-[11px] text-muted-foreground">
            {vehicle.position.lat.toFixed(5)}, {vehicle.position.lng.toFixed(5)}
          </div>
        </div>

        {/* События */}
        <div className="p-4">
          <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Последние события
          </h4>
          {vehicleEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Событий нет</p>
          ) : (
            <ul className="space-y-2.5">
              {vehicleEvents.map((e) => (
                <li key={e.id} className="flex gap-2.5">
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      SEVERITY_COLOR[e.severity],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug text-foreground">
                      {e.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {timeAgo(e.timestamp, now)} · {formatTime(e.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Действия */}
      <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
        <Button variant="secondary" size="sm">
          <Route className="size-3.5" />
          История
        </Button>
        <Button variant="outline" size="sm">
          <Navigation className="size-3.5" />
          Маршрут
        </Button>
      </div>
    </div>
  )
}

function BigStat({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: LucideIcon
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="bg-card/60 px-4 py-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

function MeterRow({
  icon: Icon,
  label,
  value,
  display,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  display: string
  tone: 'primary' | 'moving' | 'alarm'
}) {
  const toneClass =
    tone === 'alarm'
      ? 'bg-status-alarm'
      : tone === 'moving'
        ? 'bg-status-moving'
        : 'bg-primary'
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </span>
        <span className="font-medium tabular-nums">{display}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-accent">
        <div
          className={cn('h-full rounded-full transition-all', toneClass)}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-0.5 font-medium tabular-nums">{children}</div>
    </div>
  )
}

function LineRow({
  icon: Icon,
  label,
  children,
  mono,
}: {
  icon: LucideIcon
  label: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'min-w-0 flex-1 text-right text-xs font-medium',
          mono && 'font-mono',
        )}
      >
        {children}
      </span>
    </div>
  )
}
