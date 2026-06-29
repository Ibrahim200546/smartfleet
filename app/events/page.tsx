import { AlertTriangle, Bell, Download, Filter, ShieldAlert } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { MetricCard, SectionCard } from '@/components/layout/cards'
import { buttonVariants } from '@/components/ui/button'
import { timeAgo } from '@/lib/format'
import { createEvents, createVehicles } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const vehicles = createVehicles()
const events = createEvents(vehicles, 28)

const severityClass = {
  info: 'bg-primary text-primary-foreground',
  warning: 'bg-status-idle text-background',
  critical: 'bg-status-alarm text-background',
}

export default function EventsPage() {
  const critical = events.filter((event) => event.severity === 'critical').length
  const warning = events.filter((event) => event.severity === 'warning').length

  return (
    <AppShell
      title="События"
      description="Тревоги, геозоны, связь, зажигание, топливо и пользовательские уведомления"
      actions={
        <div className="flex gap-2">
          <button className={buttonVariants({ variant: 'outline', size: 'sm' })}><Filter className="size-3.5" />Фильтр</button>
          <button className={buttonVariants({ variant: 'outline', size: 'sm' })}><Download className="size-3.5" />Экспорт</button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Bell} label="Всего событий" value={events.length} />
        <MetricCard icon={ShieldAlert} label="Критичные" value={critical} tone="alarm" />
        <MetricCard icon={AlertTriangle} label="Предупреждения" value={warning} tone="idle" />
      </div>

      <SectionCard className="mt-4" title="Лента событий" description="В API эти записи хранятся в таблице `events` и доступны для отчётов">
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {events.map((event) => {
            const vehicle = vehicles.find((item) => item.id === event.vehicleId)
            return (
              <article key={event.id} className="grid gap-3 bg-background/30 p-3 text-sm md:grid-cols-[auto_1fr_auto] md:items-center">
                <span className={cn('w-fit rounded-full px-2 py-1 text-xs font-semibold', severityClass[event.severity])}>
                  {event.severity === 'critical' ? 'Критично' : event.severity === 'warning' ? 'Внимание' : 'Инфо'}
                </span>
                <div>
                  <div className="font-medium">{event.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {vehicle?.name} · {vehicle?.plate} · {vehicle?.driver ?? 'без водителя'}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground md:text-right">{timeAgo(event.timestamp)}</div>
              </article>
            )
          })}
        </div>
      </SectionCard>
    </AppShell>
  )
}
