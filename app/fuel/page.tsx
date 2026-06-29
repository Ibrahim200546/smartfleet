import { Droplet, Fuel, Gauge, TrendingDown, TrendingUp } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { MetricCard, SectionCard } from '@/components/layout/cards'
import { buttonVariants } from '@/components/ui/button'
import { createVehicles } from '@/lib/mock-data'

const vehicles = createVehicles()
const avgFuel = Math.round(vehicles.reduce((sum, vehicle) => sum + vehicle.sensors.fuel, 0) / vehicles.length)
const lowFuel = vehicles.filter((vehicle) => vehicle.sensors.fuel < 20)

export default function FuelPage() {
  return (
    <AppShell
      title="Топливо"
      description="Датчики топлива, калибровки, заправки, сливы и расчёт расхода"
      actions={<button className={buttonVariants({ size: 'sm' })}>Добавить датчик</button>}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Fuel} label="Средний остаток" value={`${avgFuel}%`} tone="idle" />
        <MetricCard icon={TrendingUp} label="Заправки" value="12" helper="За 7 дней" tone="moving" />
        <MetricCard icon={TrendingDown} label="Сливы" value="2" helper="Требуют проверки" tone="alarm" />
        <MetricCard icon={Droplet} label="Низкий бак" value={lowFuel.length} helper="Менее 20%" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Калибровки датчиков" description="Таблица калибровки переводит сигнал датчика в литры">
          <div className="space-y-3">
            {vehicles.slice(0, 5).map((vehicle) => (
              <div key={vehicle.id} className="rounded-xl border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{vehicle.plate}</div>
                    <div className="text-xs text-muted-foreground">{vehicle.name} · AVL fuel_level</div>
                  </div>
                  <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-medium text-primary">5 точек</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-status-moving" style={{ width: `${vehicle.sensors.fuel}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Контроль топлива" description="Алгоритмы фиксируют резкий рост как заправку, падение как слив">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-3 py-2">ТС</th><th className="px-3 py-2">Остаток</th><th className="px-3 py-2">Событие</th><th className="px-3 py-2 text-right">Объём</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicles.slice(0, 8).map((vehicle, index) => (
                  <tr key={vehicle.id} className="bg-background/30">
                    <td className="px-3 py-2 font-mono text-xs">{vehicle.plate}</td>
                    <td className="px-3 py-2">{Math.round(vehicle.sensors.fuel)}%</td>
                    <td className="px-3 py-2">{index % 4 === 0 ? 'Заправка' : index % 7 === 0 ? 'Слив' : 'Норма'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{index % 4 === 0 ? '+120 л' : index % 7 === 0 ? '−34 л' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  )
}
