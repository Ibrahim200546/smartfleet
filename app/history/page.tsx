import { Clock, MapPinned, Play, Route } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { MetricCard, SectionCard } from '@/components/layout/cards'
import { buttonVariants } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { createVehicles } from '@/lib/mock-data'

const vehicles = createVehicles()

export default function HistoryPage() {
  const distance = vehicles.slice(0, 8).reduce((sum, vehicle) => sum + vehicle.route.length * 0.08, 0)

  return (
    <AppShell
      title="История маршрутов"
      description="Фильтр по периоду, трек на карте, стоянки и воспроизведение"
      actions={<Link href="/monitoring" className={buttonVariants({ size: 'sm' })}><MapPinned className="size-3.5" />На карту</Link>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Route} label="Маршрутов" value={vehicles.length} />
        <MetricCard icon={Clock} label="Период" value="24 ч" helper="По умолчанию" />
        <MetricCard icon={Route} label="Дистанция" value={`${formatNumber(distance)} км`} tone="moving" />
      </div>

      <SectionCard className="mt-4" title="Последние маршруты" description="В backend это таблица `routes` + выборка telemetry за период">
        <div className="grid gap-3">
          {vehicles.slice(0, 9).map((vehicle, index) => (
            <article key={vehicle.id} className="grid gap-3 rounded-xl border border-border bg-background/40 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <div className="font-medium">{vehicle.name} · {vehicle.plate}</div>
                <div className="mt-1 text-sm text-muted-foreground">{vehicle.address} → контрольная точка №{index + 1}</div>
              </div>
              <div className="text-sm text-muted-foreground md:text-right">
                <div>{formatNumber(vehicle.route.length * 0.08)} км</div>
                <div className="text-xs">{Math.round(vehicle.route.length / 8)} мин движения</div>
              </div>
              <button className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <Play className="size-3.5" />
                Воспроизвести
              </button>
            </article>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  )
}
