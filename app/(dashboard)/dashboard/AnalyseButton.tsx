"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function AnalyseButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAnalyse() {
    setLoading(true);
    try {
      await fetch("/api/analysis/run", { method: "POST" });
      router.push("/dashboard?analysed=true");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleAnalyse}
      disabled={loading}
      className="flex items-center gap-2 bg-[#e85d04] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#c94d00] transition-colors disabled:opacity-60"
    >
      <Search size={15} className={loading ? "animate-pulse" : ""} />
      {loading ? "Analyse en cours…" : "Analyser"}
    </button>
  );
}
