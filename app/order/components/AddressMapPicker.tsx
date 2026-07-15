'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'

interface Props {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

export default function AddressMapPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let cancelled = false

    async function initMap() {
      if (!containerRef.current || mapRef.current) return

      const L = await import('leaflet')
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
      }).setView([lat, lng], 17)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map)

      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({
          className: '',
          iconSize: [34, 44],
          iconAnchor: [17, 42],
          html: '<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:#f59e0b;transform:rotate(-45deg);box-shadow:0 8px 24px rgba(0,0,0,.28);border:3px solid #fff;display:flex;align-items:center;justify-content:center;"><div style="width:12px;height:12px;border-radius:999px;background:#fff;"></div></div>',
        }),
      }).addTo(map)

      marker.on('dragend', () => {
        const point = marker.getLatLng()
        onChangeRef.current(point.lat, point.lng)
      })
      marker.on('dragstart', () => {
        marker.getElement()?.classList.add('bf-map-pin-dragging')
      })
      marker.on('dragend', () => {
        marker.getElement()?.classList.remove('bf-map-pin-dragging')
      })

      map.on('click', (event) => {
        const point = event.latlng
        marker.setLatLng(point)
        onChangeRef.current(point.lat, point.lng)
      })

      mapRef.current = map
      markerRef.current = marker
      setTimeout(() => map.invalidateSize(), 150)
    }

    initMap()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const point: [number, number] = [lat, lng]
    markerRef.current?.setLatLng(point)
    mapRef.current?.panTo(point)
  }, [lat, lng])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm">
      <style>{`
        .leaflet-control-zoom {
          border: 0 !important;
          box-shadow: 0 6px 18px rgba(0,0,0,.16) !important;
        }
        .leaflet-control-zoom a {
          width: 42px !important;
          height: 42px !important;
          line-height: 42px !important;
          font-size: 24px !important;
          color: #202124 !important;
          border-color: #e5e7eb !important;
        }
        .leaflet-container {
          font-family: Arial, sans-serif;
          background: #e8eaed;
        }
        .bf-map-pin-dragging {
          transform: translateY(-6px);
          transition: transform .12s ease;
        }
      `}</style>
      <div
        ref={containerRef}
        className="h-[56vh] min-h-[420px] w-full bg-stone-100"
      />
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-stone-700 shadow-md">
        Tap map or drag pin
      </div>
    </div>
  )
}
