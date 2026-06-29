import { Flag, Map, Navigation, Route, Waypoints } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { MetricCard, SectionCard } from '@/components/layout/cards'
import { buttonVariants } from '@/components/ui/button'

const plannedRoutes = [
  ['Склад Север → Клиент Центр', '5 точек', '42 км', 'OSRM'],
  ['База → МКАД → РЦ Восток', '7 точек', '86 км', 'GraphHopper'],
  ['Доставка Юг', '4 точки', '31 км', 'ручной'],
]

export default function RoutesPage() {
  return (
    <AppShell
      title="План маршрутов"
      description="Построение маршрута по контрольным точкам и внешним routing API"
      actions={<button className={buttonVariants({ size: 'sm' })}><Waypoints className="size-3.5" />Новый маршрут</button>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Route} label="Планов" value={plannedRoutes.length} />
        <MetricCard icon={Flag} label="Контрольные точки" value="16" helper="По активным маршрутам" />
        <MetricCard icon={Navigation} label="Routing API" value="OSRM" tone="moving" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Создать маршрут" description="Укажите старт, финиш и промежуточные точки">
          <div className="space-y-3">
            {['Старт', 'Точка 1', 'Точка 2', 'Финиш'].map((label) => (
              <label key={label} className="block">
                <span className="text-xs text-muted-foreground">{label}</span>
                <input className="mt-1 h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm outline-none" placeholder="Адрес или координаты" />
              </label>
            ))}
            <button className={buttonVariants({ className: 'w-full' })}>Рассчитать маршрут</button>
          </div>
        </SectionCard>

        <SectionCard title="Запланированные маршруты" description="Можно назначить на ТС и сравнивать факт с планом">
          <div className="space-y-3">
            {plannedRoutes.map(([name, points, distance, engine]) => (
              <article key={name} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{points} · {distance} · {engine}</div>
                  </div>
                  <Map className="size-4 text-primary" />
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  )
}
