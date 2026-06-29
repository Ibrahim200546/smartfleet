'use client'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  ZoomControl,
} from 'react-leaflet'
import { STATUS_META } from '@/lib/format'
import { MAP_CENTER } from '@/lib/mock-data'
import type { Vehicle, VehicleStatus } from '@/lib/types'

export type MapLayer = 'dark' | 'light' | 'satellite'

const TILES: Record<MapLayer, { url: string; attribution: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
}

const STATUS_HEX: Record<VehicleStatus, string> = {
  moving: '#3fc97e',
  idle: '#e8b23a',
  parked: '#9aa3b2',
  offline: '#6b7280',
  alarm: '#f2603c',
}

function buildIcon(vehicle: Vehicle, selected: boolean): L.DivIcon {
  const color = STATUS_HEX[vehicle.status]
  const moving = vehicle.status === 'moving' || vehicle.status === 'alarm'
  const size = selected ? 40 : 32
  const ring = selected
    ? `box-shadow:0 0 0 3px ${color}55, 0 4px 10px rgba(0,0,0,.4);`
    : 'box-shadow:0 2px 6px rgba(0,0,0,.4);'

  const arrow = moving
    ? `<div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%) rotate(${vehicle.course}deg);transform-origin:50% ${size / 2 + 9}px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid ${color};"></div>`
    : ''

  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;">
      ${arrow}
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.85);${ring}">
        <svg xmlns="http://www.w3.org/2000/svg" width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="#0b0f17" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
        </svg>
      </div>
    </div>`

  return L.divIcon({
    html,
    className: 'vehicle-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function MapController({
  focus,
}: {
  focus: { lat: number; lng: number } | null
}) {
  const map = useMap()
  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 13), {
        duration: 0.8,
      })
    }
  }, [focus, map])
  useEffect(() => {
    // Корректный пересчёт размеров после монтирования в гибком лэйауте
    const t = setTimeout(() => map.invalidateSize(), 200)
    return () => clearTimeout(t)
  }, [map])
  return null
}

interface MapViewProps {
  vehicles: Vehicle[]
  selectedId: string | null
  layer: MapLayer
  onSelect: (id: string) => void
}

export default function MapView({
  vehicles,
  selectedId,
  layer,
  onSelect,
}: MapViewProps) {
  const tile = TILES[layer]
  const selected = vehicles.find((v) => v.id === selectedId) ?? null

  const focus = useMemo(
    () => (selected ? { ...selected.position } : null),
    // позиционируем только при смене выбранного ТС
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId],
  )

  const track = useMemo(() => {
    if (!selected) return []
    const start = Math.max(0, selected.routeIndex - 40)
    return selected.route
      .slice(start, selected.routeIndex + 1)
      .map((p) => [p.lat, p.lng] as [number, number])
  }, [selected])

  return (
    <MapContainer
      center={[MAP_CENTER.lat, MAP_CENTER.lng]}
      zoom={11}
      zoomControl={false}
      className="size-full"
    >
      <TileLayer
        key={layer}
        url={tile.url}
        attribution={tile.attribution}
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <MapController focus={focus} />

      {track.length > 1 && (
        <Polyline
          positions={track}
          pathOptions={{
            color: STATUS_HEX[selected?.status ?? 'moving'],
            weight: 4,
            opacity: 0.85,
          }}
        />
      )}

      {vehicles.map((v) => (
        <Marker
          key={v.id}
          position={[v.position.lat, v.position.lng]}
          icon={buildIcon(v, v.id === selectedId)}
          zIndexOffset={v.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(v.id) }}
        >
          <Popup>
            <div className="min-w-44 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {v.name}
                </span>
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {v.plate}
                </span>
              </div>
              <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                <div className={STATUS_META[v.status].color}>
                  {STATUS_META[v.status].label}
                </div>
                <div>Скорость: {v.speed} км/ч</div>
                <div>Водитель: {v.driver ?? '—'}</div>
                <div className="truncate">{v.address}</div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
