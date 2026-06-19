type LeakType =
  | "duplicate"
  | "unused_subscription"
  | "price_increase"
  | "progressive_increase"
  | "bank_fees"
  | "overlapping_services"
  | "annual_optimization"
  | "progressive_drift"
  | "currency_fees"
  | "ghost_reactivation"
  | "late_fees";

type Priority = "high" | "medium" | "low";

interface Leak {
  id: string;
  type: LeakType;
  title: string;
  description: string;
  amount: number;
  priority: Priority;
  vendor: string;
  detectedAt: string;
  actionItems?: string[];
  timeToFix?: string;
}

const TYPE_CONFIG: Record<LeakType, { icon: string; color: string; bg: string }> = {
  duplicate:            { icon: "🔁", color: "text-red-700",    bg: "bg-red-50"    },
  unused_subscription:  { icon: "💸", color: "text-orange-700", bg: "bg-orange-50" },
  price_increase:       { icon: "📈", color: "text-yellow-700", bg: "bg-yellow-50" },
  progressive_increase: { icon: "⚠️", color: "text-blue-700",   bg: "bg-blue-50"   },
  bank_fees:            { icon: "🏦", color: "text-blue-700",   bg: "bg-blue-50"   },
  overlapping_services: { icon: "🔀", color: "text-purple-700", bg: "bg-purple-50" },
  annual_optimization:  { icon: "📅", color: "text-teal-700",   bg: "bg-teal-50"   },
  progressive_drift:    { icon: "📉", color: "text-amber-700",  bg: "bg-amber-50"  },
  currency_fees:        { icon: "💱", color: "text-indigo-700", bg: "bg-indigo-50" },
  ghost_reactivation:   { icon: "👻", color: "text-rose-700",   bg: "bg-rose-50"   },
  late_fees:            { icon: "⏰", color: "text-red-700",    bg: "bg-red-50"    },
};

const PRIORITY_BADGE: Record<Priority, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-orange-100 text-orange-700",
  low:    "bg-gray-100 text-gray-600",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "Urgent", medium: "Moyen", low: "Faible",
};

export default function LeakCard({ leak }: { leak: Leak }) {
  const config = TYPE_CONFIG[leak.type] ?? TYPE_CONFIG.duplicate;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 text-xl`}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-gray-800 text-sm">{leak.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[leak.priority]}`}>
              {PRIORITY_LABEL[leak.priority]}
            </span>
            {leak.timeToFix && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                ⏱ {leak.timeToFix}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{leak.description}</p>
          <p className="text-xs text-gray-400 mt-1">Détecté le {new Date(leak.detectedAt).toLocaleDateString("fr-CH")}</p>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold text-green-600">+{Math.round(leak.amount)} CHF</div>
          <div className="text-xs text-gray-400">récupérables/mois</div>
        </div>
      </div>

      {/* Action items */}
      {leak.actionItems && leak.actionItems.length > 0 && (
        <div className="mt-4 ml-16 space-y-1.5">
          {leak.actionItems.map((action, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-green-500 text-xs mt-0.5 flex-shrink-0">→</span>
              <p className="text-xs text-gray-600">{action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
