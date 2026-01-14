"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import jsPDF from "jspdf";
import { Menu, X, MapPin, History, BarChart3, Star, Download } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FavoritosList from "@/components/FavoritosList";
import AddFavoritoModal from "@/components/AddFavoritoModal";
import HistoricalAnalysis from "@/components/HistoricalAnalysis";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useFavoritos, Favorito } from "@/hooks/useFavoritos";

type MarkerItem = { position: [number, number]; popup: string };

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-50">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

type MenuSection = "search" | "analysis" | "historical" | "compare" | "favorites" | null;

export default function Home() {
  const [center, setCenter] = useState<[number, number]>([40.416775, -3.70379]);
  const [zoom, setZoom] = useState<number>(13);
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
  
  const [favModalOpen, setFavModalOpen] = useState(false);
  const [favDefaultData, setFavDefaultData] = useState<{
    id: string;
    label: string;
    lat: number;
    lon: number;
  } | null>(null);

  // Control del menú lateral
  const [activeMenu, setActiveMenu] = useState<MenuSection>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = (section: MenuSection) => {
    if (activeMenu === section) {
      setActiveMenu(null);
      setIsMenuOpen(false);
    } else {
      setActiveMenu(section);
      setIsMenuOpen(true);
    }
  };

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
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])/g, "")
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
      setActiveMenu("analysis");
      setIsMenuOpen(true);
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
      setActiveMenu("analysis");
      setIsMenuOpen(true);
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
      const res = await fetch(`/api/air-quality?lat=${center[0]}&lon=${center[1]}`);
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

  const PAGE_W = 210;
  const PAGE_H = 297;
  const M = 18; // margen
  const MAX_W = PAGE_W - M * 2;

  let y = 18;

  // Helpers
  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - M) {
      doc.addPage();
      y = M;
    }
  };

  const addH1 = (text: string) => {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(text, PAGE_W / 2, y, { align: "center" });
    y += 10;
  };

  const addMeta = (text: string) => {
    ensureSpace(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(text, M, y);
    y += 6;
  };

  const addDivider = () => {
    ensureSpace(6);
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(M, y, PAGE_W - M, y);
    y += 6;
  };

  const addSection = (title: string) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text(title.toUpperCase(), M, y);
    y += 7;
  };

  const addParagraph = (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(cleaned, MAX_W);
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, M, y);
      y += 5.5;
    }
    y += 2; // aire
  };

  const addKeyValue = (key: string, value: string) => {
    const k = key.trim().replace(/:$/, "");
    const v = value.trim();

    if (!k || !v) return;

    doc.setFontSize(11);

    // Key bold + value normal en la misma línea (si cabe)
    const keyText = `${k}: `;
    doc.setFont("helvetica", "bold");
    const keyW = doc.getTextWidth(keyText);

    doc.setFont("helvetica", "normal");
    const valueLines = doc.splitTextToSize(v, MAX_W - keyW);

    ensureSpace(6);
    doc.setFont("helvetica", "bold");
    doc.text(keyText, M, y);

    doc.setFont("helvetica", "normal");
    doc.text(valueLines[0], M + keyW, y);
    y += 5.5;

    // Si hay más líneas de valor, van debajo alineadas con el texto
    for (let i = 1; i < valueLines.length; i++) {
      ensureSpace(6);
      doc.text(valueLines[i], M, y);
      y += 5.5;
    }

    y += 1;
  };

  // ==========
  // HEADER
  // ==========
  addH1("Informe de Análisis Geoespacial");
  addMeta(`Fecha: ${new Date().toLocaleString()}`);
  addDivider();

  // ==========
  // PARSE DEL INFORME
  // ==========
  const lines = reportText
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);

  const isSectionTitle = (l: string) => {
    // Títulos tipo "UBICACIÓN" o "INFRAESTRUCTURA URBANA"
    // (solo letras, espacios y acentos, y longitud mínima)
    return /^[A-ZÁÉÍÓÚÑÜ\s]{4,}$/.test(l) && l === l.toUpperCase();
  };

  for (const line of lines) {
    // Evita líneas duplicadas tipo "Infraestructuras Territoriales: Infraestructuras Territoriales: ..."
    const dedup = line.replace(/^(.+):\s+\1:\s*/i, "$1: ");

    if (isSectionTitle(dedup)) {
      addSection(dedup);
      continue;
    }

    // Campo: valor
    const kvMatch = dedup.match(/^(.{2,40}?):\s*(.+)$/);
    if (kvMatch) {
      addKeyValue(kvMatch[1], kvMatch[2]);
      continue;
    }

    addParagraph(dedup);
  }

  doc.save("informe_geoespacial.pdf");
  toast.success("PDF generado correctamente");
};

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50 font-inter">
      {/* Mapa a pantalla completa */}
      <div className="absolute inset-0">
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
            <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-2xl">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-gray-200 border-t-[#c73866]" />
              <span className="text-sm font-medium text-gray-700">
                Analizando ubicación...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Botón del menú flotante */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="absolute top-6 left-6 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-2xl transition-all hover:bg-gray-50 hover:scale-105"
      >
        {isMenuOpen ? (
          <X className="h-6 w-6 text-gray-700" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700" />
        )}
      </button>

      {/* Menú lateral */}
      <div
        className={`absolute top-0 left-0 z-[999] h-full w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        } overflow-y-auto`}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Asistente <span className="text-[#c73866]">Geoespacial</span>
            </h1>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Botones del menú */}
          <div className="space-y-3">
            <MenuButton
              icon={<MapPin className="h-5 w-5" />}
              label="Buscar Ubicación"
              active={activeMenu === "search"}
              onClick={() => toggleMenu("search")}
            />
            <MenuButton
              icon={<BarChart3 className="h-5 w-5" />}
              label="Informe de Análisis"
              active={activeMenu === "analysis"}
              onClick={() => toggleMenu("analysis")}
              disabled={!reportText}
            />
            <MenuButton
              icon={<History className="h-5 w-5" />}
              label="Análisis Histórico"
              active={activeMenu === "historical"}
              onClick={() => toggleMenu("historical")}
            />
            <MenuButton
              icon={<BarChart3 className="h-5 w-5" />}
              label="Comparar Ciudades"
              active={activeMenu === "compare"}
              onClick={() => toggleMenu("compare")}
            />
            <MenuButton
              icon={<Star className="h-5 w-5" />}
              label="Favoritos"
              active={activeMenu === "favorites"}
              onClick={() => toggleMenu("favorites")}
              badge={favoritos.length}
            />
          </div>

          {/* Contenido según sección activa */}
          <div className="mt-8">
            {activeMenu === "search" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Buscar Ubicación</h2>
                <p className="text-sm text-gray-600">
                  Escribe una dirección o haz clic en el mapa
                </p>
                <SearchBar onSearch={handleSearch} loading={loading} />
                {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
              </div>
            )}

            {activeMenu === "analysis" && reportText && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Informe de Análisis</h2>
                  <div className="flex gap-2">
                    {currentId && (
                      <button
                        onClick={() => {
                          if (isFavorito(currentId)) {
                            removeFavorito(currentId);
                            toast.info("Eliminado de favoritos");
                          } else {
                            openAddFavModal();
                          }
                        }}
                        className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        <Star className="h-4 w-4" />
                        {isFavorito(currentId) ? "Quitar" : "Guardar"}
                      </button>
                    )}
                    <button
                      onClick={exportToPDF}
                      className="flex items-center gap-2 rounded-lg bg-[#c73866] px-3 py-2 text-sm font-medium text-white hover:bg-[#a82d52] transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5 max-h-[calc(100vh-300px)] overflow-auto">
                  <div className="prose prose-sm max-w-none">
                    {reportText.split("\n").map((line, idx) => {
                      const isTitle = line === line.toUpperCase() && line.trim().length > 4;
                      return (
                        <p
                          key={idx}
                          className={
                            isTitle
                              ? "font-bold uppercase text-[#c73866] mt-4 text-base"
                              : "text-gray-800 leading-relaxed text-sm"
                          }
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeMenu === "historical" && (
              <HistoricalAnalysis
                currentLocation={markers.length > 0 ? markers[0].popup : undefined}
                currentLat={markers.length > 0 ? markers[0].position[0] : undefined}
                currentLon={markers.length > 0 ? markers[0].position[1] : undefined}
              />
            )}

            {activeMenu === "compare" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Comparar Ciudades</h2>
                <p className="text-sm text-gray-600">
                  Introduce dos ciudades, zonas o ubicaciones
                </p>
                <input
                  type="text"
                  placeholder="Lugar A (ej. Barcelona)"
                  value={compareA}
                  onChange={(e) => setCompareA(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c73866]"
                />
                <input
                  type="text"
                  placeholder="Lugar B (ej. Bilbao)"
                  value={compareB}
                  onChange={(e) => setCompareB(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c73866]"
                />
                <button
                  onClick={handleCompare}
                  disabled={compareLoading}
                  className="w-full rounded-lg bg-[#c73866] px-4 py-3 text-sm font-medium text-white hover:bg-[#a82d52] disabled:opacity-50 transition-colors"
                >
                  {compareLoading ? "Comparando..." : "Comparar"}
                </button>

                {compareResult && (
                  <div className="rounded-lg border border-gray-200 bg-white p-5 mt-4 max-h-[calc(100vh-400px)] overflow-auto">
                    <div className="prose prose-sm max-w-none">
                      {compareResult.split("\n").map((line, idx) => {
                        const isTitle = line === line.toUpperCase() && line.trim().length > 4;
                        return (
                          <p
                            key={idx}
                            className={
                              isTitle
                                ? "font-bold uppercase text-[#c73866] mt-4"
                                : "text-gray-800 leading-relaxed"
                            }
                          >
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeMenu === "favorites" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Favoritos</h2>
                <FavoritosList
                  favoritos={favoritos}
                  onSelect={(fav) => {
                    handleSelectFavorito(fav);
                    setIsMenuOpen(false);
                  }}
                  onRemove={(id) => {
                    removeFavorito(id);
                    toast.info("Favorito eliminado");
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal añadir favorito */}
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
  );
}

// Componente auxiliar para botones del menú
function MenuButton({
  icon,
  label,
  active,
  onClick,
  disabled,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between rounded-lg px-4 py-3 text-left transition-all ${
        active
          ? "bg-[#c73866] text-white shadow-lg"
          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#c73866]">
          {badge}
        </span>
      )}
    </button>
  );
}