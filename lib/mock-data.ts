import type {
  GeoPoint,
  Vehicle,
  VehicleEvent,
  VehicleGroup,
  VehicleKind,
  VehicleStatus,
} from './types'

// Центр карты — Москва
export const MAP_CENTER: GeoPoint = { lat: 55.7522, lng: 37.6156 }

// Детерминированный ГСЧ, чтобы SSR и CSR давали одинаковый результат
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260629)

function between(min: number, max: number) {
  return min + rand() * (max - min)
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

// Линейная интерполяция точек маршрута между опорными вершинами
function buildRoute(waypoints: GeoPoint[], stepsPerLeg = 40): GeoPoint[] {
  const route: GeoPoint[] = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    for (let s = 0; s < stepsPerLeg; s++) {
      const t = s / stepsPerLeg
      route.push({
        lat: a.lat + (b.lat - a.lat) * t + between(-0.0004, 0.0004),
        lng: a.lng + (b.lng - a.lng) * t + between(-0.0004, 0.0004),
      })
    }
  }
  return route
}

const NAMES = [
  'Volvo FH16',
  'КАМАЗ 5490',
  'MAN TGX',
  'Mercedes Actros',
  'Scania R500',
  'ГАЗель NEXT',
  'Ford Transit',
  'DAF XF',
  'Iveco Stralis',
  'Hyundai HD78',
  'ПАЗ 3205',
  'Renault Premium',
  'МАЗ 6430',
  'Citroen Jumper',
]

const DRIVERS = [
  'Иванов А.С.',
  'Петров В.М.',
  'Сидоров Д.И.',
  'Кузнецов Н.П.',
  'Смирнов О.В.',
  'Васильев Р.А.',
  'Морозов Е.К.',
  'Новиков С.Г.',
  'Фёдоров И.Л.',
  null,
  'Михайлов А.Д.',
  'Алексеев П.Н.',
  'Тарасов В.В.',
  null,
]

const GROUPS = ['Магистраль', 'Город', 'Спецтехника', 'Доставка'] as const
const KINDS: VehicleKind[] = ['truck', 'van', 'car', 'bus', 'special']
const PROTOCOLS = ['Teltonika FMB920', 'Quicklink Q7', 'Galileosky 7x', 'Teltonika FMC130']

const ADDRESSES = [
  'МКАД, 47 км, внешняя сторона',
  'ш. Энтузиастов, 31',
  'Ленинградский пр-т, 80',
  'Варшавское ш., 125',
  'Дмитровское ш., 163',
  'Каширское ш., 61',
  'ТТК, Сущёвский Вал',
  'Волгоградский пр-т, 42',
  'Можайское ш., 165',
  'Рязанский пр-т, 99',
  'просп. Мира, 211',
  'ул. Большая Академическая, 5',
  'Кутузовский пр-т, 36',
  'Новорижское ш., 9 км',
]

// Опорные вершины маршрутов (петли по Москве и вылетным трассам)
const ROUTE_SEEDS: GeoPoint[][] = [
  [
    { lat: 55.83, lng: 37.49 },
    { lat: 55.79, lng: 37.55 },
    { lat: 55.74, lng: 37.62 },
    { lat: 55.7, lng: 37.7 },
  ],
  [
    { lat: 55.65, lng: 37.4 },
    { lat: 55.7, lng: 37.5 },
    { lat: 55.75, lng: 37.6 },
    { lat: 55.8, lng: 37.68 },
  ],
  [
    { lat: 55.79, lng: 37.72 },
    { lat: 55.76, lng: 37.64 },
    { lat: 55.72, lng: 37.58 },
    { lat: 55.68, lng: 37.52 },
  ],
  [
    { lat: 55.7, lng: 37.78 },
    { lat: 55.74, lng: 37.7 },
    { lat: 55.77, lng: 37.6 },
    { lat: 55.81, lng: 37.52 },
  ],
  [
    { lat: 55.62, lng: 37.6 },
    { lat: 55.68, lng: 37.62 },
    { lat: 55.74, lng: 37.61 },
    { lat: 55.8, lng: 37.6 },
  ],
]

function bearing(a: GeoPoint, b: GeoPoint): number {
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360
}

const STATUS_DISTRIBUTION: VehicleStatus[] = [
  'moving',
  'moving',
  'moving',
  'moving',
  'moving',
  'idle',
  'idle',
  'parked',
  'parked',
  'parked',
  'offline',
  'alarm',
]

export function createVehicles(): Vehicle[] {
  const now = Date.now()
  return NAMES.map((name, i) => {
    const route = buildRoute(ROUTE_SEEDS[i % ROUTE_SEEDS.length])
    const routeIndex = Math.floor(between(0, route.length - 2))
    const position = route[routeIndex]
    const next = route[routeIndex + 1] ?? position
    const status = STATUS_DISTRIBUTION[i % STATUS_DISTRIBUTION.length]
    const moving = status === 'moving' || status === 'alarm'
    const ignition = status !== 'parked' && status !== 'offline'

    return {
      id: `veh-${(i + 1).toString().padStart(3, '0')}`,
      name,
      plate: `${pick(['А', 'В', 'Е', 'К', 'М', 'Н', 'О'])}${Math.floor(
        between(100, 999),
      )}${pick(['АА', 'ВВ', 'ЕК', 'КМ', 'НО'])} ${Math.floor(between(50, 799))}`,
      kind: KINDS[i % KINDS.length],
      group: GROUPS[i % GROUPS.length],
      driver: DRIVERS[i],
      imei: `35${Math.floor(between(1e13, 9e13))}`,
      tracker: `TRK-${Math.floor(between(1000, 9999))}`,
      protocol: pick(PROTOCOLS),
      status,
      favorite: i % 5 === 0,
      position,
      course: bearing(position, next),
      speed: moving ? Math.floor(between(35, 92)) : status === 'idle' ? 0 : 0,
      odometer: Math.floor(between(45000, 380000)),
      address: ADDRESSES[i],
      lastUpdate:
        status === 'offline'
          ? now - Math.floor(between(3600, 36000)) * 1000
          : now - Math.floor(between(2, 90)) * 1000,
      sensors: {
        fuel: Math.floor(between(8, 98)),
        voltage: Number(between(12.4, 14.6).toFixed(1)),
        battery: Math.floor(between(40, 100)),
        temperature: Number(between(-6, 22).toFixed(1)),
        ignition,
        satellites: status === 'offline' ? 0 : Math.floor(between(6, 18)),
        altitude: Math.floor(between(120, 260)),
      },
      route,
      routeIndex,
    }
  })
}

export const VEHICLE_GROUPS: VehicleGroup[] = (() => {
  const vehicles = createVehicles()
  return GROUPS.map((g) => ({
    id: g,
    name: g,
    count: vehicles.filter((v) => v.group === g).length,
  }))
})()

const EVENT_TEMPLATES: Pick<VehicleEvent, 'type' | 'severity' | 'message'>[] = [
  { type: 'overspeed', severity: 'warning', message: 'Превышение скорости — 112 км/ч' },
  { type: 'geofence_out', severity: 'info', message: 'Выход из геозоны «Склад №3»' },
  { type: 'geofence_in', severity: 'info', message: 'Вход в геозону «Клиент Север»' },
  { type: 'fuel_drain', severity: 'critical', message: 'Резкий слив топлива −34 л' },
  { type: 'fuel_fill', severity: 'info', message: 'Заправка +120 л' },
  { type: 'ignition_off', severity: 'info', message: 'Зажигание выключено' },
  { type: 'sos', severity: 'critical', message: 'Тревожная кнопка SOS' },
  { type: 'connection_lost', severity: 'warning', message: 'Потеря связи с трекером' },
  { type: 'parking', severity: 'info', message: 'Начало стоянки' },
]

export function createEvents(vehicles: Vehicle[], count = 18): VehicleEvent[] {
  const now = Date.now()
  const events: VehicleEvent[] = []
  for (let i = 0; i < count; i++) {
    const v = vehicles[Math.floor(between(0, vehicles.length))]
    const tpl = EVENT_TEMPLATES[Math.floor(between(0, EVENT_TEMPLATES.length))]
    events.push({
      id: `evt-${i}-${v.id}`,
      vehicleId: v.id,
      ...tpl,
      timestamp: now - Math.floor(between(20, 5400)) * 1000,
    })
  }
  return events.sort((a, b) => b.timestamp - a.timestamp)
}
