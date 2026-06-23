"use client";

import { useEffect } from "react";

export default function ReportsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-md w-full">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Une erreur s&apos;est produite
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Impossible de charger cette page. Réessayez ou revenez plus tard.
        </p>
        <button
          onClick={reset}
          className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#162c45] transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
