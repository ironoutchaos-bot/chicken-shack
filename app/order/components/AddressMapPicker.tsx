'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'

type LatLng = { lat: number; lng: number }
type LooseGoogleMap = {
  getCenter: () => { lat: () => number; lng: () => number } | null | undefined
  getZoom: () => number | undefined
  panTo: (point: LatLng) => void
  setCenter: (point: LatLng) => void
  setZoom: (zoom: number) => void
  addListener: (name: string, handler: (event?: { latLng?: { lat: () => number; lng: () => number } }) => void) => unknown
}
type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => LooseGoogleMap
  event: { clearInstanceListeners: (target: LooseGoogleMap) => void }
}

interface Props {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi }
    __bfGoogleMapsPromise?: Promise<GoogleMapsApi>
  }
}

const GOOGLE_MAPS_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
  ''

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_KEY || typeof window === 'undefined') return null
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (window.__bfGoogleMapsPromise) return window.__bfGoogleMapsPromise

  window.__bfGoogleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src =
      'https://maps.googleapis.com/maps/api/js?' +
      new URLSearchParams({
        key: GOOGLE_MAPS_KEY,
        v: 'weekly',
      }).toString()
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.maps) resolve(window.google.maps)
      else reject(new Error('Google Maps did not load'))
    }
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })

  return window.__bfGoogleMapsPromise
}

export default function AddressMapPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const leafletRef = useRef<LeafletMap | null>(null)
  const googleMapRef = useRef<LooseGoogleMap | null>(null)
  const providerRef = useRef<'google' | 'leaflet' | null>(null)
  const onChangeRef = useRef(onChange)
  const ignoreNextMoveRef = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let cancelled = false

    async function initMap() {
      if (!containerRef.current || leafletRef.current || googleMapRef.current) return

      const googleMaps = await loadGoogleMaps()?.catch(() => null)
      if (cancelled || !containerRef.current) return

      if (googleMaps) {
        ignoreNextMoveRef.current = true
        const map = new googleMaps.Map(containerRef.current, {
          center: { lat, lng },
          zoom: 18,
          mapTypeId: 'roadmap',
          clickableIcons: true,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
          disableDefaultUI: false,
        })

        map.addListener('dragstart', () => {
          containerRef.current?.closest('.bf-map-shell')?.classList.add('bf-map-moving')
        })
        map.addListener('idle', () => {
          containerRef.current?.closest('.bf-map-shell')?.classList.remove('bf-map-moving')
          if (ignoreNextMoveRef.current) {
            ignoreNextMoveRef.current = false
            return
          }
          const center = map.getCenter()
          if (center) onChangeRef.current(center.lat(), center.lng())
        })
        map.addListener('click', (event) => {
          if (!event?.latLng) return
          ignoreNextMoveRef.current = false
          map.panTo({ lat: event.latLng.lat(), lng: event.latLng.lng() })
          if ((map.getZoom() ?? 0) < 18) map.setZoom(18)
        })

        googleMapRef.current = map
        providerRef.current = 'google'
        return
      }

      const L = await import('leaflet')
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        dragging: true,
        scrollWheelZoom: true,
      }).setView([lat, lng], 17)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 19,
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors',
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
        map.setView(event.latlng, Math.max(map.getZoom(), 18), { animate: true })
      })

      leafletRef.current = map
      providerRef.current = 'leaflet'
      setTimeout(() => map.invalidateSize(), 150)
    }

    initMap()

    return () => {
      cancelled = true
      if (googleMapRef.current && window.google?.maps) {
        window.google.maps.event.clearInstanceListeners(googleMapRef.current)
      }
      googleMapRef.current = null
      leafletRef.current?.remove()
      leafletRef.current = null
      providerRef.current = null
    }
  }, [])

  useEffect(() => {
    const point: [number, number] = [lat, lng]
    const leafletCenter = leafletRef.current?.getCenter()
    if (leafletRef.current && (!leafletCenter || leafletCenter.distanceTo(point) > 1)) {
      leafletRef.current.panTo(point)
    }

    const googleCenter = googleMapRef.current?.getCenter()
    if (googleMapRef.current && googleCenter) {
      const currentLat = googleCenter.lat()
      const currentLng = googleCenter.lng()
      if (Math.abs(currentLat - lat) > 0.00001 || Math.abs(currentLng - lng) > 0.00001) {
        ignoreNextMoveRef.current = true
        googleMapRef.current.setCenter({ lat, lng })
      }
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
        .gm-style {
          font-family: Arial, sans-serif !important;
        }
        .gm-style .gmnoprint.gm-bundled-control {
          margin: 0 10px 56px 0 !important;
        }
        .bf-center-pin {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 600;
          width: 46px;
          height: 62px;
          transform: translate(-50%, -100%);
          filter: drop-shadow(0 16px 18px rgba(0,0,0,.32));
          pointer-events: none;
          transition: transform .16s ease, filter .16s ease;
        }
        .bf-map-moving .bf-center-pin {
          transform: translate(-50%, calc(-100% - 10px));
          filter: drop-shadow(0 22px 24px rgba(0,0,0,.26));
        }
        .bf-center-pin::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #f97316 0%, #f59e0b 48%, #d97706 100%);
          border: 5px solid #fff;
          box-shadow:
            inset 0 0 0 2px rgba(120,53,15,.22),
            0 5px 12px rgba(217,119,6,.38);
          transform: rotate(-45deg);
        }
        .bf-center-pin::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 15px;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 0 0 5px rgba(255,255,255,.24), inset 0 0 0 2px rgba(217,119,6,.35);
          transform: translateX(-50%);
        }
        .bf-pin-target {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 585;
          width: 52px;
          height: 52px;
          border-radius: 999px;
          border: 2px solid rgba(245,158,11,.95);
          background: rgba(245,158,11,.12);
          transform: translate(-50%, -50%);
          pointer-events: none;
          box-shadow: 0 0 0 8px rgba(245,158,11,.08);
          transition: opacity .16s ease, transform .16s ease;
        }
        .bf-map-moving .bf-pin-target {
          opacity: .7;
          transform: translate(-50%, -50%) scale(.88);
        }
        .bf-pin-shadow {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 590;
          width: 36px;
          height: 14px;
          border-radius: 999px;
          background: rgba(0,0,0,.25);
          transform: translate(-50%, 6px);
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
        className="h-[46vh] min-h-[350px] max-h-[520px] w-full bg-stone-100 sm:h-[50vh]"
      />
      <div className="bf-pin-target" />
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
