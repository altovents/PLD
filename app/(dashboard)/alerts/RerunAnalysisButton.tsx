"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

export default function RerunAnalysisButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleRerun() {
    setLoading(true);
    try {
      const res = await fetch("/api/analysis/run", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        toast(body.error ?? "Erreur lors de l'analyse", "error");
      } else {
        toast("Analyse relancée avec succès", "success");
        router.refresh();
      }
    } catch {
      toast("Impossible de contacter le serveur", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
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
  );
}
