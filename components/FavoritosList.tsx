"use client";

import { Favorito } from "@/hooks/useFavoritos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FavoritosListProps {
  favoritos: Favorito[];
  onSelect: (fav: Favorito) => void;
}

export default function FavoritosList({
  favoritos,
  onSelect,
}: FavoritosListProps) {
  if (favoritos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>⭐ Favoritos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            No hay ubicaciones guardadas todavía.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>⭐ Favoritos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {favoritos.map((fav) => (
          <button
            key={fav.id}
            onClick={() => onSelect(fav)}
            className="w-full rounded-md border bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
          >
            <div className="font-medium">{fav.label}</div>
            <div className="text-xs text-gray-500">
              {fav.lat.toFixed(5)}, {fav.lon.toFixed(5)}
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
