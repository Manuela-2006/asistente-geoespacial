"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import jsPDF from "jspdf";
import SearchBar from "@/components/SearchBar";
import FavoritosList from "@/components/FavoritosList";
import AddFavoritoModal from "@/components/AddFavoritoModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useFavoritos, Favorito } from "@/hooks/useFavoritos";

type MarkerItem = { position: [number, number]; popup: string };

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-lg">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

export default function Home() {
  const [center, setCenter] = useState<[number, number]>([40.416775, -3.70379]);
  const [zoom, setZoom] = useState<number>(13);
  
  // ✅ Heatmap (control desde page)
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatPoints, setHeatPoints] = useState<[number, number, number][]>([]);
  const [heatLoading, setHeatLoading] = useState(false);
  
  const [markers, setMarkers] = useState<MarkerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  
  const { favoritos, addFavorito, removeFavorito, isFavorito } = useFavoritos();
  
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  
  // ✅ Modal añadir favorito
  const [favModalOpen, setFavModalOpen] = useState(false);
  const [favDefaultData, setFavDefaultData] = useState<{
    id: string;
    label: string;
    lat: number;
    lon: number;
  } | null>(null);

  /* =========================
     UTILIDADES
  ========================= */
  const setMarkerSafe = (lat: unknown, lon: unknown, popup: string) => {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      setMarkers([]);
      return false;
    }
    setCenter([latNum, lonNum]);
    setZoom(14);
    setMarkers([{ position: [latNum, lonNum], popup }]);
    return true;
  };

  const cleanReport = (text: string) => {
    return text
      .replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])/g,
        ""
      )
      .replace(/\*\*/g, "")
      .replace(/#+\s*/g, "")
      .replace(/^[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]+/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const formatReportForDisplay = (text: string) => {
    let t = cleanReport(text);
    const sections = [
      "Ubicación",
      "Infraestructura Urbana",
      "Evaluación de Riesgo de Inundación",
      "Conclusión",
      "Consideraciones finales",
    ];
    sections.forEach((title) => {
      const regex = new RegExp(`\\n?${title}\\n?`, "i");
      t = t.replace(regex, `\n\n${title.toUpperCase()}\n\n`);
    });
    const fields = [
      "Coordenadas exactas",
      "Dirección completa",
      "Fuente de datos",
      "Nivel de riesgo",
      "Justificación",
      "Recomendaciones",
      "Factores considerados",
    ];
    fields.forEach((field) => {
      const regex = new RegExp(`${field}:`, "gi");
      t = t.replace(regex, `\n${field}:`);
    });
    [
      "Educación",
      "Salud",
      "Comercio",
      "Transporte",
      "Servicios Públicos",
      "Ocio",
      "Infraestructuras Territoriales",
      "Elevación",
      "Proximidad a ríos",
      "Zona costera",
    ].forEach((cat) => {
      const r = new RegExp(`${cat}:`, "gi");
      t = t.replace(r, `\n${cat}:`);
    });
    t = t.replace(/\n{3,}/g, "\n\n");
    return t.trim();
  };

  const reportText =
    typeof result?.ai_response === "string" && result.ai_response.trim()
      ? formatReportForDisplay(result.ai_response)
      : null;

  const currentId = useMemo(() => {
    if (markers.length === 0) return null;
    return `${markers[0].position[0]},${markers[0].position[1]}`;
  }, [markers]);

  /* =========================
     BÚSQUEDA TEXTO
  ========================= */
  const handleSearch = async (query: string) => {
    if (loading) return;
    toast.info("Analizando ubicación...");
    setLoading(true);
    setResult(null);
    setErrorMsg("");
    setShowHeatmap(false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      
      if (!response.ok || !data?.success) {
        const msg = data?.error || "Error al analizar la ubicación.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      const coordsTool = Array.isArray(data.tools_used)
        ? data.tools_used.find((t: any) => t?.tool === "buscarCoordenadas")
        : null;
        
      if (coordsTool?.result?.success) {
        const { lat, lon, direccion_completa } = coordsTool.result;
        setMarkerSafe(lat, lon, direccion_completa || query);
      }

      setResult(data);
      toast.success("Ubicación analizada correctamente");
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     COMPARAR DOS LUGARES
  ========================= */
  const handleCompare = async () => {
    if (!compareA || !compareB) {
      toast.error("Introduce ambos lugares para comparar");
      return;
    }
    setCompareLoading(true);
    setCompareResult(null);

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lugarA: compareA, lugarB: compareB }),
      });
      const data = await response.json();
      
      if (!response.ok || !data?.success) {
        toast.error("Error al comparar ubicaciones");
        return;
      }

      setCompareResult(formatReportForDisplay(data.result));
      toast.success("Comparación completada");
    } catch {
      toast.error("Error de red");
    } finally {
      setCompareLoading(false);
    }
  };

  /* =========================
     CLICK MAPA
  ========================= */
  const handleMapClick = async (lat: number, lon: number) => {
    if (loading) return;
    toast.info("Analizando coordenadas...");
    setLoading(true);
    setResult(null);
    setErrorMsg("");
    setShowHeatmap(false);
    setMarkerSafe(lat, lon, `Lat ${lat.toFixed(6)}, Lon ${lon.toFixed(6)}`);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      const data = await response.json();
      
      if (!response.ok || !data?.success) {
        toast.error("Error al analizar coordenadas");
        return;
      }

      setResult(data);
      toast.success("Coordenadas analizadas correctamente");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     CARGAR CONTAMINACIÓN (OpenAQ)
  ========================= */
  const loadAirQuality = async () => {
    try {
      toast.info("Cargando datos de contaminación...");
      setHeatLoading(true);
      const res = await fetch(
        `/api/air-quality?lat=${center[0]}&lon=${center[1]}`
      );
      const data = await res.json();
      
      if (!data.points || data.points.length === 0) {
        toast.warning("No hay datos de contaminación cercanos");
        return false;
      }

      const formatted: [number, number, number][] = data.points.map((p: any) => [
        p.lat,
        p.lon,
        p.value,
      ]);
      setHeatPoints(formatted);
      toast.success("Mapa de contaminación cargado");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Error cargando datos de contaminación");
      return false;
    } finally {
      setHeatLoading(false);
    }
  };

  const toggleHeatmap = async () => {
    if (!showHeatmap) {
      const ok = await loadAirQuality();
      if (!ok) return;
    }
    setShowHeatmap((v) => !v);
  };

  /* =========================
     FAVORITOS
  ========================= */
  const handleSelectFavorito = (fav: Favorito) => {
    setCenter([fav.lat, fav.lon]);
    setZoom(14);
    setMarkers([{ position: [fav.lat, fav.lon], popup: fav.label }]);
    setShowHeatmap(false);
    toast.info("Ubicación cargada desde favoritos");
  };

  // ✅ Función para abrir el modal con los datos actuales
  const openAddFavModal = () => {
    if (!currentId || markers.length === 0) {
      toast.error("No hay ubicación seleccionada");
      return;
    }
    
    const lat = markers[0].position[0];
    const lon = markers[0].position[1];
    const label = markers[0].popup || `Lat ${lat.toFixed(6)}, Lon ${lon.toFixed(6)}`;
    
    setFavDefaultData({
      id: currentId,
      label,
      lat,
      lon,
    });
    setFavModalOpen(true);
  };

  /* =========================
     EXPORTAR PDF
  ========================= */
  const exportToPDF = () => {
    if (!reportText) {
      toast.error("No hay informe para exportar");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    let y = 20;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Informe de Análisis Geoespacial", 105, y, { align: "center" });
    y += 12;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, y);
    y += 8;
    
    doc.line(20, y, 190, y);
    y += 10;
    
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(reportText, 170);
    lines.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 6;
    });

    doc.save("informe_geoespacial.pdf");
    toast.success("PDF generado correctamente");
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Asistente Geoespacial con IA
          </h1>
          <p className="text-gray-600">
            Análisis geoespacial basado en datos reales
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buscar ubicación</CardTitle>
            <CardDescription>
              Escribe una dirección o haz clic en el mapa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchBar onSearch={handleSearch} loading={loading} />
            {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
          </CardContent>
        </Card>

        <FavoritosList
          favoritos={favoritos}
          onSelect={handleSelectFavorito}
          onRemove={(id) => {
            removeFavorito(id);
            toast.info("Favorito eliminado");
          }}
        />

        <Card>
          <CardContent className="p-0">
            <div className="relative h-[500px] w-full">
              <MapView
                center={center}
                zoom={zoom}
                markers={markers}
                onMapClick={loading ? undefined : handleMapClick}
                heatmapPoints={showHeatmap ? heatPoints : []}
                heatmapEnabled={showHeatmap}
                heatmapLoading={heatLoading}
                onToggleHeatmap={toggleHeatmap}
              />
              {loading && (
                <div className="absolute inset-0 z-[999] flex items-center justify-center bg-white/60 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-md bg-white px-4 py-2 shadow">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                    <span className="text-sm font-medium">
                      Analizando ubicación...
                    </span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 px-4 pb-4">
              Los datos de contaminación proceden de estaciones cercanas (OpenAQ) y no
              representan valores exactos por punto. La cobertura depende de la
              disponibilidad de estaciones y del parámetro PM2.5.
            </p>
          </CardContent>
        </Card>

        {reportText && !loading && (
          <Card>
            <CardHeader>
              <CardTitle>Informe de análisis</CardTitle>
              <div className="mt-2 flex gap-4">
                {currentId && (
                  <button
                    onClick={() => {
                      if (isFavorito(currentId)) {
                        removeFavorito(currentId);
                        toast.info("Eliminado de favoritos");
                      } else {
                        // ✅ Abre el modal para añadir nota/comentario
                        openAddFavModal();
                      }
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {isFavorito(currentId)
                      ? "Quitar de favoritos"
                      : "Guardar en favoritos"}
                  </button>
                )}
                <button
                  onClick={exportToPDF}
                  className="text-sm text-green-600 hover:underline"
                >
                  Exportar PDF
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-white">
                <div className="max-h-[520px] overflow-auto p-5">
                  {reportText.split("\n").map((line, idx) => {
                    const isTitle =
                      line === line.toUpperCase() && line.trim().length > 4;
                    return (
                      <p
                        key={idx}
                        className={
                          isTitle
                            ? "font-bold uppercase text-gray-900 mt-4"
                            : "text-gray-800 leading-relaxed"
                        }
                      >
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Comparación de ubicaciones</CardTitle>
            <CardDescription>
              Introduce dos ciudades, zonas o ubicaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="text"
              placeholder="Lugar A (ej. Barcelona)"
              value={compareA}
              onChange={(e) => setCompareA(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Lugar B (ej. Bilbao)"
              value={compareB}
              onChange={(e) => setCompareB(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <button
              onClick={handleCompare}
              disabled={compareLoading}
              className="rounded bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {compareLoading ? "Comparando..." : "Comparar"}
            </button>
          </CardContent>
        </Card>

        {compareResult && (
          <Card>
            <CardHeader>
              <CardTitle>Resultado de la comparación</CardTitle>
            </CardHeader>
            <CardContent>
              {compareResult.split("\n").map((line, idx) => {
                const isTitle =
                  line === line.toUpperCase() && line.trim().length > 4;
                return (
                  <p
                    key={idx}
                    className={
                      isTitle
                        ? "font-bold uppercase mt-4"
                        : "text-gray-800 leading-relaxed"
                    }
                  >
                    {line}
                  </p>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ✅ Modal añadir favorito con nota */}
        <AddFavoritoModal
          open={favModalOpen}
          defaultData={favDefaultData}
          onClose={() => setFavModalOpen(false)}
          onConfirm={(fav: Favorito) => {
            addFavorito(fav);
            toast.success("Guardado en favoritos");
            setFavModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}