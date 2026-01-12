"use client";

import { useEffect, useState } from "react";

export interface Favorito {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

const STORAGE_KEY = "favoritos";

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);

  // Cargar favoritos desde localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setFavoritos(JSON.parse(stored));
      } catch {
        setFavoritos([]);
      }
    }
  }, []);

  // Guardar favoritos en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritos));
  }, [favoritos]);

  const addFavorito = (fav: Favorito) => {
    setFavoritos((prev) =>
      prev.some((f) => f.id === fav.id) ? prev : [...prev, fav]
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
    removeFavorito,
    isFavorito,
  };
}
