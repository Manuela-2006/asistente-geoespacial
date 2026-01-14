"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ubicación (ej: Madrid, España)"
          disabled={loading}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-5 py-3.5 pr-12 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all focus:border-[#c73866] focus:outline-none focus:ring-2 focus:ring-[#c73866]/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#c73866] text-white transition-all hover:bg-[#a82d52] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}