import { Download, Plus, Search, Truck } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { MetricCard, SectionCard, StatusPill } from '@/components/layout/cards'
import { buttonVariants } from '@/components/ui/button'
import { formatNumber, timeAgo } from '@/lib/format'
import { createVehicles } from '@/lib/mock-data'

const vehicles = createVehicles()

export default function VehiclesPage() {
  const groups = new Set(vehicles.map((vehicle) => vehicle.group)).size
  const withDrivers = vehicles.filter((vehicle) => vehicle.driver).length
  const avgMileage = vehicles.reduce((sum, vehicle) => sum + vehicle.odometer, 0) / vehicles.length

  return (
    <AppShell
      title="Транспорт"
      description="Справочник ТС, привязка трекеров, статусы и быстрый поиск"
      actions={
        <div className="flex gap-2">
          <button className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Download className="size-3.5" />
            Экспорт
          </button>
          <button className={buttonVariants({ size: 'sm' })}>
            <Plus className="size-3.5" />
            Добавить ТС
          </button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Truck} label="Всего ТС" value={vehicles.length} />
        <MetricCard icon={Truck} label="Группы" value={groups} helper="Подразделения автопарка" tone="muted" />
        <MetricCard icon={Truck} label="Средний пробег" value={`${formatNumber(avgMileage)} км`} helper={`${withDrivers} с водителями`} />
      </div>

      <SectionCard
        className="mt-4"
        title="Реестр транспорта"
        description="В релизе эти данные загружаются из API `/vehicles` и `fleet/snapshot`"
        action={
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Поиск по номеру или водителю"
              className="h-8 w-64 rounded-lg border border-border bg-background/60 pl-8 pr-3 text-sm outline-none"
            />
          </div>
        }
      >
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">ТС</th>
                <th className="px-3 py-2">Группа</th>
                <th className="px-3 py-2">Водитель</th>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2 text-right">Пробег</th>
                <th className="px-3 py-2 text-right">Связь</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="bg-card/20 hover:bg-accent/30">
                  <td className="px-3 py-2">
                    <div className="font-medium">{vehicle.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{vehicle.plate}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{vehicle.group}</td>
                  <td className="px-3 py-2">{vehicle.driver ?? 'Не назначен'}</td>
                  <td className="px-3 py-2"><StatusPill status={vehicle.status} /></td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(vehicle.odometer)} км</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{timeAgo(vehicle.lastUpdate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AppShell>
  )
}
