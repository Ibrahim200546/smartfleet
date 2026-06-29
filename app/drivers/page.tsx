import { CalendarClock, Phone, Plus, UserCheck, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { MetricCard, SectionCard } from '@/components/layout/cards'
import { buttonVariants } from '@/components/ui/button'
import { createVehicles } from '@/lib/mock-data'

const vehicles = createVehicles()
const drivers = vehicles
  .filter((vehicle) => vehicle.driver)
  .map((vehicle, index) => ({
    id: `driver-${index}`,
    name: vehicle.driver ?? 'Без имени',
    phone: `+7 9${index + 10} ${String(100 + index * 17).slice(0, 3)}-${String(40 + index).padStart(2, '0')}-${String(10 + index).padStart(2, '0')}`,
    license: `77 ${String(100000 + index * 137).padStart(6, '0')}`,
    vehicle: vehicle.plate,
    group: vehicle.group,
  }))

export default function DriversPage() {
  return (
    <AppShell
      title="Водители"
      description="Карточки водителей, контакты, права и текущие назначения"
      actions={<button className={buttonVariants({ size: 'sm' })}><Plus className="size-3.5" />Добавить</button>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Users} label="Водителей" value={drivers.length} />
        <MetricCard icon={UserCheck} label="Назначены" value={drivers.length} tone="moving" />
        <MetricCard icon={CalendarClock} label="История" value="активна" helper="Назначения хранятся с периодами" />
      </div>

      <SectionCard className="mt-4" title="Список водителей" description="Связь многие-ко-многим с ТС через историю назначений">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {drivers.map((driver) => (
            <article key={driver.id} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {driver.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{driver.name}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3" />
                    {driver.phone}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Info label="Права" value={driver.license} />
                <Info label="Группа" value={driver.group} />
                <Info label="Текущее ТС" value={driver.vehicle} />
                <Info label="Статус" value="Допущен" />
              </div>
            </article>
          ))}
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
