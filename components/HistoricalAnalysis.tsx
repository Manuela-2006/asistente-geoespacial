"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Calendar, TrendingUp } from "lucide-react";

interface HistoricalAnalysisProps {
  currentLocation?: string;
  currentLat?: number;
  currentLon?: number;
}

export default function HistoricalAnalysis({
  currentLocation,
  currentLat,
  currentLon,
}: HistoricalAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState<number[]>([2000, 2010, 2020, 2024]);
  const [customLocation, setCustomLocation] = useState("");

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 50 }, (_, i) => currentYear - i);

  const handleAnalyze = async () => {
    const location = customLocation || currentLocation;
    
    if (!location && (!currentLat || !currentLon)) {
      toast.error("Selecciona una ubicación primero");
      return;
    }

    if (selectedYears.length < 2) {
      toast.error("Selecciona al menos 2 años para comparar");
      return;
    }

    setLoading(true);
    setResult(null);
    toast.info("Analizando evolución histórica...");

    try {
      const response = await fetch("/api/historical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: location,
          latitude: currentLat,
          longitude: currentLon,
          years: selectedYears.sort(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || "Error al analizar datos históricos");
        return;
      }

      if (!data.analysis || data.analysis.trim() === "") {
        toast.error("No se recibió análisis");
        return;
      }

      setResult(data.analysis);
      toast.success("Análisis histórico completado");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort()
    );
  };

  const formatAnalysis = (text: string) => {
    if (!text) return null;

    const lines = text.split("\n");
    const formatted = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const isSection = line === line.toUpperCase() && 
                       line.length > 3 && 
                       line.length < 50 &&
                       !line.includes(":");
      
      if (isSection && line.length > 0) {
        formatted.push(
          <h3 key={i} className="text-base font-bold text-[#c73866] mt-6 mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {line}
          </h3>
        );
      } else if (line.length > 0) {
        formatted.push(
          <p key={i} className="text-sm text-gray-700 leading-relaxed mb-3">
            {line}
          </p>
        );
      }
    }
    
    return formatted;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Análisis Histórico</h2>
        <p className="text-xs text-gray-500 mt-1">
          Analiza la evolución de una ubicación a lo largo del tiempo
        </p>
      </div>

      {/* Input de ubicación */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">
          Ubicación {currentLocation && <span className="text-gray-400 font-normal">(actual: {currentLocation})</span>}
        </label>
        <input
          type="text"
          value={customLocation}
          onChange={(e) => setCustomLocation(e.target.value)}
          placeholder="Deja vacío para usar la ubicación actual"
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm transition-all focus:border-[#c73866] focus:outline-none focus:ring-2 focus:ring-[#c73866]/20"
        />
      </div>

      {/* Selector de años */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <Calendar className="h-4 w-4 text-[#c73866]" />
          Años a analizar ({selectedYears.length} seleccionados)
        </label>
        
        {/* Años seleccionados */}
        <div className="flex flex-wrap gap-2">
          {selectedYears.sort((a, b) => a - b).map((year) => (
            <span
              key={year}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#c73866] px-3 py-1 text-xs font-semibold text-white shadow-md"
            >
              {year}
              <button
                onClick={() => toggleYear(year)}
                className="hover:text-white/70 transition-colors"
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Grid de años */}
        <div className="grid grid-cols-5 gap-2 max-h-[180px] overflow-y-auto p-2 border border-gray-200 rounded-xl">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              type="button"
              className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                selectedYears.includes(year)
                  ? "bg-[#c73866] text-white shadow-md"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Botón analizar */}
      <button
        onClick={handleAnalyze}
        disabled={loading || selectedYears.length < 2}
        className="w-full rounded-xl bg-[#c73866] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#a82d52] disabled:opacity-50 shadow-lg shadow-[#c73866]/25"
        type="button"
      >
        {loading ? "Analizando..." : "Analizar Evolución Histórica"}
      </button>

      {/* Resultado */}
      {result && (
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-md">
          <h3 className="text-base font-bold text-gray-900 mb-4">
            Resultado del Análisis
          </h3>
          <div className="prose prose-sm max-w-none max-h-[400px] overflow-auto">
            {formatAnalysis(result)}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[#c73866]/5">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#c73866]"></div>
          <span className="mt-3 text-sm text-gray-600 font-medium">Generando análisis...</span>
        </div>
      )}
    </div>
  );
}