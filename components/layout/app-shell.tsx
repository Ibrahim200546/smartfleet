'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppSidebar, NAV_GROUPS } from '@/components/monitoring/app-sidebar'
import { ThemeToggle } from '@/components/monitoring/theme-toggle'
import { cn } from '@/lib/utils'

interface AppShellProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

const MOBILE_ITEMS = NAV_GROUPS.flatMap((group) => group.items).filter(
  (item, index, items) => items.findIndex((other) => other.href === item.href) === index,
)

export function AppShell({ title, description, actions, children }: AppShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary lg:hidden">
              <Menu className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">{title}</h1>
              {description ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground lg:text-sm">{description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <ThemeToggle />
            </div>
          </div>

          <nav className="thin-scroll -mx-1 mt-3 flex gap-1 overflow-x-auto pb-0.5 lg:hidden">
            {MOBILE_ITEMS.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                    active
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-border bg-background/40 text-muted-foreground',
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </header>

        <div className="thin-scroll flex-1 overflow-y-auto p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
