"use client";

import { useEffect, useState } from "react";

export interface Favorito {
  id: string;
  label: string;
  lat: number;
  lon: number;

  // ✅ Nuevos campos (opcionales para no romper favoritos antiguos)
  note?: string;
  tags?: string[];
  createdAt?: string;
}

const STORAGE_KEY = "favoritos";

// Normaliza datos antiguos y evita valores corruptos
function normalizeFavorito(raw: any): Favorito | null {
  if (!raw || typeof raw !== "object") return null;

  const id = String(raw.id ?? "").trim();
  const label = String(raw.label ?? "").trim();
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);

  if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const note =
    typeof raw.note === "string" && raw.note.trim() ? raw.note.trim() : undefined;

  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .map((t: any) => String(t).trim())
        .filter((t: string) => t.length > 0)
    : undefined;

  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt.trim()
      ? raw.createdAt.trim()
      : undefined;

  return {
    id,
    label: label || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    lat,
    lon,
    note,
    tags: tags && tags.length ? tags : undefined,
    createdAt,
  };
}

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);

  // Cargar favoritos desde localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        setFavoritos([]);
        return;
      }

      const normalized = parsed
        .map(normalizeFavorito)
        .filter(Boolean) as Favorito[];

      setFavoritos(normalized);
    } catch {
      setFavoritos([]);
    }
  }, []);

  // Guardar favoritos en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritos));
  }, [favoritos]);

  // ✅ Añadir favorito (si existe, NO duplica)
  const addFavorito = (fav: Favorito) => {
    setFavoritos((prev) => (prev.some((f) => f.id === fav.id) ? prev : [...prev, fav]));
  };

  // ✅ Actualizar favorito (útil si quieres editar nota/tags)
  const updateFavorito = (id: string, patch: Partial<Favorito>) => {
    setFavoritos((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const removeFavorito = (id: string) => {
    setFavoritos((prev) => prev.filter((f) => f.id !== id));
  };

  const isFavorito = (id: string) => {
    return favoritos.some((f) => f.id === id);
  };

  return {
    favoritos,
    addFavorito,
    updateFavorito, // ✅ nuevo (no rompe nada si no lo usas)
    removeFavorito,
    isFavorito,
  };
}
