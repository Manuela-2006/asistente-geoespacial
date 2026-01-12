"use client";

import { useEffect, useMemo, useState } from "react";
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
function ChangeView({
  center,
  zoom,
}: {
  center: LatLngExpression;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      toast.info("Analizando coordenadas seleccionadas...");
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* =========================================================
   Heatmap layer
========================================================= */
function HeatmapLayer({
  points,
  visible,
}: {
  points: [number, number, number][];
  visible: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!visible || !points || points.length === 0) return;

    const layer = (L as any).heatLayer(points, {
      radius: 25,
      blur: 18,
      maxZoom: 17,
    });

    layer.addTo(map);

    return () => {
      try {
        map.removeLayer(layer);
      } catch {
        // si ya no existe, no pasa nada
      }
    };
  }, [map, points, visible]);

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

  // 🔥 Heatmap controlado desde page.tsx
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
        className="h-full w-full rounded-lg border border-gray-200 shadow-sm"
        scrollWheelZoom
      >
        <ChangeView center={center} zoom={zoom} />
        <MapClickHandler onMapClick={onMapClick} />

        <TileLayer attribution={currentLayer.attribution} url={currentLayer.url} />

        {heatmapEnabled && (
          <HeatmapLayer points={heatmapPoints} visible={heatmapEnabled} />
        )}

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

      {/* ✅ Controles del mapa (igual que satélite) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          onClick={() =>
            setMapLayer((l) => (l === "standard" ? "satellite" : "standard"))
          }
          variant="secondary"
          size="sm"
        >
          {mapLayer === "satellite" ? "🗺️ Mapa" : "🛰️ Satélite"}
        </Button>

        {/* 🔥 Botón contaminación dentro del overlay */}
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
