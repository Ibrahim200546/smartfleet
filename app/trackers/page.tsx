import { Radio, ShieldCheck, Signal, Wifi, WifiOff } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { MetricCard, SectionCard } from '@/components/layout/cards'
import { buttonVariants } from '@/components/ui/button'
import { timeAgo } from '@/lib/format'
import { createVehicles } from '@/lib/mock-data'

const vehicles = createVehicles()

export default function TrackersPage() {
  const online = vehicles.filter((vehicle) => vehicle.status !== 'offline').length
  const teltonika = vehicles.filter((vehicle) => vehicle.protocol.toLowerCase().includes('teltonika')).length

  return (
    <AppShell
      title="GPS трекеры"
      description="IMEI, протоколы, привязки к ТС и состояние связи"
      actions={<button className={buttonVariants({ size: 'sm' })}>Добавить трекер</button>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Radio} label="Всего устройств" value={vehicles.length} />
        <MetricCard icon={Wifi} label="Онлайн" value={online} tone="moving" helper="Данные получены недавно" />
        <MetricCard icon={ShieldCheck} label="Teltonika" value={teltonika} helper="Codec 8 / 8E / 16" />
      </div>

      <SectionCard className="mt-4" title="Устройства" description="Handshake по IMEI выполняет backend TCP-сервер">
        <div className="grid gap-3 lg:grid-cols-2">
          {vehicles.map((vehicle) => {
            const isOnline = vehicle.status !== 'offline'
            return (
              <article key={vehicle.id} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{vehicle.tracker}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">IMEI {vehicle.imei}</div>
                  </div>
                  <span className={isOnline ? 'text-status-moving' : 'text-status-offline'}>
                    {isOnline ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Info label="Протокол" value={vehicle.protocol} />
                  <Info label="ТС" value={vehicle.plate} />
                  <Info label="Последний пакет" value={timeAgo(vehicle.lastUpdate)} />
                  <Info label="GSM/GNSS" value={`${vehicle.sensors.satellites} спутн.`} />
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <Signal className="size-3.5" />
                  TCP ingest → parser → `/fleet/snapshot` → frontend
                </div>
              </article>
            )
          })}
        </div>
      </SectionCard>
    </AppShell>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  )
}
