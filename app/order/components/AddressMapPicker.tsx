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
      }).setView([lat, lng], 17)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
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
    <div
      ref={containerRef}
      className="h-56 w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100"
    />
  )
}
