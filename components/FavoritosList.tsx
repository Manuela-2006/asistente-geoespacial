"use client";

import { Favorito } from "@/hooks/useFavoritos";
import { MapPin, Trash2, Calendar } from "lucide-react";

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
  if (favoritos.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
          <MapPin className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No hay ubicaciones guardadas todavía.</p>
        <p className="text-xs text-gray-400 mt-1">Busca una ubicación y guárdala en favoritos</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {favoritos.map((fav) => (
        <div
          key={fav.id}
          className="group relative rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-[#c73866] hover:shadow-md"
        >
          <button
            onClick={() => onSelect(fav)}
            className="w-full text-left"
            type="button"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c73866]/10 text-[#c73866]">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">
                  {fav.label}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fav.lat.toFixed(5)}, {fav.lon.toFixed(5)}
                </p>

                {/* Nota */}
                {fav.note && (
                  <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                    {fav.note}
                  </p>
                )}

                {/* Tags */}
                {fav.tags && fav.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {fav.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-md bg-[#c73866]/10 px-2 py-0.5 text-[10px] font-medium text-[#c73866]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Fecha */}
                {fav.createdAt && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {new Date(fav.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Botón eliminar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(fav.id);
            }}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}