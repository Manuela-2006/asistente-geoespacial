"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet.heat";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* =========================================================
   Fix iconos Leaflet en Next.js
========================================================= */
function ensureLeafletIcons() {
  const anyL: any = L;
  if (anyL.__iconFixApplied) return;

  delete (L.Icon.Default.prototype as any)._getIconUrl;

  const iconRetinaUrl = new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url
  ).toString();
  const iconUrl = new URL(
    "leaflet/dist/images/marker-icon.png",
    import.meta.url
  ).toString();
  const shadowUrl = new URL(
    "leaflet/dist/images/marker-shadow.png",
    import.meta.url
  ).toString();

  L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
  anyL.__iconFixApplied = true;
}

/* =========================================================
   Auxiliares
========================================================= */
function ChangeView({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (e) => {
      toast.info("Analizando coordenadas seleccionadas...");
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* =========================================================
   Heatmap Layer (estable + visible)
========================================================= */
function HeatmapLayer({
  points,
  enabled,
}: {
  points: [number, number, number][];
  enabled: boolean;
}) {
  const map = useMap();
  const heatRef = useRef<any>(null);

  // Crea o quita la capa (toggle)
  useEffect(() => {
    const heatFactory = (L as any).heatLayer;

    // Si el plugin no está cargado, aquí lo verás claro
    if (!heatFactory) {
      console.error("leaflet.heat no está disponible: L.heatLayer es undefined");
      return;
    }

    if (!enabled) {
      if (heatRef.current) {
        try {
          map.removeLayer(heatRef.current);
        } catch {}
        heatRef.current = null;
      }
      return;
    }

    // Si está enabled pero no hay puntos, no pintes nada (pero deja el estado preparado)
    if (!points || points.length === 0) return;

    // Crea capa una vez
    if (!heatRef.current) {
      heatRef.current = heatFactory(points, {
        radius: 40,          // ↑ más grande para que se vea
        blur: 25,
        maxZoom: 17,
        minOpacity: 0.35,    // ↑ evita que sea “invisible”
        max: 1,              // como tú normalizas a 0..1
      }).addTo(map);
    } else {
      // Si ya existe, asegúrate de que esté en el mapa
      if (!(map as any).hasLayer?.(heatRef.current)) {
        heatRef.current.addTo(map);
      }
    }
  }, [map, enabled, points]);

  // Actualiza puntos sin recrear la capa
  useEffect(() => {
    if (!enabled) return;
    if (!heatRef.current) return;
    if (!points || points.length === 0) return;

    try {
      heatRef.current.setLatLngs(points);
      // “kick” por si canvas no refresca bien en algunos casos
      map.invalidateSize();
    } catch (e) {
      console.error("Error actualizando heatmap:", e);
    }
  }, [map, enabled, points]);

  return null;
}

/* =========================================================
   Tipos
========================================================= */
type MarkerItem = {
  position: [number, number];
  popup: string;
};

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers?: MarkerItem[];
  onMapClick?: (lat: number, lon: number) => void;

  heatmapPoints?: [number, number, number][];
  heatmapEnabled?: boolean;
  heatmapLoading?: boolean;
  onToggleHeatmap?: () => void;
}

/* =========================================================
   MapView principal
========================================================= */
export default function MapView({
  center,
  zoom = 13,
  markers = [],
  onMapClick,

  heatmapPoints = [],
  heatmapEnabled = false,
  heatmapLoading = false,
  onToggleHeatmap,
}: MapViewProps) {
  const [mapLayer, setMapLayer] = useState<"standard" | "satellite">("standard");

  useEffect(() => {
    ensureLeafletIcons();
  }, []);

  const TILE_LAYERS = useMemo(
    () => ({
      standard: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
      satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution:
          "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, and the GIS User Community",
      },
    }),
    []
  );

  const currentLayer = TILE_LAYERS[mapLayer];

  return (
    <div className="relative h-full w-full">
      <MapContainer
  center={center}
  zoom={zoom}
  minZoom={15}
  maxZoom={18}
  className="h-full w-full"
  worldCopyJump={false}
>

        <ChangeView center={center} zoom={zoom} />
        <MapClickHandler onMapClick={onMapClick} />

        <TileLayer attribution={currentLayer.attribution} url={currentLayer.url} />

        {/* Heatmap */}
        <HeatmapLayer points={heatmapPoints} enabled={heatmapEnabled} />

        {markers
          .filter(
            (m) =>
              Array.isArray(m.position) &&
              Number.isFinite(m.position[0]) &&
              Number.isFinite(m.position[1])
          )
          .map((m, idx) => (
            <Marker key={idx} position={m.position}>
              <Popup>{m.popup}</Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Controles (igual que satélite) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          onClick={() => setMapLayer((l) => (l === "standard" ? "satellite" : "standard"))}
          variant="secondary"
          size="sm"
        >
          {mapLayer === "satellite" ? "🗺️ Mapa" : "🛰️ Satélite"}
        </Button>

        <Button
          onClick={onToggleHeatmap}
          disabled={!onToggleHeatmap || heatmapLoading}
          variant="secondary"
          size="sm"
        >
          {heatmapLoading
            ? "⏳ Cargando..."
            : heatmapEnabled
              ? "🔥 Ocultar contaminación"
              : "🔥 Ver contaminación"}
        </Button>
      </div>
    </div>
  );
}
