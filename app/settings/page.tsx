import {
  Database,
  Globe2,
  KeyRound,
  Map,
  Server,
  Settings,
  Shield,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard, SectionCard } from "@/components/layout/cards";
import { buttonVariants } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "не задан — демо-режим";

export default function SettingsPage() {
  return (
    <AppShell
      title="Настройки"
      description="Параметры сервера, карт, ролей, интеграций и деплоя"
      actions={
        <button className={buttonVariants({ size: "sm" })}>Сохранить</button>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Server} label="Backend" value="FastAPI" />
        <MetricCard icon={Database} label="База" value="SQLAlchemy" />
        <MetricCard
          icon={Globe2}
          label="Frontend"
          value="Next.js"
          tone="moving"
        />
        <MetricCard
          icon={Shield}
          label="Роли"
          value="4"
          helper="admin/dispatcher/manager/operator"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Подключение API"
          description="Для Vercel задайте переменную окружения `NEXT_PUBLIC_API_URL`"
        >
          <div className="space-y-3">
            <ConfigRow icon={Server} label="REST API URL" value={apiUrl} />
            <ConfigRow
              icon={Database}
              label="Snapshot endpoint"
              value="/fleet/snapshot"
            />
            <ConfigRow
              icon={KeyRound}
              label="CORS env"
              value="SMARTFLEET_CORS_ORIGINS=https://your-domain.vercel.app"
            />
            <div className="rounded-xl border border-status-idle/30 bg-status-idle/10 p-3 text-sm text-status-idle">
              TCP-приём Teltonika не разворачивается на Vercel: нужен отдельный
              VPS/Fly.io/Render/Railway сервис с открытым TCP портом.
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Карты и интерфейс"
          description="OpenStreetMap/Leaflet без обязательных ключей"
        >
          <div className="space-y-3">
            <ConfigRow
              icon={Map}
              label="Провайдер карты"
              value="OSM + CARTO + Esri satellite"
            />
            <ConfigRow
              icon={SlidersHorizontal}
              label="Статус offline"
              value="нет данных более 30 минут"
            />
            <ConfigRow
              icon={Settings}
              label="Тема"
              value="dark/light через next-themes"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Роли доступа"
          description="Проверки прав добавляются на backend API и frontend guards"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["Администратор", "Полный доступ"],
              ["Диспетчер", "ТС, водители, отчёты"],
              ["Руководитель", "Только отчёты и аналитика"],
              ["Оператор", "Ограниченный мониторинг"],
            ].map(([role, text]) => (
              <div
                key={role}
                className="rounded-xl border border-border bg-background/40 p-3"
              >
                <div className="font-medium">{role}</div>
                <div className="mt-1 text-sm text-muted-foreground">{text}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Готовность к Vercel"
          description="Репозиторий GitHub: Ibrahim200546/smartfleet"
        >
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Push в ветку `main` репозитория `smartfleet`.</li>
            <li>2. Import Project в Vercel как Next.js.</li>
            <li>
              3. Build command: `pnpm build`, install: `pnpm install
              --frozen-lockfile`.
            </li>
            <li>4. Добавить `NEXT_PUBLIC_API_URL` на внешний backend API.</li>
          </ol>
        </SectionCard>
      </div>
    </AppShell>
  );
}

function ConfigRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 break-all font-mono text-sm">{value}</div>
      </div>
    </div>
  );
}
