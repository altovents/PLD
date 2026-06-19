"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AlertActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"resolved" | "dismissed" | null>(null);

  async function act(status: "resolved" | "dismissed") {
    setLoading(status);
    await fetch("/api/alerts/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1 flex-shrink-0 mt-1">
      <button
        onClick={() => act("resolved")}
        disabled={loading !== null}
        className="text-xs px-2.5 py-1 rounded-lg bg-white/70 text-green-700 font-semibold hover:bg-white transition-colors disabled:opacity-50"
      >
        {loading === "resolved" ? "…" : "Résolu ✓"}
      </button>
      <button
        onClick={() => act("dismissed")}
        disabled={loading !== null}
        className="text-xs px-2.5 py-1 rounded-lg bg-white/30 text-current opacity-60 font-medium hover:opacity-80 transition-opacity disabled:opacity-30"
      >
        {loading === "dismissed" ? "…" : "Ignorer"}
      </button>
    </div>
  );
}
