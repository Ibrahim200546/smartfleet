"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useFleet } from "@/hooks/use-fleet";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./app-sidebar";
import type { MapLayer } from "./map-view";
import { StatusBar } from "./status-bar";
import { TopToolbar } from "./top-toolbar";
import { VehicleDetailCard } from "./vehicle-detail-card";
import { VehicleListPanel } from "./vehicle-list-panel";

// Leaflet работает только в браузере — грузим карту без SSR
const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm">Загрузка карты…</p>
      </div>
    </div>
  ),
});

export function MonitoringScreen() {
  const {
    vehicles,
    events,
    live,
    setLive,
    toggleFavorite,
    dataSource,
    loading,
    error,
    refresh,
  } = useFleet();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState<MapLayer>("dark");
  const [now, setNow] = useState(() => Date.now());

  // Тикер для относительного времени («5 мин назад»)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const selected = useMemo(
    () => vehicles.find((v) => v.id === selectedId) ?? null,
    [vehicles, selectedId],
  );

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopToolbar
          query={query}
          onQuery={setQuery}
          layer={layer}
          onLayer={setLayer}
          live={live}
          onLive={setLive}
          dataSource={dataSource}
          loading={loading}
          error={error}
          onRefresh={refresh}
        />

        <div className="flex min-h-0 flex-1">
          <VehicleListPanel
            vehicles={vehicles}
            query={query}
            selectedId={selectedId}
            now={now}
            onSelect={setSelectedId}
            onToggleFavorite={toggleFavorite}
          />

          <div className="relative flex min-w-0 flex-1">
            <div className="relative min-w-0 flex-1">
              <MapView
                vehicles={vehicles}
                selectedId={selectedId}
                layer={layer}
                onSelect={setSelectedId}
              />
            </div>

            {/* Карточка ТС: оверлей на узких экранах, колонка на широких */}
            <div
              className={cn(
                "absolute inset-y-0 right-0 z-[1000] shadow-2xl xl:static xl:z-0 xl:shadow-none",
                !selected && "hidden xl:block",
              )}
            >
              <VehicleDetailCard
                vehicle={selected}
                events={events}
                now={now}
                onClose={() => setSelectedId(null)}
              />
            </div>
          </div>
        </div>

        <StatusBar vehicles={vehicles} live={live} now={now} />
      </div>
    </div>
  );
}
