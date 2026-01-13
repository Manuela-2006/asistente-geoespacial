"use client";

import { useEffect, useMemo, useState } from "react";
import { Favorito } from "@/hooks/useFavoritos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      {/* Overlay con z-index muy alto */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
        style={{ zIndex: 9999 }}
      >
        <div className="pointer-events-auto w-full max-w-lg">
          <Card className="shadow-2xl">
            <CardHeader>
              <CardTitle>Guardar ubicación en favoritos</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{title}</p>
              <p className="text-xs text-gray-500">
                {defaultData.lat.toFixed(5)}, {defaultData.lon.toFixed(5)}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Nota */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nota / comentario</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: zona con buen transporte, revisar precio medio, evitar calle X..."
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Etiquetas (opcional)</label>
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
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          active 
                            ? "bg-blue-600 text-white border-blue-600" 
                            : "bg-white text-gray-800 hover:bg-gray-100"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="secondary" 
                  onClick={onClose}
                  type="button"
                >
                  Cancelar
                </Button>
                <Button
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
                  type="button"
                >
                  Guardar favorito
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}