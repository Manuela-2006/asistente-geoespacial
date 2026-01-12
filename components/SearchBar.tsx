"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SearchBarProps {
  onSearch: (query: string) => void | Promise<void>;
  loading?: boolean;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  loading = false,
  placeholder = "Buscar ubicación (ej: Madrid, España)",
}: SearchBarProps) {
  const [query, setQuery] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    const trimmed = query.trim();
    if (!trimmed) return;

    await onSearch(trimmed);
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              disabled={loading}
              aria-disabled={loading}
              className="flex-1"
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Escribe una dirección o haz click en el mapa</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="submit" disabled={loading}>
              {loading ? "Analizando..." : "Buscar"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Busca y analiza la ubicación con IA</p>
          </TooltipContent>
        </Tooltip>
      </form>
    </TooltipProvider>
  );
}