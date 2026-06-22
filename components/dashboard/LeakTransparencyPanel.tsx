"use client";

import { useState } from "react";

interface ComparisonBasis {
  vendor?: string;
  current_month?: string;
  current_amount?: number;
  reference_months?: string[];
  reference_avg?: number;
  change_pct?: number;
  months_detected?: string[];
  avg_monthly?: number;
  total_spent?: number;
  early_months?: string[];
  recent_months?: string[];
  early_avg?: number;
  recent_avg?: number;
  drift_pct?: number;
  transaction_a?: { id: string; date: string; amount: number };
  transaction_b?: { id: string; date: string; amount: number };
  days_apart?: number;
}

export default function LeakTransparencyPanel({
  detection_logic,
  comparison_basis,
  trigger_count,
}: {
  detection_logic?: string | null;
  comparison_basis?: ComparisonBasis | null;
  trigger_count?: number;
}) {
  const [open, setOpen] = useState(false);

  if (!detection_logic) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-current opacity-60 hover:opacity-100 underline transition-opacity"
      >
        {open ? "Masquer la logique ▲" : `Voir la logique de détection ▼${trigger_count ? ` (${trigger_count} transaction${trigger_count > 1 ? "s" : ""})` : ""}`}
      </button>

      {open && (
        <div className="mt-2 bg-black/5 rounded-lg p-3 space-y-2">
          <p className="text-xs font-mono text-current opacity-80 leading-relaxed">
            {detection_logic}
          </p>

          {comparison_basis && Object.keys(comparison_basis).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer opacity-50 hover:opacity-80">Données de référence</summary>
              <pre className="mt-1 opacity-60 text-xs overflow-x-auto">
                {JSON.stringify(comparison_basis, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
