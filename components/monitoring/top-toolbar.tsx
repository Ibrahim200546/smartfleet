"use client";

import {
  Bell,
  ChevronRight,
  Database,
  Layers,
  Maximize2,
  Pause,
  Play,
  RefreshCcw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FleetDataSource } from "@/hooks/use-fleet";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import type { MapLayer } from "./map-view";

const LAYERS: { id: MapLayer; label: string }[] = [
  { id: "dark", label: "Тёмная" },
  { id: "light", label: "Светлая" },
  { id: "satellite", label: "Спутник" },
];

interface TopToolbarProps {
  query: string;
  onQuery: (value: string) => void;
  layer: MapLayer;
  onLayer: (layer: MapLayer) => void;
  live: boolean;
  onLive: (value: boolean) => void;
  dataSource?: FleetDataSource;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function TopToolbar({
  query,
  onQuery,
  layer,
  onLayer,
  live,
  onLive,
  dataSource = "demo",
  loading = false,
  error,
  onRefresh,
}: TopToolbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-3 backdrop-blur-md md:px-4">
      <nav
        aria-label="Хлебные крошки"
        className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex"
      >
        <span>Мониторинг</span>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">Карта</span>
      </nav>

      <div className="relative ml-auto w-full max-w-sm sm:ml-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Поиск по номеру, названию, водителю…"
          className="h-9 w-full rounded-lg border border-border bg-background/60 pl-8.5 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
        <div
          title={error ?? undefined}
          className={cn(
            "hidden items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium md:flex",
            dataSource === "api" && !error
              ? "border-status-moving/30 bg-status-moving/10 text-status-moving"
              : "border-status-idle/30 bg-status-idle/10 text-status-idle",
          )}
        >
          <Database className="size-3.5" />
          {dataSource === "api" && !error ? "API" : "Демо"}
        </div>

        {/* Слои карты */}
        <div
          role="group"
          aria-label="Слой карты"
          className="hidden items-center gap-0.5 rounded-lg border border-border bg-background/60 p-0.5 md:flex"
        >
          <Layers className="mx-1 size-3.5 text-muted-foreground" />
          {LAYERS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onLayer(l.id)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                layer === l.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Обновить данные"
          title="Обновить данные"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCcw className={cn("size-4", loading && "animate-spin")} />
        </Button>

        <Button
          variant={live ? "secondary" : "outline"}
          size="sm"
          onClick={() => onLive(!live)}
          className={cn(live && "text-status-moving")}
        >
          {live ? (
            <>
              <Pause className="size-3.5" />
              <span className="hidden sm:inline">Пауза</span>
            </>
          ) : (
            <>
              <Play className="size-3.5" />
              <span className="hidden sm:inline">Старт</span>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Уведомления"
          className="relative"
        >
          <Bell className="size-4" />
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-status-alarm ring-2 ring-card" />
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="На весь экран"
          className="hidden sm:inline-flex"
        >
          <Maximize2 className="size-4" />
        </Button>

        <ThemeToggle />
      </div>
    </header>
  );
}
