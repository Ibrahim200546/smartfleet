// entities/vehicle — доменные типы системы мониторинга

export type VehicleStatus = 'moving' | 'idle' | 'parked' | 'offline' | 'alarm'

export type VehicleKind = 'truck' | 'van' | 'car' | 'bus' | 'special'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface VehicleSensors {
  /** Уровень топлива, % */
  fuel: number
  /** Напряжение бортовой сети, В */
  voltage: number
  /** Заряд внутреннего АКБ трекера, % */
  battery: number
  /** Температура в кузове/салоне, °C */
  temperature: number
  /** Зажигание */
  ignition: boolean
  /** Кол-во спутников */
  satellites: number
  /** Высота над уровнем моря, м */
  altitude: number
}

export interface VehicleEvent {
  id: string
  vehicleId: string
  type:
    | 'ignition_on'
    | 'ignition_off'
    | 'overspeed'
    | 'geofence_in'
    | 'geofence_out'
    | 'fuel_drain'
    | 'fuel_fill'
    | 'sos'
    | 'connection_lost'
    | 'parking'
  severity: 'info' | 'warning' | 'critical'
  message: string
  timestamp: number
}

export interface Vehicle {
  id: string
  name: string
  plate: string
  kind: VehicleKind
  group: string
  driver: string | null
  imei: string
  tracker: string
  protocol: string
  status: VehicleStatus
  favorite: boolean
  position: GeoPoint
  /** Курс (направление) в градусах, 0 — север */
  course: number
  /** Скорость, км/ч */
  speed: number
  /** Одометр, км */
  odometer: number
  address: string
  lastUpdate: number
  sensors: VehicleSensors
  /** Заранее заданный маршрут для симуляции движения */
  route: GeoPoint[]
  /** Текущий индекс в маршруте */
  routeIndex: number
}

export interface VehicleGroup {
  id: string
  name: string
  count: number
}
