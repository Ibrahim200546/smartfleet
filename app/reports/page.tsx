import { BarChart3, Download, FileSpreadsheet, FileText, Gauge, Route } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { MetricCard, SectionCard } from '@/components/layout/cards'
import { buttonVariants } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { createVehicles } from '@/lib/mock-data'

const vehicles = createVehicles()
const totalMileage = vehicles.reduce((sum, vehicle) => sum + vehicle.odometer, 0)
const moving = vehicles.filter((vehicle) => vehicle.status === 'moving').length

const reports = [
  ['Пробег', 'Километры по ТС, группе и периоду', Route],
  ['Маршруты', 'Ключевые точки, время движения и стоянки', BarChart3],
  ['Стоянки', 'Адрес, длительность, начало и окончание', Gauge],
  ['Топливо', 'Остаток, заправки, сливы и расход', FileSpreadsheet],
  ['Сводный отчёт', 'Пробег, моточасы, активность и тревоги', FileText],
] as const

export default function ReportsPage() {
  return (
    <AppShell
      title="Отчёты"
      description="PDF/Excel отчёты по автопарку, маршрутам, стоянкам и топливу"
      actions={<button className={buttonVariants({ size: 'sm' })}><Download className="size-3.5" />Сформировать</button>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Route} label="Суммарный пробег" value={`${formatNumber(totalMileage)} км`} />
        <MetricCard icon={Gauge} label="Активных ТС" value={moving} tone="moving" />
        <MetricCard icon={FileSpreadsheet} label="Форматы" value="PDF / XLSX" helper="Готово для экспорта" />
      </div>

      <SectionCard className="mt-4" title="Доступные отчёты" description="Фильтры: дата, подразделение, ТС, водитель">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reports.map(([title, description, Icon]) => (
            <article key={title} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="size-4" />
              </div>
              <h3 className="mt-3 font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              <button className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}>
                Настроить отчёт
              </button>
            </article>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  )
}
