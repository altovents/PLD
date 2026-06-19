"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function HeaderSearch() {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q") as string;
    if (q.trim()) {
      router.push(`/transactions?q=${encodeURIComponent(q.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="search"
        name="q"
        placeholder="Rechercher un fournisseur..."
        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
      />
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    </form>
  );
}
