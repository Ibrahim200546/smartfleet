import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { STATUS_META, formatNumber } from '@/lib/format'
import type { VehicleStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function SectionCard({
  title,
  description,
  children,
  className,
  action,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section className={cn('rounded-2xl border border-border bg-card/60 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = 'primary',
}: {
  icon: LucideIcon
  label: string
  value: string | number
  helper?: string
  tone?: 'primary' | 'moving' | 'idle' | 'alarm' | 'muted'
}) {
  const toneClass = {
    primary: 'bg-primary/15 text-primary',
    moving: 'bg-status-moving/15 text-status-moving',
    idle: 'bg-status-idle/15 text-status-idle',
    alarm: 'bg-status-alarm/15 text-status-alarm',
    muted: 'bg-muted text-muted-foreground',
  }[tone]

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn('flex size-9 items-center justify-center rounded-xl', toneClass)}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      {helper ? <div className="mt-1 text-xs text-muted-foreground">{helper}</div> : null}
    </div>
  )
}

export function StatusPill({ status }: { status: VehicleStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium', meta.color)}>
      <span className={cn('size-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <div className="mt-3 text-sm font-medium">{title}</div>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{text}</p>
    </div>
  )
}
