"use client";

export default function PaywallOverlay({
  visibleCount,
  totalCount,
  feature,
}: {
  visibleCount: number;
  totalCount: number;
  feature: string;
}) {
  return (
    <div className="relative">
      {/* Blurred rows hint */}
      <div className="pointer-events-none select-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-14 bg-gray-50 border-b border-gray-100 opacity-40 blur-sm"
            style={{ filter: "blur(3px)" }}
          />
        ))}
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-b-2xl">
        <div className="text-center px-6 py-4 max-w-sm">
          <div className="text-3xl mb-2">🔒</div>
          <p className="font-semibold text-[#1e3a5f] text-base mb-1">
            {totalCount - visibleCount} {feature} masqué{totalCount - visibleCount > 1 ? "s" : ""}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Vous voyez {visibleCount} sur {totalCount}. Passez à un plan payant pour tout débloquer.
          </p>
          <a
            href="/checkout?plan=growth"
            className="inline-block bg-[#e85d04] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#c94d00] transition-colors"
          >
            Débloquer maintenant →
          </a>
        </div>
      </div>
    </div>
  );
}
