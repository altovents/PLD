import { createClient } from "@/lib/supabase/server";
import { formatCHF, formatDate } from "@/lib/utils";
import AlertActions from "./AlertActions";
import LeakTransparencyPanel from "@/components/dashboard/LeakTransparencyPanel";
import RerunAnalysisButton from "./RerunAnalysisButton";

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  duplicate:             { label: "Double paiement",     icon: "🔁", color: "bg-red-50 text-red-700 border-red-100"       },
  unused_subscription:   { label: "Abonnement inutilisé",icon: "💸", color: "bg-orange-50 text-orange-700 border-orange-100" },
  price_increase:        { label: "Hausse soudaine",     icon: "📈", color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
  progressive_increase:  { label: "Hausse progressive",  icon: "⚠️", color: "bg-blue-50 text-blue-700 border-blue-100"     },
  bank_fees:             { label: "Frais bancaires",     icon: "🏦", color: "bg-blue-50 text-blue-700 border-blue-100"     },
  overlapping_services:  { label: "Services redondants", icon: "🔀", color: "bg-purple-50 text-purple-700 border-purple-100" },
  annual_optimization:   { label: "Optim. annuelle",     icon: "📅", color: "bg-teal-50 text-teal-700 border-teal-100"    },
  progressive_drift:     { label: "Dérive progressive",  icon: "📉", color: "bg-amber-50 text-amber-700 border-amber-100" },
  currency_fees:         { label: "Frais de change",     icon: "💱", color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  ghost_reactivation:    { label: "Réactivation fantôme",icon: "👻", color: "bg-rose-50 text-rose-700 border-rose-100"    },
  late_fees:             { label: "Frais de retard",     icon: "⏰", color: "bg-red-50 text-red-700 border-red-100"       },
};

const PRIORITY_BADGE: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-orange-100 text-orange-700",
  low:    "bg-gray-100 text-gray-600",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "Urgent", medium: "Moyen", low: "Faible",
};

export default async function AlertsPage() {
  const supabase = await createClient();

  const { data: leaks } = await supabase
    .from("leaks")
    .select("id, type, title, description, estimated_savings, priority, vendor, detected_at, status, detection_logic, comparison_basis, trigger_transaction_ids")
    .order("detected_at", { ascending: false })
    .limit(50);

  const open         = leaks?.filter((l) => l.status === "open")         ?? [];
  const acknowledged = leaks?.filter((l) => l.status === "acknowledged") ?? [];
  const resolved     = leaks?.filter((l) => l.status === "resolved" || l.status === "dismissed") ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Alertes</h1>
          <p className="text-gray-500 text-sm mt-1">Anomalies détectées sur vos dépenses</p>
        </div>
        <RerunAnalysisButton />
      </div>

      {/* Empty state */}
      {open.length === 0 && resolved.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Aucune alerte pour le moment</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Les alertes s&apos;activeront après l&apos;analyse de vos transactions.{" "}
            <a href="/dashboard" className="text-[#1e3a5f] font-semibold underline">
              Lancer une analyse →
            </a>
          </p>
        </div>
      )}

      {/* Open alerts */}
      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            En attente — {open.length}
          </h2>
          {open.map((leak) => {
            const t = TYPE_LABELS[leak.type] ?? TYPE_LABELS.duplicate;
            return (
              <div
                key={leak.id}
                className={`rounded-xl border p-4 flex items-start gap-4 ${t.color}`}
              >
                <span className="text-2xl mt-0.5">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{leak.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[leak.priority]}`}>
                      {PRIORITY_LABEL[leak.priority]}
                    </span>
                    <span className="text-xs opacity-60">{t.label}</span>
                  </div>
                  <p className="text-xs opacity-80">{leak.description}</p>
                  <p className="text-xs opacity-50 mt-1">
                    Détecté le {formatDate(leak.detected_at)}
                  </p>
                  <LeakTransparencyPanel
                    detection_logic={leak.detection_logic}
                    comparison_basis={leak.comparison_basis}
                    trigger_count={Array.isArray(leak.trigger_transaction_ids) ? leak.trigger_transaction_ids.length : 0}
                  />
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-base">
                    {formatCHF(leak.estimated_savings)}
                  </div>
                  <div className="text-xs opacity-60 mb-2">récupérables</div>
                  <AlertActions
                    id={leak.id}
                    vendor={leak.vendor}
                    title={leak.title}
                    estimated_savings={leak.estimated_savings}
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* In progress */}
      {acknowledged.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            En cours — {acknowledged.length}
          </h2>
          {acknowledged.map((leak) => {
            const t = TYPE_LABELS[leak.type] ?? TYPE_LABELS.duplicate;
            return (
              <div
                key={leak.id}
                className={`rounded-xl border p-4 flex items-start gap-4 opacity-80 ${t.color}`}
              >
                <span className="text-2xl mt-0.5">⏳</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{leak.title}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">En cours</span>
                  </div>
                  <p className="text-xs opacity-80">{leak.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-base">{new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF", minimumFractionDigits: 0 }).format(leak.estimated_savings)}</div>
                  <AlertActions id={leak.id} vendor={leak.vendor} title={leak.title} estimated_savings={leak.estimated_savings} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Resolved / dismissed */}
      {resolved.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Traitées — {resolved.length}
          </h2>
          {resolved.map((leak) => (
            <div
              key={leak.id}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-center gap-4 opacity-60"
            >
              <span className="text-xl">{leak.status === "resolved" ? "✓" : "—"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-600">{leak.title}</p>
                <p className="text-xs text-gray-400">
                  {leak.status === "resolved" ? "Résolu" : leak.status === "acknowledged" ? "En cours" : "Ignoré"} · {formatDate(leak.detected_at)}
                </p>
              </div>
              <span className="text-sm text-gray-500 font-medium">
                {formatCHF(leak.estimated_savings)}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
