"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RerunAnalysisButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRerun() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/run", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "Erreur lors de l'analyse");
      } else {
        router.refresh();
      }
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRerun}
        disabled={loading}
        className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#162c45] transition-colors disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="animate-spin">⟳</span> Analyse en cours…
          </>
        ) : (
          "⟳ Relancer l'analyse"
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
