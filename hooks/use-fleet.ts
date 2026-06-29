"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFleetSnapshot, hasApiUrl } from "@/lib/api";
import { createEvents, createVehicles } from "@/lib/mock-data";
import type { Vehicle, VehicleEvent } from "@/lib/types";

export type FleetDataSource = "api" | "demo";

function bearing(a: Vehicle["position"], b: Vehicle["position"]): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const INITIAL_VEHICLES = createVehicles();

/**
 * Управляет состоянием автопарка.
 *
 * Если задан `NEXT_PUBLIC_API_URL`, хук периодически читает `/fleet/snapshot`.
 * Если API недоступен, интерфейс остаётся рабочим на демо-данных и показывает ошибку.
 */
export function useFleet(intervalMs = 2000, apiPollMs = 10000) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => INITIAL_VEHICLES);
  const [events, setEvents] = useState<VehicleEvent[]>(() =>
    createEvents(INITIAL_VEHICLES),
  );
  const [live, setLive] = useState(true);
  const [dataSource, setDataSource] = useState<FleetDataSource>(() =>
    hasApiUrl() ? "api" : "demo",
  );
  const [loading, setLoading] = useState(() => hasApiUrl());
  const [error, setError] = useState<string | null>(null);
  const liveRef = useRef(live);
  liveRef.current = live;

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!hasApiUrl()) {
      setDataSource("demo");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const snapshot = await fetchFleetSnapshot(signal);
      if (signal?.aborted) return;
      setVehicles(snapshot);
      setEvents(createEvents(snapshot));
      setDataSource("api");
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setDataSource("demo");
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить данные API",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const tick = useCallback(() => {
    if (dataSource === "api") return;
    const now = Date.now();
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.status === "offline" || v.status === "parked") return v;
        if (v.status === "idle") {
          return {
            ...v,
            lastUpdate: now,
            sensors: {
              ...v.sensors,
              voltage: clamp(
                v.sensors.voltage + (Math.random() - 0.5) * 0.1,
                12,
                14.8,
              ),
            },
          };
        }

        const safeRoute =
          v.route.length > 1 ? v.route : [v.position, v.position];
        const nextIndex = (v.routeIndex + 1) % safeRoute.length;
        const position = safeRoute[nextIndex];
        const ahead = safeRoute[(nextIndex + 1) % safeRoute.length];
        const speed = clamp(
          v.speed + (Math.random() - 0.5) * 12,
          v.status === "alarm" ? 60 : 28,
          v.status === "alarm" ? 118 : 95,
        );
        return {
          ...v,
          route: safeRoute,
          routeIndex: nextIndex,
          position,
          course: bearing(position, ahead),
          speed: Math.round(speed),
          odometer: v.odometer + 0.05,
          lastUpdate: now,
          sensors: {
            ...v.sensors,
            fuel: clamp(v.sensors.fuel - Math.random() * 0.05, 0, 100),
            satellites: clamp(
              v.sensors.satellites + Math.round((Math.random() - 0.5) * 2),
              5,
              20,
            ),
          },
        };
      }),
    );
  }, [dataSource]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [live, intervalMs, tick]);

  useEffect(() => {
    if (!live || !hasApiUrl()) return;
    const id = setInterval(() => void refresh(), apiPollMs);
    return () => clearInterval(id);
  }, [apiPollMs, live, refresh]);

  const toggleFavorite = useCallback((id: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, favorite: !v.favorite } : v)),
    );
  }, []);

  return {
    vehicles,
    events,
    live,
    setLive,
    toggleFavorite,
    dataSource,
    loading,
    error,
    refresh: () => void refresh(),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
