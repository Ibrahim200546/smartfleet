import { MapPinned } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <AppShell title="Страница не найдена" description="Проверьте адрес или вернитесь к мониторингу">
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-border bg-card/60 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <MapPinned className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Такой страницы нет</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Возможно, раздел был перемещён или ссылка устарела. Карта мониторинга и дашборд доступны из меню.
        </p>
        <Link href="/monitoring" className={buttonVariants({ className: 'mt-5' })}>
          Открыть мониторинг
        </Link>
      </div>
    </AppShell>
  )
}
