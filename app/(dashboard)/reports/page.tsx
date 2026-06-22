import { createClient } from "@/lib/supabase/server";
import { formatCHF } from "@/lib/utils";
import DownloadButton from "./DownloadButton";
import Link from "next/link";

const FREE_LEAK_LIMIT = 3;

const TYPE_LABELS: Record<string, string> = {
  duplicate:            "Double paiement",
  unused_subscription:  "Abonnement inutilisé",
  price_increase:       "Hausse soudaine",
  progressive_increase: "Hausse progressive",
  bank_fees:            "Frais bancaires",
  overlapping_services: "Services redondants",
  annual_optimization:  "Optimisation annuelle",
  progressive_drift:    "Dérive progressive",
  currency_fees:        "Frais de change",
  ghost_reactivation:   "Réactivation fantôme",
  late_fees:            "Frais de retard",
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: leaks }, { data: profile }] = await Promise.all([
    supabase
      .from("leaks")
      .select("id, type, title, estimated_savings, priority, vendor")
      .eq("status", "open")
      .order("estimated_savings", { ascending: false }),
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", user!.id)
      .single(),
  ]);

  const isPaid = profile?.plan && profile.plan !== "trial";

  const allLeaks = leaks ?? [];
  const hasLeaks = allLeaks.length > 0;
  const totalSavings = allLeaks.reduce((s, l) => s + (l.estimated_savings ?? 0), 0);
  const visibleLeaks = isPaid ? allLeaks : allLeaks.slice(0, FREE_LEAK_LIMIT);
  const hiddenCount = allLeaks.length - visibleLeaks.length;

  // Count by type (visible only for trial)
  const byType: Record<string, number> = {};
  for (const leak of visibleLeaks) {
    byType[leak.type] = (byType[leak.type] ?? 0) + 1;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Rapports PDF</h1>
          <p className="text-gray-500 text-sm mt-1">Exportez votre analyse financière</p>
        </div>
        {hasLeaks && isPaid && <DownloadButton />}
        {hasLeaks && !isPaid && (
          <Link
            href="/#pricing"
            className="flex items-center gap-2 bg-gray-200 text-gray-500 px-4 py-2 rounded-xl text-sm font-semibold"
            title="Disponible avec un abonnement payant"
          >
            🔒 Télécharger PDF — Plan payant
          </Link>
        )}
      </div>

      {!hasLeaks ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Aucun rapport disponible</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-4">
            Importez un relevé bancaire CSV et lancez une analyse pour générer votre premier rapport PDF.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-[#1e3a5f] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#162c45] transition-colors"
          >
            Aller au tableau de bord →
          </a>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Anomalies incluses</p>
              <p className="text-2xl font-bold text-[#1e3a5f]">
                {isPaid ? allLeaks.length : `${visibleLeaks.length} / ${allLeaks.length}`}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Économies potentielles</p>
              <p className="text-2xl font-bold text-green-600">{formatCHF(totalSavings)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">ROI estimé</p>
              <p className="text-2xl font-bold text-[#1e3a5f]">
                ×{(totalSavings / 299).toFixed(1)}
              </p>
            </div>
          </div>

          {/* Breakdown by type */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Contenu du rapport</h2>
            <div className="space-y-3">
              {Object.entries(byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">
                    {TYPE_LABELS[type] ?? type}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {count} anomalie{count > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
              {!isPaid && hiddenCount > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between py-3 px-4 bg-orange-50 rounded-xl border border-orange-100">
                    <span className="text-sm text-orange-700 font-medium">
                      🔒 {hiddenCount} anomalie{hiddenCount > 1 ? "s" : ""} masquée{hiddenCount > 1 ? "s" : ""}
                    </span>
                    <Link
                      href="/#pricing"
                      className="text-xs bg-[#e85d04] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#c94d00] transition-colors"
                    >
                      Débloquer →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* What's in the report */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <h3 className="font-semibold text-[#1e3a5f] mb-3">Le rapport inclut</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Résumé exécutif avec économies totales et ROI
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Détail de chaque anomalie avec description et montant récupérable
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Priorisation par niveau d&apos;urgence (Urgent / Moyen / Faible)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Recommandations actionnables
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
