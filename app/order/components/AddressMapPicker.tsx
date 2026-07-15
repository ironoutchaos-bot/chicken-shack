'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'

interface Props {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

export default function AddressMapPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
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
        attributionControl: true,
        dragging: true,
        scrollWheelZoom: true,
      }).setView([lat, lng], 17)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri',
      }).addTo(map)

      map.on('movestart', () => {
        containerRef.current?.closest('.bf-map-shell')?.classList.add('bf-map-moving')
      })

      map.on('moveend', () => {
        containerRef.current?.closest('.bf-map-shell')?.classList.remove('bf-map-moving')
        const point = map.getCenter()
        onChangeRef.current(point.lat, point.lng)
      })

      map.on('click', (event) => {
        map.setView(event.latlng, Math.max(map.getZoom(), 17), { animate: true })
      })

      mapRef.current = map
      setTimeout(() => map.invalidateSize(), 150)
    }

    initMap()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const point: [number, number] = [lat, lng]
    const current = mapRef.current?.getCenter()
    if (!current || current.distanceTo(point) > 1) {
      mapRef.current?.panTo(point)
    }
  }, [lat, lng])

  return (
    <div className="bf-map-shell relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm">
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
        .leaflet-control-attribution {
          border-radius: 999px 0 0 0;
          color: #6b7280 !important;
          font-size: 9px !important;
          padding: 2px 5px !important;
        }
        .bf-center-pin {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 600;
          width: 38px;
          height: 50px;
          transform: translate(-50%, -100%);
          filter: drop-shadow(0 14px 18px rgba(0,0,0,.28));
          pointer-events: none;
          transition: transform .16s ease, filter .16s ease;
        }
        .bf-map-moving .bf-center-pin {
          transform: translate(-50%, calc(-100% - 8px));
          filter: drop-shadow(0 20px 22px rgba(0,0,0,.24));
        }
        .bf-center-pin::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50% 50% 50% 0;
          background: #f59e0b;
          border: 4px solid #fff;
          transform: rotate(-45deg);
        }
        .bf-center-pin::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 14px;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #fff;
          transform: translateX(-50%);
        }
        .bf-pin-shadow {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 590;
          width: 30px;
          height: 12px;
          border-radius: 999px;
          background: rgba(0,0,0,.22);
          transform: translate(-50%, 4px);
          pointer-events: none;
          transition: opacity .16s ease, transform .16s ease;
        }
        .bf-map-moving .bf-pin-shadow {
          opacity: .12;
          transform: translate(-50%, 10px) scale(.8);
        }
      `}</style>
      <div
        ref={containerRef}
        className="h-[56vh] min-h-[420px] w-full bg-stone-100"
      />
      <div className="bf-pin-shadow" />
      <div className="bf-center-pin" />
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-stone-700 shadow-md">
        Move map under pin
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-16 rounded-2xl bg-white/95 px-3 py-2 text-[10px] font-bold leading-snug text-stone-600 shadow-md">
        Tap any road/building or drag the map until the pin is on the exact delivery gate.
      </div>
    </div>
  )
}
