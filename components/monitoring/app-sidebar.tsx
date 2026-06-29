"use client";

import {
  Bell,
  CarFront,
  ChartColumnBig,
  Fuel,
  Gauge,
  History,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Radio,
  Route,
  Settings,
  ShieldAlert,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export const NAV_GROUPS: { section: string; items: NavItem[] }[] = [
  {
    section: "Мониторинг",
    items: [
      { id: "dashboard", label: "Дашборд", href: "/", icon: LayoutDashboard },
      { id: "map", label: "Карта", href: "/monitoring", icon: MapPin },
      {
        id: "online",
        label: "Онлайн транспорт",
        href: "/monitoring",
        icon: Gauge,
      },
      {
        id: "history",
        label: "История маршрутов",
        href: "/history",
        icon: History,
      },
      { id: "routes", label: "План маршрутов", href: "/routes", icon: Route },
    ],
  },
  {
    section: "Управление",
    items: [
      {
        id: "events",
        label: "События",
        href: "/events",
        icon: ShieldAlert,
        badge: 3,
      },
      { id: "vehicles", label: "Транспорт", href: "/vehicles", icon: Truck },
      { id: "trackers", label: "GPS трекеры", href: "/trackers", icon: Radio },
      { id: "drivers", label: "Водители", href: "/drivers", icon: Users },
      { id: "fuel", label: "Топливо", href: "/fuel", icon: Fuel },
    ],
  },
  {
    section: "Аналитика",
    items: [
      {
        id: "reports",
        label: "Отчёты",
        href: "/reports",
        icon: ChartColumnBig,
      },
      {
        id: "notifications",
        label: "Уведомления",
        href: "/events",
        icon: Bell,
        badge: 7,
      },
      { id: "settings", label: "Настройки", href: "/settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <Link
        href="/"
        className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4"
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CarFront className="size-4.5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">SmartFleet</div>
          <div className="text-[11px] text-muted-foreground">
            Мониторинг автопарка
          </div>
        </div>
      </Link>

      <nav className="thin-scroll flex-1 overflow-y-auto px-2.5 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.section} className="mb-4">
            <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.section}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4 shrink-0",
                          active && "text-primary",
                        )}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge ? (
                        <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            АД
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">Администратор</div>
            <div className="truncate text-[11px] text-muted-foreground">
              dispatcher@fleet.ru
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
