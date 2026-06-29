import type { GeoPoint, Vehicle, VehicleKind, VehicleStatus } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')

const STATUS_VALUES = new Set<VehicleStatus>(['moving', 'idle', 'parked', 'offline', 'alarm'])
const KIND_VALUES = new Set<VehicleKind>(['truck', 'van', 'car', 'bus', 'special'])

interface FleetSnapshotResponse {
  source: string
  generatedAt: string
  vehicles: unknown[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function statusValue(value: unknown): VehicleStatus {
  return typeof value === 'string' && STATUS_VALUES.has(value as VehicleStatus)
    ? (value as VehicleStatus)
    : 'offline'
}

function kindValue(value: unknown): VehicleKind {
  return typeof value === 'string' && KIND_VALUES.has(value as VehicleKind)
    ? (value as VehicleKind)
    : 'truck'
}

function pointValue(value: unknown): GeoPoint {
  if (!isRecord(value)) return { lat: 55.7522, lng: 37.6156 }
  return {
    lat: numberValue(value.lat, 55.7522),
    lng: numberValue(value.lng, 37.6156),
  }
}

function fallbackRoute(center: GeoPoint): GeoPoint[] {
  return [
    { lat: center.lat - 0.006, lng: center.lng - 0.006 },
    { lat: center.lat - 0.003, lng: center.lng + 0.004 },
    center,
    { lat: center.lat + 0.004, lng: center.lng + 0.006 },
    { lat: center.lat + 0.007, lng: center.lng - 0.002 },
  ]
}

function routeValue(value: unknown, center: GeoPoint): GeoPoint[] {
  if (!Array.isArray(value)) return fallbackRoute(center)
  const route = value.map(pointValue).filter((point) => point.lat !== 0 || point.lng !== 0)
  return route.length > 1 ? route : fallbackRoute(center)
}

function normalizeVehicle(value: unknown): Vehicle | null {
  if (!isRecord(value)) return null

  const position = pointValue(value.position)
  const sensors = isRecord(value.sensors) ? value.sensors : {}

  return {
    id: stringValue(value.id, `veh-${Math.random().toString(36).slice(2)}`),
    name: stringValue(value.name, 'Без названия'),
    plate: stringValue(value.plate, '—'),
    kind: kindValue(value.kind),
    group: stringValue(value.group, 'Без группы'),
    driver: typeof value.driver === 'string' ? value.driver : null,
    imei: stringValue(value.imei),
    tracker: stringValue(value.tracker, 'Не назначен'),
    protocol: stringValue(value.protocol, 'unknown'),
    status: statusValue(value.status),
    favorite: boolValue(value.favorite),
    position,
    course: numberValue(value.course),
    speed: Math.round(numberValue(value.speed)),
    odometer: numberValue(value.odometer),
    address: stringValue(value.address, 'Адрес не определён'),
    lastUpdate: numberValue(value.lastUpdate, Date.now()),
    sensors: {
      fuel: numberValue(sensors.fuel),
      voltage: numberValue(sensors.voltage),
      battery: numberValue(sensors.battery),
      temperature: numberValue(sensors.temperature),
      ignition: boolValue(sensors.ignition),
      satellites: numberValue(sensors.satellites),
      altitude: numberValue(sensors.altitude),
    },
    route: routeValue(value.route, position),
    routeIndex: Math.max(0, Math.floor(numberValue(value.routeIndex))),
  }
}

export function hasApiUrl(): boolean {
  return Boolean(API_URL)
}

export async function fetchFleetSnapshot(signal?: AbortSignal): Promise<Vehicle[]> {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL не задан — используется демо-режим')
  }

  const response = await fetch(`${API_URL}/fleet/snapshot`, {
    cache: 'no-store',
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`API вернул ${response.status}: ${response.statusText}`)
  }

  const payload = (await response.json()) as FleetSnapshotResponse
  const vehicles = Array.isArray(payload.vehicles)
    ? payload.vehicles.map(normalizeVehicle).filter((item): item is Vehicle => item !== null)
    : []

  if (vehicles.length === 0) {
    throw new Error('API snapshot пуст — показываю демо-данные')
  }

  return vehicles
}
