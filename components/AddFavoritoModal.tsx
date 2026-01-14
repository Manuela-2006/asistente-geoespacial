"use client";

import { useEffect, useMemo, useState } from "react";
import { Favorito } from "@/hooks/useFavoritos";
import { X, MapPin, MessageSquare, Tag } from "lucide-react";

type Props = {
  open: boolean;
  defaultData: {
    id: string;
    label: string;
    lat: number;
    lon: number;
  } | null;
  onClose: () => void;
  onConfirm: (fav: Favorito) => void;
};

const TAGS = [
  "Visita",
  "Invertir",
  "Vivir",
  "Descartar",
  "Centro",
  "Periferia",
  "Buena conexión",
];

export default function AddFavoritoModal({
  open,
  defaultData,
  onClose,
  onConfirm,
}: Props) {
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setNote("");
      setSelectedTags([]);
    }
  }, [open]);

  const title = useMemo(() => {
    if (!defaultData) return "";
    return defaultData.label || `${defaultData.lat.toFixed(5)}, ${defaultData.lon.toFixed(5)}`;
  }, [defaultData]);

  if (!open || !defaultData) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none z-[9999]"
      >
        <div className="pointer-events-auto w-full max-w-lg animate-in zoom-in-95 duration-200">
          <div className="rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c73866]/10 text-[#c73866]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Guardar en favoritos</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{title}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Coordenadas */}
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">Coordenadas</p>
                <p className="text-sm font-mono text-gray-900 mt-1">
                  {defaultData.lat.toFixed(6)}, {defaultData.lon.toFixed(6)}
                </p>
              </div>

              {/* Nota */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <MessageSquare className="h-4 w-4 text-[#c73866]" />
                  Nota / Comentario
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: zona con buen transporte, revisar precio medio..."
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-all focus:border-[#c73866] focus:outline-none focus:ring-2 focus:ring-[#c73866]/20 min-h-[100px] resize-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Tag className="h-4 w-4 text-[#c73866]" />
                  Etiquetas
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((t) => {
                    const active = selectedTags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedTags((prev) =>
                            prev.includes(t)
                              ? prev.filter((x) => x !== t)
                              : [...prev, t]
                          );
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          active
                            ? "bg-[#c73866] text-white shadow-md" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-200 p-6">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onConfirm({
                    id: defaultData.id,
                    label: defaultData.label,
                    lat: defaultData.lat,
                    lon: defaultData.lon,
                    note: note.trim() || undefined,
                    tags: selectedTags.length ? selectedTags : undefined,
                    createdAt: new Date().toISOString(),
                  });
                }}
                className="flex-1 rounded-xl bg-[#c73866] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#a82d52] shadow-lg shadow-[#c73866]/25"
                type="button"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}