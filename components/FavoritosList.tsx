"use client";

import { Favorito } from "@/hooks/useFavoritos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FavoritosListProps {
  favoritos: Favorito[];
  onSelect: (fav: Favorito) => void;
  onRemove: (id: string) => void;
}

export default function FavoritosList({
  favoritos,
  onSelect,
  onRemove,
}: FavoritosListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>⭐ Favoritos</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {favoritos.length === 0 ? (
          <p className="text-sm text-gray-500">No hay ubicaciones guardadas todavía.</p>
        ) : (
          favoritos.map((fav) => (
            <div
              key={fav.id}
              className="w-full rounded-md border bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Click para seleccionar */}
                <button
                  onClick={() => onSelect(fav)}
                  className="flex-1 text-left"
                  type="button"
                >
                  <div className="font-medium">{fav.label}</div>
                  <div className="text-xs text-gray-500">
                    {fav.lat.toFixed(5)}, {fav.lon.toFixed(5)}
                  </div>

                  {/* Nota */}
                  {fav.note && (
                    <div className="mt-2 text-xs text-gray-700">
                      <span className="font-medium">Nota:</span> {fav.note}
                    </div>
                  )}

                  {/* Tags */}
                  {fav.tags && fav.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {fav.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border px-2 py-0.5 text-[11px] text-gray-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Fecha */}
                  {fav.createdAt && (
                    <div className="mt-2 text-[11px] text-gray-400">
                      Guardado: {new Date(fav.createdAt).toLocaleString()}
                    </div>
                  )}
                </button>

                {/* Eliminar */}
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => onRemove(fav.id)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
