"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContactVendorModal from "@/components/dashboard/ContactVendorModal";

export default function AlertActions({
  id,
  vendor,
  title,
  estimated_savings,
}: {
  id: string;
  vendor: string | null;
  title: string;
  estimated_savings: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);

  async function act(status: "acknowledged" | "resolved" | "dismissed") {
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
    <>
      <div className="flex flex-col gap-1 flex-shrink-0 mt-1">
        <button
          onClick={() => act("resolved")}
          disabled={loading !== null}
          className="text-xs px-2.5 py-1 rounded-lg bg-white/70 text-green-700 font-semibold hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading === "resolved" ? "…" : "Résolu ✓"}
        </button>
        {vendor && (
          <button
            onClick={() => setShowContact(true)}
            disabled={loading !== null}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/70 text-blue-700 font-semibold hover:bg-white transition-colors disabled:opacity-50"
          >
            Contacter ✉
          </button>
        )}
        <button
          onClick={() => act("acknowledged")}
          disabled={loading !== null}
          className="text-xs px-2.5 py-1 rounded-lg bg-white/50 text-current opacity-70 font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
        >
          {loading === "acknowledged" ? "…" : "En cours…"}
        </button>
        <button
          onClick={() => act("dismissed")}
          disabled={loading !== null}
          className="text-xs px-2.5 py-1 rounded-lg bg-white/30 text-current opacity-50 font-medium hover:opacity-70 transition-opacity disabled:opacity-30"
        >
          {loading === "dismissed" ? "…" : "Ignorer"}
        </button>
      </div>

      {showContact && vendor && (
        <ContactVendorModal
          vendor={vendor}
          title={title}
          estimated_savings={estimated_savings}
          onClose={() => {
            setShowContact(false);
            act("acknowledged");
          }}
        />
      )}
    </>
  );
}
