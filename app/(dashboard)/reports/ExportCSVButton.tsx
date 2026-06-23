"use client";

import { exportLeaksAsCSV } from "@/lib/export-csv";

interface Leak {
  type: string;
  title: string;
  description: string;
  estimated_savings: number;
  priority: string;
  vendor: string | null;
}

export default function ExportCSVButton({ leaks }: { leaks: Leak[] }) {
  return (
    <button
      onClick={() => exportLeaksAsCSV(leaks)}
      className="flex items-center gap-2 bg-white border border-[#1e3a5f] text-[#1e3a5f] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
    >
      Exporter CSV (fiduciaire)
    </button>
  );
}
