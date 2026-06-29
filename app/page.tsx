import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Fuel,
  MapPinned,
  Radio,
  Route,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard, SectionCard, StatusPill } from "@/components/layout/cards";
import { buttonVariants } from "@/components/ui/button";
import { STATUS_META, formatNumber, timeAgo } from "@/lib/format";
import { createEvents, createVehicles } from "@/lib/mock-data";
import type { VehicleStatus } from "@/lib/types";

const vehicles = createVehicles();
const events = createEvents(vehicles);
const statuses: VehicleStatus[] = [
  "moving",
  "idle",
  "parked",
  "offline",
  "alarm",
];

export default function DashboardPage() {
  const moving = vehicles.filter(
    (vehicle) => vehicle.status === "moving",
  ).length;
  const offline = vehicles.filter(
    (vehicle) => vehicle.status === "offline",
  ).length;
  const alarms = vehicles.filter(
    (vehicle) => vehicle.status === "alarm",
  ).length;
  const mileage = vehicles.reduce((sum, vehicle) => sum + vehicle.odometer, 0);
  const avgFuel = Math.round(
    vehicles.reduce((sum, vehicle) => sum + vehicle.sensors.fuel, 0) /
      vehicles.length,
  );

  return (
    <AppShell
      title="Дашборд"
      description="Оперативная сводка по автопарку, связи, событиям и топливу"
      actions={
        <Link href="/monitoring" className={buttonVariants({ size: "sm" })}>
          Открыть карту
          <ArrowRight className="size-3.5" />
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Truck}
          label="Всего ТС"
          value={vehicles.length}
          helper="В мониторинге"
        />
        <MetricCard
          icon={Activity}
          label="В движении"
          value={moving}
          helper="Скорость выше 0"
          tone="moving"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Тревоги"
          value={alarms}
          helper="Критичные события"
          tone="alarm"
        />
        <MetricCard
          icon={Fuel}
          label="Средний бак"
          value={`${avgFuel}%`}
          helper="По активным датчикам"
          tone="idle"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Статусы автопарка"
          description="Распределение транспорта по состояниям для диспетчера"
        >
          <div className="space-y-3">
            {statuses.map((status) => {
              const count = vehicles.filter(
                (vehicle) => vehicle.status === status,
              ).length;
              const percent = Math.round((count / vehicles.length) * 100);
              const meta = STATUS_META[status];
              return (
                <div key={status}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <StatusPill status={status} />
                    <span className="text-muted-foreground">
                      {count} · {percent}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={meta.dot}
                      style={{ width: `${percent}%`, height: "100%" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Готовность релиза"
          description="Критичные элементы платформы подключены"
        >
          <div className="space-y-3 text-sm">
            {[
              ["TCP Teltonika", "Codec 8 / 8E / 16, CRC и IMEI handshake"],
              ["REST API", "Справочники, telemetry history и fleet snapshot"],
              ["Frontend", "Карта, страницы управления, отчёты и настройки"],
              ["Vercel", "Next.js app готов к подключению репозитория"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="flex gap-2.5 rounded-xl border border-border bg-background/40 p-3"
              >
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-status-moving" />
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="text-xs text-muted-foreground">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Последние события"
          description="Тревоги, топливо, геозоны и связь"
          className="xl:col-span-2"
        >
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {events.slice(0, 7).map((event) => {
              const vehicle = vehicles.find(
                (item) => item.id === event.vehicleId,
              );
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 bg-background/30 px-3 py-2.5 text-sm"
                >
                  <span
                    className={
                      event.severity === "critical"
                        ? "size-2 rounded-full bg-status-alarm"
                        : event.severity === "warning"
                          ? "size-2 rounded-full bg-status-idle"
                          : "size-2 rounded-full bg-primary"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{event.message}</div>
                    <div className="text-xs text-muted-foreground">
                      {vehicle?.plate ?? "ТС"} · {timeAgo(event.timestamp)}
                    </div>
                  </div>
                  <Link
                    href="/events"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    открыть
                  </Link>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Быстрые действия"
          description="Основные сценарии диспетчера"
        >
          <div className="grid gap-2">
            {[
              [MapPinned, "Карта онлайн", "/monitoring"],
              [Truck, "Справочник ТС", "/vehicles"],
              [Radio, "GPS трекеры", "/trackers"],
              [Users, "Водители", "/drivers"],
              [Route, "История маршрутов", "/history"],
            ].map(([Icon, title, href]) => (
              <Link
                key={String(title)}
                href={href as string}
                className={buttonVariants({
                  variant: "outline",
                  className: "justify-start",
                })}
              >
                <Icon className="size-4" />
                {title as string}
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-border bg-background/40 p-3 text-xs text-muted-foreground">
            Суммарный пробег демо-парка: <b>{formatNumber(mileage)} км</b>. Нет
            связи: <b>{offline}</b>.
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
